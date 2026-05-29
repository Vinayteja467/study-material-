from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import StudyMaterialViewSet, AskAPIView, TeacherAnalyticsAPIView, StudentDashboardAPIView

router = DefaultRouter()
router.register('materials', StudyMaterialViewSet, basename='material')

urlpatterns = [
    path('', include(router.urls)),
    path('ask/', AskAPIView.as_view(), name='ai_ask'),
    path('analytics/teacher/', TeacherAnalyticsAPIView.as_view(), name='teacher_analytics'),
    path('student/dashboard/', StudentDashboardAPIView.as_view(), name='student_dashboard'),
]
