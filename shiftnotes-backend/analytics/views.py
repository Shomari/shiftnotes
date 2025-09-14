from django.http import JsonResponse
from django.db.models import Count, Avg, Q
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from assessments.models import Assessment
from users.models import User
from organizations.models import Program

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def program_performance_data(request):
    months = int(request.GET.get('months', 6))
    
    # Get the user's program
    if not request.user.program:
        return JsonResponse({'error': 'User is not assigned to a program'}, status=400)
    
    program = request.user.program
    
    # Calculate date range
    end_date = timezone.now()
    start_date = end_date - timedelta(days=months * 30)
    
    # Get assessments for this program in the timeframe
    assessments = Assessment.objects.filter(
        trainee__program=program,
        created_at__gte=start_date,
        created_at__lte=end_date
    )
    
    # Get active trainees (those with assessments in timeframe)
    active_trainees = User.objects.filter(
        role='trainee',
        program=program,
        assessments_received__created_at__gte=start_date
    ).distinct()
    
    # Calculate metrics
    total_assessments = assessments.count()
    active_trainee_count = active_trainees.count()
    total_trainees = User.objects.filter(role='trainee', program=program).count()
    avg_competency_level = assessments.aggregate(avg_score=Avg('assessment_epas__entrustment_level'))['avg_score'] or 0
    
    # Assessment distribution by entrustment level
    milestone_distribution = {}
    for level in range(1, 6):  # Entrustment levels are 1-5, not 1-6
        count = assessments.filter(assessment_epas__entrustment_level=level).count()
        milestone_distribution[f'level_{level}'] = count
    
    # Competency breakdown by core competencies
    from curriculum.models import CoreCompetency
    competency_breakdown = []
    core_competencies = CoreCompetency.objects.filter(program=program)
    
    for competency in core_competencies:
        # Get assessments for EPAs that belong to this competency's sub-competencies  
        competency_assessments = assessments.filter(
            assessment_epas__epa__sub_competencies__core_competency=competency
        ).distinct()
        
        total_assessments = competency_assessments.count()
        avg_level = competency_assessments.aggregate(
            avg_score=Avg('assessment_epas__entrustment_level')
        )['avg_score'] or 0
        
        competency_breakdown.append({
            'id': str(competency.id),
            'name': competency.title,  # Changed from .name to .title
            'total_assessments': total_assessments,
            'average_competency_level': round(avg_level, 2)
        })
    
    # Trainee breakdown
    trainee_breakdown = []
    for trainee in active_trainees:
        trainee_assessments = assessments.filter(trainee=trainee)
        trainee_count = trainee_assessments.count()
        trainee_avg = trainee_assessments.aggregate(
            avg_score=Avg('assessment_epas__entrustment_level')
        )['avg_score'] or 0
        
        last_assessment = trainee_assessments.order_by('-created_at').first()
        
        trainee_breakdown.append({
            'id': str(trainee.id),
            'name': trainee.name,
            'department': trainee.department or 'Not specified',
            'assessments_in_period': trainee_count,
            'total_assessments': trainee.assessments_received.count(),
            'average_competency_level': round(trainee_avg, 2),
            'is_active': trainee_count > 0,
            'last_assessment_date': last_assessment.created_at.isoformat() if last_assessment else None
        })
    
    # Monthly assessment trends
    monthly_data = []
    for i in range(months):
        month_start = end_date - timedelta(days=(i+1) * 30)
        month_end = end_date - timedelta(days=i * 30)
        month_assessments = assessments.filter(
            created_at__gte=month_start,
            created_at__lt=month_end
        ).count()
        monthly_data.append({
            'month': month_start.strftime('%b %Y'),
            'assessments': month_assessments
        })
    
    monthly_data.reverse()  # Show oldest to newest
    
    return JsonResponse({
        'program': {
            'id': program.id,
            'name': program.name,
            'abbreviation': program.abbreviation
        },
        'timeframe': {
            'months': months,
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat()
        },
        'metrics': {
            'total_trainees': total_trainees,
            'active_trainees': active_trainee_count,
            'assessments_in_period': total_assessments,
            'total_lifetime_assessments': total_assessments,  # Same as assessments_in_period for now
            'average_competency_level': round(avg_competency_level, 2),
            'milestone_distribution': milestone_distribution
        },
        'trainee_breakdown': trainee_breakdown,
        'competency_breakdown': competency_breakdown,
        'trends': {
            'monthly_assessments': monthly_data
        }
    })