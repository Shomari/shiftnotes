from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet, CohortViewSet
from organizations.views import OrganizationViewSet, ProgramViewSet, SiteViewSet
from curriculum.views import EPACategoryViewSet, EPAViewSet, CoreCompetencyViewSet, SubCompetencyViewSet, SubCompetencyEPAViewSet
from assessments.views import AssessmentViewSet

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
]
