from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterView, MeView, StudentsListView,
    MCQGenerateView, MCQSaveResultView, MCQHistoryView, FlashcardsGenerateView,
    AttendanceMarkView, AttendanceSummaryView, AttendanceClassView, AttendanceEditView,
    TeacherAnalyticsDashboardView, StudentAnalyticsDashboardView,
    AdminUsersView, AdminUserDetailView, AdminStatsView, AdminMaterialsView, AdminMaterialDetailView, AdminAnnounceView, AnnouncementListView,
    MockTestCreateView, MockTestListView, MockTestDetailView, MockTestAttemptView, MockTestResultsListView,
    SubjectListCreateView
)

urlpatterns = [
    # Auth Endpoints
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='auth_me'),
    path('students/', StudentsListView.as_view(), name='teacher_students_list'),

    # MCQ + Flashcards Endpoints
    path('generate/mcq/', MCQGenerateView.as_view(), name='generate_mcq'),
    path('generate/mcq/save/', MCQSaveResultView.as_view(), name='mcq_save_result'),
    path('generate/mcq/history/', MCQHistoryView.as_view(), name='mcq_history'),
    path('generate/flashcards/', FlashcardsGenerateView.as_view(), name='generate_flashcards'),

    # Attendance Tracker Endpoints
    path('attendance/mark/', AttendanceMarkView.as_view(), name='attendance_mark'),
    path('attendance/summary/<int:student_id>/', AttendanceSummaryView.as_view(), name='attendance_summary'),
    path('attendance/class/<int:subject_id>/', AttendanceClassView.as_view(), name='attendance_class'),
    path('attendance/edit/<int:id>/', AttendanceEditView.as_view(), name='attendance_edit'),

    # Analytics Dashboard Endpoints
    path('analytics/dashboard/', TeacherAnalyticsDashboardView.as_view(), name='teacher_analytics_dashboard'),
    path('analytics/student/', StudentAnalyticsDashboardView.as_view(), name='student_analytics_dashboard'),

    # Admin Panel Endpoints
    path('admin/users/', AdminUsersView.as_view(), name='admin_users'),
    path('admin/users/<int:id>/', AdminUserDetailView.as_view(), name='admin_user_detail'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin_stats'),
    path('admin/materials/', AdminMaterialsView.as_view(), name='admin_materials'),
    path('admin/materials/<int:id>/', AdminMaterialDetailView.as_view(), name='admin_material_detail'),
    path('admin/announce/', AdminAnnounceView.as_view(), name='admin_announce'),
    path('announcements/', AnnouncementListView.as_view(), name='announcements_list'),

    # Mock Test Endpoints
    path('tests/create/', MockTestCreateView.as_view(), name='mock_test_create'),
    path('tests/', MockTestListView.as_view(), name='mock_test_list'),
    path('tests/<int:id>/', MockTestDetailView.as_view(), name='mock_test_detail'),
    path('tests/<int:id>/attempt/', MockTestAttemptView.as_view(), name='mock_test_attempt'),
    path('tests/results/', MockTestResultsListView.as_view(), name='mock_test_results'),

    # Subject Endpoints
    path('subjects/', SubjectListCreateView.as_view(), name='subject_list_create'),
]
