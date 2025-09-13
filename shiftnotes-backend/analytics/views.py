"""
Analytics views for EPAnotes dashboards
Provides aggregated data for leadership and admin dashboards
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Q, Avg, Count
from datetime import datetime, timedelta
from collections import defaultdict

from users.models import User
from organizations.models import Program
from assessments.models import Assessment, AssessmentEPA


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def program_performance_data(request):
    """
    Get comprehensive program performance data
    
    Query Parameters:
    - program_id: Required - UUID of the program
    - months: Optional - Number of months to look back (default: 6)
    
    Returns:
    {
        "program": {...},
        "timeframe": {...},
        "metrics": {...},
        "trainee_breakdown": [...],
        "competency_distribution": [...],
        "recent_trends": {...}
    }
    """
    user = request.user
    
    # Check permissions
    if user.role not in ['admin', 'system-admin', 'leadership']:
        return Response(
            {'error': 'Insufficient permissions'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get parameters
    program_id = request.GET.get('program_id')
    if not program_id:
        return Response(
            {'error': 'program_id parameter is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        months = int(request.GET.get('months', 6))
    except (ValueError, TypeError):
        months = 6
    
    # Get the program
    try:
        program = Program.objects.get(id=program_id)
        
        # Check if user has access to this program's organization
        if user.role in ['admin', 'leadership'] and user.organization != program.org:
            return Response(
                {'error': 'Access denied to this program'}, 
                status=status.HTTP_403_FORBIDDEN
            )
            
    except Program.DoesNotExist:
        return Response(
            {'error': 'Program not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Calculate date range
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=months * 30)  # Approximate months
    
    # Get all trainees in this program
    trainees = User.objects.filter(
        role='trainee',
        organization=program.org,
        programs=program
    )
    
    # Get all assessments for these trainees in the timeframe
    assessments = Assessment.objects.filter(
        trainee__in=trainees,
        shift_date__gte=start_date,
        shift_date__lte=end_date
    ).select_related('trainee', 'evaluator').prefetch_related('assessment_epas')
    
    # Get all assessments for these trainees (for lifetime stats)
    all_assessments = Assessment.objects.filter(
        trainee__in=trainees
    ).select_related('trainee', 'evaluator').prefetch_related('assessment_epas')
    
    # Calculate metrics
    total_trainees = trainees.count()
    total_assessments = assessments.count()
    total_lifetime_assessments = all_assessments.count()
    
    # Calculate competency levels
    competency_levels = []
    competency_sum = 0
    competency_count = 0
    level_distribution = defaultdict(int)
    
    for assessment in assessments:
        for epa_assessment in assessment.assessment_epas.all():
            level = epa_assessment.entrustment_level
            competency_levels.append(level)
            competency_sum += level
            competency_count += 1
            level_distribution[level] += 1
    
    avg_competency_level = competency_sum / competency_count if competency_count > 0 else 0
    
    # Calculate active trainees (those with assessments in timeframe)
    active_trainee_ids = set(assessments.values_list('trainee_id', flat=True))
    active_trainees_count = len(active_trainee_ids)
    
    # Trainee breakdown
    trainee_breakdown = []
    for trainee in trainees:
        trainee_assessments = assessments.filter(trainee=trainee)
        trainee_all_assessments = all_assessments.filter(trainee=trainee)
        
        # Calculate trainee's average competency
        trainee_levels = []
        for assessment in trainee_all_assessments:
            for epa_assessment in assessment.assessment_epas.all():
                trainee_levels.append(epa_assessment.entrustment_level)
        
        trainee_avg = sum(trainee_levels) / len(trainee_levels) if trainee_levels else 0
        
        trainee_breakdown.append({
            'id': str(trainee.id),
            'name': trainee.name,
            'department': trainee.department,
            'assessments_in_period': trainee_assessments.count(),
            'total_assessments': trainee_all_assessments.count(),
            'average_competency_level': round(trainee_avg, 2),
            'is_active': trainee.id in active_trainee_ids,
            'last_assessment_date': trainee_assessments.order_by('-shift_date').first().shift_date.isoformat() if trainee_assessments.exists() else None
        })
    
    # Competency distribution
    total_ratings = sum(level_distribution.values())
    competency_distribution = []
    for level in sorted(level_distribution.keys()):
        count = level_distribution[level]
        percentage = (count / total_ratings * 100) if total_ratings > 0 else 0
        competency_distribution.append({
            'level': level,
            'count': count,
            'percentage': round(percentage, 1)
        })
    
    # Recent trends (monthly breakdown)
    monthly_data = defaultdict(lambda: {'assessments': 0, 'avg_level': 0, 'levels': []})
    for assessment in assessments:
        month_key = assessment.shift_date.strftime('%Y-%m')
        monthly_data[month_key]['assessments'] += 1
        
        for epa_assessment in assessment.assessment_epas.all():
            monthly_data[month_key]['levels'].append(epa_assessment.entrustment_level)
    
    # Calculate monthly averages
    recent_trends = []
    for month_key in sorted(monthly_data.keys()):
        data = monthly_data[month_key]
        avg_level = sum(data['levels']) / len(data['levels']) if data['levels'] else 0
        recent_trends.append({
            'month': month_key,
            'assessments': data['assessments'],
            'average_level': round(avg_level, 2)
        })
    
    # Prepare response
    response_data = {
        'program': {
            'id': str(program.id),
            'name': program.name,
            'abbreviation': program.abbreviation,
            'specialty': program.specialty
        },
        'timeframe': {
            'months': months,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        },
        'metrics': {
            'total_trainees': total_trainees,
            'active_trainees': active_trainees_count,
            'assessments_in_period': total_assessments,
            'total_lifetime_assessments': total_lifetime_assessments,
            'average_competency_level': round(avg_competency_level, 2),
            'completion_rate': round((active_trainees_count / total_trainees * 100) if total_trainees > 0 else 0, 1)
        },
        'trainee_breakdown': trainee_breakdown,
        'competency_distribution': competency_distribution,
        'recent_trends': recent_trends
    }
    
    return Response(response_data)
