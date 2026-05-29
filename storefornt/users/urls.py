from django.contrib.auth.views import LogoutView
from . import views
from django.urls import path, include
from django.contrib.staticfiles.urls import staticfiles_urlpatterns
from django.contrib.auth import views as auth_views

from django.conf import settings
from django.conf.urls.static import static

from django.urls import path, re_path
from .models import PDF  # Correct import of the PDF model

from .views import student_dashboard







urlpatterns = [
    # ... other URL patterns
    path('login/', include('users.urls')),
]

urlpatterns += staticfiles_urlpatterns()

urlpatterns = [
    path('', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('dashboard/logout/', views.logout_view, name='logout'),
    path('student-dashboard/', views.student_dashboard, name='student_dashboard'),
    path('login/', views.login_view, name='handlelogin'),       
    path('student/dashboard/', views.student_dashboard, name='student_dashboard'),
    path('view_pdf/<int:pdf_id>/', views.view_pdf, name='view_pdf'),
    path('uploaded-pdfs/', views.uploaded_pdfs, name='uploaded'),
    path('process_pdf/', views.process_pdf, name='process_pdf'),
    path('search_question/', views.search_question, name='search_question'),



]
    
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)