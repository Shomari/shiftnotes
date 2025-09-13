from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet, CohortViewSet
from users.password_reset_views import request_password_reset, verify_reset_token, reset_password, resend_welcome_email
from organizations.views import OrganizationViewSet, ProgramViewSet, SiteViewSet
from curriculum.views import EPACategoryViewSet, EPAViewSet, CoreCompetencyViewSet, SubCompetencyViewSet, SubCompetencyEPAViewSet
from assessments.views import AssessmentViewSet
from analytics.views import program_performance_data

router = DefaultRouter()

# User management
router.register(r'users', UserViewSet)
router.register(r'cohorts', CohortViewSet)

# Organizations
router.register(r'organizations', OrganizationViewSet)
router.register(r'programs', ProgramViewSet)
router.register(r'sites', SiteViewSet)

# Curriculum
router.register(r'epa-categories', EPACategoryViewSet)
router.register(r'epas', EPAViewSet)
router.register(r'core-competencies', CoreCompetencyViewSet)
router.register(r'sub-competencies', SubCompetencyViewSet)
router.register(r'sub-competency-epas', SubCompetencyEPAViewSet)

# Assessments
router.register(r'assessments', AssessmentViewSet)

urlpatterns = [
    path('', include(router.urls)),
    # Password reset endpoints
    path('auth/request-password-reset/', request_password_reset, name='request_password_reset'),
    path('auth/verify-reset-token/<str:uidb64>/<str:token>/', verify_reset_token, name='verify_reset_token'),
    path('auth/reset-password/<str:uidb64>/<str:token>/', reset_password, name='reset_password'),
    path('auth/resend-welcome-email/', resend_welcome_email, name='resend_welcome_email'),
    # Analytics endpoints
    path('analytics/program-performance/', program_performance_data, name='program_performance_data'),
]
