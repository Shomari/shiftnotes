from django.http import JsonResponse
from django.db.models import Count, Avg, Q, Max, Min, F, ExpressionWrapper, DurationField
from django.utils import timezone
from django.core.exceptions import ValidationError
from datetime import timedelta, datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from assessments.models import Assessment
from users.models import User, Cohort
from organizations.models import Program
from curriculum.models import CoreCompetency, SubCompetency, EPA
import calendar

def get_cohort_breakdown(program, assessments, cohort_id=None):
    """Calculate average entrustment level by cohort for the given program and assessments"""
    # Get cohorts for this program - filter by specific cohort if provided
    cohorts = Cohort.objects.filter(program=program).order_by('-start_date')
    if cohort_id:
        cohorts = cohorts.filter(id=cohort_id)
    
    cohort_breakdown = []
    for cohort in cohorts:
        # Get assessments for trainees in this cohort
        cohort_assessments = assessments.filter(trainee__cohort=cohort)
        
        # Calculate average entrustment level for this cohort
        avg_entrustment = cohort_assessments.aggregate(
            avg_entrustment=Avg('assessment_epas__entrustment_level')
        )['avg_entrustment']
        
        # Count trainees in this cohort
        trainee_count = User.objects.filter(
            role='trainee',
            cohort=cohort,
            program=program
        ).count()
        
        # Count assessments for this cohort
        assessment_count = cohort_assessments.count()
        
        cohort_breakdown.append({
            'id': str(cohort.id),
            'name': cohort.name,
            'start_date': cohort.start_date.isoformat(),
            'trainee_count': trainee_count,
            'assessment_count': assessment_count,
            'average_entrustment_level': round(avg_entrustment, 2) if avg_entrustment else None
        })
    
    return cohort_breakdown

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def program_performance_data(request):
    months = int(request.GET.get('months', 6))
    cohort_id = request.GET.get('cohort')
    trainee_id = request.GET.get('trainee')
    
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
        shift_date__gte=start_date.date(),
        shift_date__lte=end_date.date()
    )
    
    # Apply cohort filter if provided
    if cohort_id:
        try:
            cohort = Cohort.objects.get(id=cohort_id, program=program)
            assessments = assessments.filter(trainee__cohort=cohort)
        except Cohort.DoesNotExist:
            return JsonResponse({'error': 'Cohort not found'}, status=404)
    
    # Apply trainee filter if provided
    if trainee_id:
        try:
            trainee = User.objects.get(id=trainee_id, program=program, role='trainee')
            assessments = assessments.filter(trainee=trainee)
        except User.DoesNotExist:
            return JsonResponse({'error': 'Trainee not found'}, status=404)
    
    # Get active trainees (those with assessments in timeframe) - filtered by cohort/trainee if provided
    active_trainees_query = User.objects.filter(
        role='trainee',
        program=program,
        assessments_received__shift_date__gte=start_date.date()
    )
    
    # Apply same filters to trainee query
    if cohort_id:
        active_trainees_query = active_trainees_query.filter(cohort_id=cohort_id)
    if trainee_id:
        active_trainees_query = active_trainees_query.filter(id=trainee_id)
    
    active_trainees = active_trainees_query.distinct()
    
    # Calculate metrics
    total_assessments = assessments.count()
    active_trainee_count = active_trainees.count()
    
    # Calculate total trainees respecting filters
    total_trainees_query = User.objects.filter(role='trainee', program=program)
    if cohort_id:
        total_trainees_query = total_trainees_query.filter(cohort_id=cohort_id)
    if trainee_id:
        total_trainees_query = total_trainees_query.filter(id=trainee_id)
    total_trainees = total_trainees_query.count()
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
    monthly_entrustment_data = []
    for i in range(months):
        month_start = end_date - timedelta(days=(i+1) * 30)
        month_end = end_date - timedelta(days=i * 30)
        month_assessments_queryset = assessments.filter(
            shift_date__gte=month_start.date(),
            shift_date__lt=month_end.date()
        )
        month_assessments_count = month_assessments_queryset.count()
        
        # Calculate average entrustment level for this month
        month_avg_entrustment = month_assessments_queryset.aggregate(
            avg_entrustment=Avg('assessment_epas__entrustment_level')
        )['avg_entrustment'] or 0
        
        monthly_data.append({
            'month': month_start.strftime('%b %Y'),
            'assessments': month_assessments_count
        })
        
        monthly_entrustment_data.append({
            'month': month_start.strftime('%b %Y'),
            'average_entrustment': round(month_avg_entrustment, 2)
        })
    
    monthly_data.reverse()  # Show oldest to newest
    monthly_entrustment_data.reverse()  # Show oldest to newest
    
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
        'cohort_breakdown': get_cohort_breakdown(program, assessments, cohort_id),
        'trends': {
            'monthly_assessments': monthly_data,
            'monthly_entrustment': monthly_entrustment_data
        }
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def faculty_dashboard_data(request):
    """
    Faculty Dashboard endpoint that provides assessment volume statistics by faculty member
    """
    # Get the user's program
    if not request.user.program:
        return JsonResponse({'error': 'User is not assigned to a program'}, status=400)
    
    program = request.user.program
    
    # Parse filters
    faculty_filter = request.GET.get('faculty')  # For exact ID filtering (legacy)
    faculty_search = request.GET.get('search')   # For name-based search
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    
    # Set default date range (last 6 months)
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=180)
    
    # Parse custom date range if provided
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({'error': 'Invalid start_date format. Use YYYY-MM-DD'}, status=400)
    
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return JsonResponse({'error': 'Invalid end_date format. Use YYYY-MM-DD'}, status=400)
    
    # Build faculty queryset with proper ordering
    faculty_queryset = User.objects.filter(
        program=program,
        role__in=['faculty', 'leadership'],
        deactivated_at__isnull=True
    ).order_by('name')  # Alphabetical order by full name (which includes last name)
    
    # Apply faculty filter if specified (legacy exact ID match)
    if faculty_filter:
        faculty_queryset = faculty_queryset.filter(id=faculty_filter)
    
    # Apply name-based search if specified
    if faculty_search:
        # Search by first name OR last name (case-insensitive)
        faculty_queryset = faculty_queryset.filter(
            Q(name__icontains=faculty_search)
        )
    
    # Build assessment queryset for the date range
    assessment_queryset = Assessment.objects.filter(
        evaluator__program=program,
        shift_date__gte=start_date,
        shift_date__lte=end_date
    )
    
    faculty_stats = []
    
    for faculty in faculty_queryset:
        # Get assessments created by this faculty member
        faculty_assessments = assessment_queryset.filter(evaluator=faculty)
        
        total_assessments = faculty_assessments.count()
        
        # Calculate average assessments per month
        days_in_range = (end_date - start_date).days + 1
        months_in_range = max(days_in_range / 30.44, 1)  # Average days per month
        avg_assessments_per_month = total_assessments / months_in_range
        
        # Get first and last assessment dates
        assessment_dates = faculty_assessments.aggregate(
            first_date=Min('shift_date'),
            last_date=Max('shift_date')
        )
        first_assessment = assessment_dates['first_date']
        last_assessment = assessment_dates['last_date']
        
        # Calculate active months
        active_months = 0
        if first_assessment and last_assessment:
            days_active = (last_assessment - first_assessment).days
            active_months = max(1, days_active // 30)
        
        # Calculate average turnaround time (shift date to creation date)
        avg_turnaround_days = 0
        if total_assessments > 0:
            turnaround_data = faculty_assessments.annotate(
                turnaround_days=ExpressionWrapper(
                    F('created_at__date') - F('shift_date'),
                    output_field=DurationField()
                )
            ).aggregate(
                avg_turnaround=Avg('turnaround_days')
            )
            if turnaround_data['avg_turnaround']:
                avg_turnaround_days = turnaround_data['avg_turnaround'].days
        
        # Calculate average entrustment level
        avg_entrustment_level = faculty_assessments.aggregate(
            avg_entrustment=Avg('assessment_epas__entrustment_level')
        )['avg_entrustment'] or 0
        
        # Calculate monthly breakdown
        monthly_breakdown = []
        
        # Get the range of months to analyze (last 6 months)
        current_date = end_date
        for i in range(6):
            # Calculate month start and end
            month_start = current_date.replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1) - timedelta(days=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1) - timedelta(days=1)
            
            # Don't go before our start_date
            month_start = max(month_start, start_date)
            month_end = min(month_end, end_date)
            
            # Only process if the month is within our date range
            if month_start <= end_date:
                # Get assessments in this month
                month_assessments_queryset = faculty_assessments.filter(
                    shift_date__gte=month_start,
                    shift_date__lte=month_end
                )
                month_assessments_count = month_assessments_queryset.count()
                
                # Calculate average entrustment for this month
                month_avg_entrustment = month_assessments_queryset.aggregate(
                    avg_entrustment=Avg('assessment_epas__entrustment_level')
                )['avg_entrustment']
                
                # Format month label (e.g., "Jan", "Feb")
                month_label = month_start.strftime('%b')
                
                monthly_breakdown.insert(0, {  # Insert at beginning to maintain chronological order
                    'month': month_label,
                    'assessment_count': month_assessments_count,
                    'avg_entrustment': round(month_avg_entrustment, 2) if month_avg_entrustment else None,
                })
            
            # Move to previous month
            if current_date.month == 1:
                current_date = current_date.replace(year=current_date.year - 1, month=12, day=1)
            else:
                current_date = current_date.replace(month=current_date.month - 1, day=1)
        
        faculty_stats.append({
            'faculty_id': str(faculty.id),
            'faculty_name': faculty.name,
            'total_assessments': total_assessments,
            'avg_assessments_per_month': round(avg_assessments_per_month, 2),
            'avg_turnaround_days': round(avg_turnaround_days, 1),
            'avg_entrustment_level': round(avg_entrustment_level, 2) if avg_entrustment_level else 0,
            'first_assessment_date': first_assessment.isoformat() if first_assessment else None,
            'last_assessment_date': last_assessment.isoformat() if last_assessment else None,
            'active_months': active_months,
            'monthly_breakdown': monthly_breakdown,
        })
    
    # Sort by total assessments (descending)
    faculty_stats.sort(key=lambda x: x['total_assessments'], reverse=True)
    
    # Calculate totals
    total_faculty = len(faculty_stats)
    total_assessments = sum(f['total_assessments'] for f in faculty_stats)
    
    return JsonResponse({
        'faculty_stats': faculty_stats,
        'date_range': {
            'start_date': start_date.isoformat(),
            'end_date': end_date.isoformat(),
        },
        'total_faculty': total_faculty,
        'total_assessments': total_assessments,
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def competency_progress_data(request):
    """Get competency progress data for the current trainee"""
    user = request.user
    
    # Only trainees can access their own competency progress
    if user.role != 'trainee':
        return JsonResponse({'error': 'Only trainees can access competency progress'}, status=403)
    
    if not user.program:
        return JsonResponse({'error': 'User is not assigned to a program'}, status=400)
    
    # Get all assessments for this trainee
    trainee_assessments = Assessment.objects.filter(
        trainee=user,
        status='submitted'
    ).select_related('trainee', 'evaluator').prefetch_related('assessment_epas__epa__sub_competencies')
    
    # Get all competencies for this program
    competencies = CoreCompetency.objects.filter(program=user.program).prefetch_related('sub_competencies')
    
    competency_data = []
    overall_avg = 0
    total_assessments = 0
    
    for competency in competencies:
        subcompetency_data = []
        competency_total = 0
        competency_count = 0
        
        for subcompetency in competency.sub_competencies.all():
            # Get EPAs that map to this subcompetency
            epas_for_subcompetency = EPA.objects.filter(
                sub_competencies=subcompetency,
                program=user.program
            )
            
            # Get assessments for EPAs that map to this subcompetency
            subcompetency_assessments = trainee_assessments.filter(
                assessment_epas__epa__in=epas_for_subcompetency
            )
            
            # Calculate average entrustment level for this subcompetency
            avg_entrustment = subcompetency_assessments.aggregate(
                avg=Avg('assessment_epas__entrustment_level')
            )['avg']
            
            assessment_count = subcompetency_assessments.count()
            
            subcompetency_info = {
                'id': str(subcompetency.id),
                'title': subcompetency.title,
                'avg_entrustment_level': round(avg_entrustment, 2) if avg_entrustment else None,
                'assessment_count': assessment_count,
                'epas_count': epas_for_subcompetency.count(),
            }
            
            subcompetency_data.append(subcompetency_info)
            
            if avg_entrustment:
                competency_total += avg_entrustment
                competency_count += 1
        
        # Calculate competency average
        competency_avg = competency_total / competency_count if competency_count > 0 else None
        
        competency_info = {
            'id': str(competency.id),
            'title': competency.title,
            'avg_entrustment_level': round(competency_avg, 2) if competency_avg else None,
            'subcompetencies': subcompetency_data,
            'total_assessments': sum(sub['assessment_count'] for sub in subcompetency_data),
        }
        
        competency_data.append(competency_info)
        
        if competency_avg:
            overall_avg += competency_avg
            total_assessments += competency_info['total_assessments']
    
    # Calculate overall average
    competencies_with_data = [c for c in competency_data if c['avg_entrustment_level'] is not None]
    overall_average = overall_avg / len(competencies_with_data) if competencies_with_data else None
    
    # Get recent assessment trend (last 3 months)
    three_months_ago = timezone.now() - timedelta(days=90)
    recent_assessments = trainee_assessments.filter(shift_date__gte=three_months_ago.date())
    recent_avg = recent_assessments.aggregate(
        avg=Avg('assessment_epas__entrustment_level')
    )['avg']
    
    return JsonResponse({
        'trainee': {
            'id': str(user.id),
            'name': user.name,
            'program': user.program.name if user.program else None,
        },
        'competencies': competency_data,
        'summary': {
            'overall_avg_entrustment': round(overall_average, 2) if overall_average else None,
            'total_assessments': total_assessments,
            'competencies_assessed': len(competencies_with_data),
            'total_competencies': len(competency_data),
            'recent_avg_entrustment': round(recent_avg, 2) if recent_avg else None,
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def competency_grid_data(request):
    """Get competency grid data for a specific trainee with all calculations done on backend"""
    trainee_id = request.GET.get('trainee_id')
    start_date_str = request.GET.get('start_date')
    end_date_str = request.GET.get('end_date')
    
    if not trainee_id:
        return JsonResponse({'error': 'trainee_id parameter is required'}, status=400)
    
    # Get the trainee
    try:
        trainee = User.objects.get(id=trainee_id, role='trainee')
    except User.DoesNotExist:
        return JsonResponse({'error': 'Trainee not found'}, status=404)
    
    # Security: ensure user can access this trainee's data
    if request.user.organization != trainee.organization:
        return JsonResponse({'error': 'Access denied'}, status=403)
    
    # Parse date filters
    assessments_filter = Q(trainee=trainee, status='submitted')
    
    if start_date_str:
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            assessments_filter &= Q(shift_date__gte=start_date)
        except ValueError:
            return JsonResponse({'error': 'Invalid start_date format. Use YYYY-MM-DD'}, status=400)
    
    if end_date_str:
        try:
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            assessments_filter &= Q(shift_date__lte=end_date)
        except ValueError:
            return JsonResponse({'error': 'Invalid end_date format. Use YYYY-MM-DD'}, status=400)
    
    # Get all assessments for this trainee (with date filtering if provided)
    trainee_assessments = Assessment.objects.filter(assessments_filter)
    
    # Get all competencies for this program
    if not trainee.program:
        return JsonResponse({'error': 'Trainee is not assigned to a program'}, status=400)
    
    competencies = CoreCompetency.objects.filter(program=trainee.program).prefetch_related(
        'sub_competencies__sub_competency_epas__epa'
    ).order_by('code')
    
    grid_data = []
    
    for competency in competencies:
        subcompetency_data = []
        
        for subcompetency in competency.sub_competencies.all().order_by('code'):
            # Get all EPAs mapped to this sub-competency
            mapped_epas = EPA.objects.filter(
                sub_competency_epas__sub_competency=subcompetency,
                program=trainee.program
            ).distinct()
            
            # Get assessments for EPAs mapped to this sub-competency
            subcompetency_assessments = trainee_assessments.filter(
                assessment_epas__epa__in=mapped_epas
            ).distinct()
            
            # Calculate average entrustment level
            avg_entrustment = subcompetency_assessments.aggregate(
                avg=Avg('assessment_epas__entrustment_level')
            )['avg']
            
            # Count total assessment EPAs (not just assessments, since one assessment can have multiple EPAs)
            total_epa_assessments = trainee_assessments.filter(
                assessment_epas__epa__in=mapped_epas
            ).aggregate(
                count=Count('assessment_epas__id')
            )['count'] or 0
            
            # Round up to nearest 0.5 for milestone level (matching frontend logic)
            milestone_level = None
            if avg_entrustment:
                milestone_level = min(5.0, max(1.0, round(avg_entrustment * 2) / 2))
            
            subcompetency_data.append({
                'id': str(subcompetency.id),
                'code': subcompetency.code,
                'title': subcompetency.title,
                'core_competency_code': competency.code,
                'average_entrustment': round(avg_entrustment, 2) if avg_entrustment else None,
                'milestone_level': milestone_level,
                'total_assessments': total_epa_assessments,
                'mapped_epas_count': mapped_epas.count(),
                'has_data': avg_entrustment is not None
            })
        
        grid_data.append({
            'id': str(competency.id),
            'code': competency.code,
            'title': competency.title,
            'sub_competencies': subcompetency_data
        })
    
    # Calculate summary statistics
    all_subcompetencies = [sub for comp in grid_data for sub in comp['sub_competencies']]
    subcompetencies_with_data = [sub for sub in all_subcompetencies if sub['has_data']]
    
    overall_avg = None
    if subcompetencies_with_data:
        total_avg = sum(sub['average_entrustment'] for sub in subcompetencies_with_data)
        overall_avg = round(total_avg / len(subcompetencies_with_data), 2)
    
    return JsonResponse({
        'trainee': {
            'id': str(trainee.id),
            'name': trainee.name,
            'program_name': trainee.program.name,
            'program_abbreviation': trainee.program.abbreviation,
            'cohort_name': trainee.cohort.name if trainee.cohort else None,
        },
        'competencies': grid_data,
        'summary': {
            'total_subcompetencies': len(all_subcompetencies),
            'subcompetencies_with_data': len(subcompetencies_with_data),
            'coverage_percentage': round((len(subcompetencies_with_data) / len(all_subcompetencies)) * 100, 1) if all_subcompetencies else 0,
            'overall_average_entrustment': overall_avg,
            'total_assessments': trainee_assessments.count(),
            'date_range': {
                'start_date': start_date_str,
                'end_date': end_date_str
            }
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def trainee_performance_data(request):
    """Get trainee performance data with filtering and sorting capabilities"""
    
    # Get the user's program
    if not request.user.program:
        return JsonResponse({'error': 'User is not assigned to a program'}, status=400)
    
    program = request.user.program
    
    # Parse filters
    cohort_id = request.GET.get('cohort')
    months = int(request.GET.get('months', 6))  # Default to 6 months
    sort_by = request.GET.get('sort_by', 'name')  # Default sort by name
    sort_order = request.GET.get('sort_order', 'asc')  # asc or desc
    
    # Calculate date range for the specified months
    end_date = timezone.now()
    start_date = end_date - timedelta(days=months * 30)
    
    # Filter assessments by date range
    assessments_filter = Q(
        trainee__program=program, 
        status='submitted',
        shift_date__gte=start_date.date(),
        shift_date__lte=end_date.date()
    )
    
    # Get trainees query
    trainees_query = User.objects.filter(
        role='trainee',
        program=program,
        deactivated_at__isnull=True  # Only active trainees
    )
    
    # Apply cohort filter if provided
    if cohort_id:
        try:
            cohort = Cohort.objects.get(id=cohort_id, program=program)
            trainees_query = trainees_query.filter(cohort=cohort)
        except Cohort.DoesNotExist:
            return JsonResponse({'error': 'Cohort not found'}, status=404)
    
    # Get trainee performance data
    trainee_performance = []
    
    for trainee in trainees_query:
        # Get assessments for this trainee with date filtering
        trainee_assessments = Assessment.objects.filter(
            assessments_filter & Q(trainee=trainee)
        )
        
        # Calculate metrics
        total_assessments = trainee_assessments.count()
        avg_entrustment = trainee_assessments.aggregate(
            avg=Avg('assessment_epas__entrustment_level')
        )['avg']
        
        # Get latest assessment date
        latest_assessment = trainee_assessments.order_by('-created_at').first()
        
        # Get all-time assessment count (not filtered by date)
        lifetime_assessments = Assessment.objects.filter(
            trainee=trainee,
            status='submitted'
        ).count()
        
        trainee_performance.append({
            'id': str(trainee.id),
            'name': trainee.name,
            'cohort_id': str(trainee.cohort.id) if trainee.cohort else None,
            'cohort_name': trainee.cohort.name if trainee.cohort else 'No Cohort',
            'total_assessments': total_assessments,
            'lifetime_assessments': lifetime_assessments,
            'avg_entrustment_level': round(avg_entrustment, 2) if avg_entrustment else None,
            'latest_assessment_date': latest_assessment.created_at.isoformat() if latest_assessment else None,
            'has_assessments': total_assessments > 0
        })
    
    # Apply sorting
    reverse_sort = sort_order == 'desc'
    
    if sort_by == 'name':
        # Sort by last name
        trainee_performance.sort(
            key=lambda x: x['name'].split()[-1].lower(),
            reverse=reverse_sort
        )
    elif sort_by == 'assessments':
        trainee_performance.sort(
            key=lambda x: x['total_assessments'],
            reverse=reverse_sort
        )
    elif sort_by == 'avg_level':
        # Sort by avg level, putting None values at the end
        trainee_performance.sort(
            key=lambda x: (x['avg_entrustment_level'] is None, x['avg_entrustment_level'] or 0),
            reverse=reverse_sort
        )
    elif sort_by == 'cohort':
        trainee_performance.sort(
            key=lambda x: x['cohort_name'],
            reverse=reverse_sort
        )
    elif sort_by == 'latest_assessment':
        # Sort by latest assessment date, putting None values at the end
        trainee_performance.sort(
            key=lambda x: (x['latest_assessment_date'] is None, x['latest_assessment_date'] or ''),
            reverse=reverse_sort
        )
    
    # Get cohorts for filter dropdown
    cohorts = Cohort.objects.filter(program=program).order_by('-start_date')
    cohort_options = [
        {
            'id': str(cohort.id),
            'name': cohort.name,
            'trainee_count': User.objects.filter(role='trainee', cohort=cohort).count()
        }
        for cohort in cohorts
    ]
    
    return JsonResponse({
        'trainees': trainee_performance,
        'cohorts': cohort_options,
        'summary': {
            'total_trainees': len(trainee_performance),
            'trainees_with_assessments': len([t for t in trainee_performance if t['has_assessments']]),
            'total_assessments': sum(t['total_assessments'] for t in trainee_performance),
            'average_assessments_per_trainee': round(
                sum(t['total_assessments'] for t in trainee_performance) / len(trainee_performance), 1
            ) if trainee_performance else 0,
            'overall_avg_entrustment': round(
                sum(t['avg_entrustment_level'] for t in trainee_performance if t['avg_entrustment_level']) / 
                len([t for t in trainee_performance if t['avg_entrustment_level']]), 2
            ) if [t for t in trainee_performance if t['avg_entrustment_level']] else None
        },
        'filters': {
            'cohort': cohort_id,
            'months': months,
            'sort_by': sort_by,
            'sort_order': sort_order
        },
        'timeframe': {
            'months': months,
            'start_date': start_date.date().isoformat(),
            'end_date': end_date.date().isoformat()
        }
    })