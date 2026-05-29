import os
from datetime import datetime, timedelta
from django.db.models import Sum, Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from pypdf import PdfReader

from .models import StudyMaterial, QueryLog
from .serializers import StudyMaterialSerializer, ChatRequestSerializer, ChatResponseSerializer
from users.permissions import IsTeacher, IsStudent
from django.contrib.auth import get_user_model

User = get_user_model()

class StudyMaterialViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    serializer_class = StudyMaterialSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'Teacher':
            # Teachers see all their uploads
            return StudyMaterial.objects.filter(uploaded_by=user).order_by('-upload_date')
        else:
            # Students see all materials from teachers
            return StudyMaterial.objects.filter(uploaded_by__role='Teacher').order_by('-upload_date')

    def perform_create(self, serializer):
        # Save file size and page count
        file_obj = self.request.data.get('file')
        file_size = file_obj.size
        
        # Save placeholder page count first
        page_count = 0
        
        # Save material instance to get correct path
        material = serializer.save(
            uploaded_by=self.request.user,
            file_size=file_size,
            page_count=page_count
        )
        
        # Read actual page count using PyPDF
        try:
            pdf_path = material.file.path
            reader = PdfReader(pdf_path)
            material.page_count = len(reader.pages)
            material.save()
        except Exception as e:
            print(f"Error reading PDF page count: {e}")
            material.page_count = 1  # Fallback
            material.save()

class AskAPIView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = ChatRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        pdf_id = serializer.validated_data['pdf_id']
        question = serializer.validated_data['question']

        material = get_object_or_404(StudyMaterial, id=pdf_id)
        pdf_path = material.file.path

        from .utils import answer_question
        try:
            answer = answer_question(pdf_path, question)
            
            # Increment query count
            material.query_count += 1
            material.save()

            # Log the query
            QueryLog.objects.create(
                material=material,
                user=request.user,
                question=question,
                answer=answer
            )

            response_serializer = ChatResponseSerializer(data={
                "answer": answer,
                "sources": [material.title]
            })
            response_serializer.is_valid()
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TeacherAnalyticsAPIView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    def get(self, request):
        teacher = request.user
        
        # 1. Total unique students in the platform
        total_students = User.objects.filter(role='Student').count()
        if total_students == 0:
            total_students = 1  # Avoid division by zero in engagement
            
        # 2. Total materials uploaded by this teacher
        total_materials = StudyMaterial.objects.filter(uploaded_by=teacher).count()

        # 3. Total queries on their PDFs today
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        total_queries_today = QueryLog.objects.filter(
            material__uploaded_by=teacher,
            timestamp__gte=today_start
        ).count()

        # 4. Avg engagement percent (students who made >= 1 query this week / total students * 100)
        one_week_ago = timezone.now() - timedelta(days=7)
        weekly_active_students = QueryLog.objects.filter(
            material__uploaded_by=teacher,
            timestamp__gte=one_week_ago
        ).values('user').distinct().count()

        avg_engagement_percent = round((weekly_active_students / total_students) * 100, 1)

        # 5. Recent activity (last 10 events: uploads, queries, registrations)
        activities = []

        # Fetch recent uploads by this teacher
        recent_uploads = StudyMaterial.objects.filter(uploaded_by=teacher).order_by('-upload_date')[:10]
        for upload in recent_uploads:
            activities.append({
                "type": "upload",
                "description": f"Uploaded a new PDF: '{upload.title}' ({upload.subject})",
                "timestamp": upload.upload_date
            })

        # Fetch recent Q&As on this teacher's files
        recent_queries = QueryLog.objects.filter(material__uploaded_by=teacher).order_by('-timestamp')[:10]
        for query in recent_queries:
            activities.append({
                "type": "query",
                "description": f"Student '{query.user.username}' asked a question on '{query.material.title}'",
                "timestamp": query.timestamp
            })

        # Fetch recent student registrations
        recent_registrations = User.objects.filter(role='Student').order_by('-created_at')[:10]
        for reg in recent_registrations:
            activities.append({
                "type": "registration",
                "description": f"New Student registered: '{reg.username}' joined StudySphere",
                "timestamp": reg.created_at
            })

        # Sort activities by timestamp descending
        activities = sorted(activities, key=lambda x: x['timestamp'], reverse=True)[:10]

        return Response({
            "total_students": User.objects.filter(role='Student').count(),
            "total_materials": total_materials,
            "total_queries_today": total_queries_today,
            "avg_engagement_percent": avg_engagement_percent,
            "recent_activity": activities
        }, status=status.HTTP_200_OK)

class StudentDashboardAPIView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def get(self, request):
        student = request.user
        
        # 1. Total accessed materials (where they asked at least 1 question)
        accessed_materials_count = QueryLog.objects.filter(user=student).values('material').distinct().count()
        
        # 2. Total AI queries made by this student
        queries_count = QueryLog.objects.filter(user=student).count()

        # 3. Study hours (mock metric based on query logs or default)
        study_hours = round(queries_count * 0.25, 2)  # Estimate 15 mins per query engagement

        # 4. Saved answers (count of queries)
        saved_answers = queries_count

        # 5. 3 most recently accessed materials by this student
        recent_logs = QueryLog.objects.filter(user=student).order_by('-timestamp')
        recent_material_ids = []
        recent_visited_map = {}
        for log in recent_logs:
            if log.material_id not in recent_material_ids:
                recent_material_ids.append(log.material_id)
                recent_visited_map[log.material_id] = log.timestamp
            if len(recent_material_ids) >= 3:
                break
        
        recent_materials = []
        for m_id in recent_material_ids:
            material = StudyMaterial.objects.filter(id=m_id).first()
            if material:
                recent_materials.append({
                    "id": material.id,
                    "title": material.title,
                    "subject": material.subject,
                    "last_visited": recent_visited_map[m_id],
                    "file_url": request.build_absolute_uri(material.file.url) if material.file else ""
                })

        # Fallback to general teacher uploads if no history yet
        if len(recent_materials) < 3:
            uploaded_materials = StudyMaterial.objects.filter(uploaded_by__role='Teacher').order_by('-upload_date')
            for mat in uploaded_materials:
                if mat.id not in [rm["id"] for rm in recent_materials]:
                    recent_materials.append({
                        "id": mat.id,
                        "title": mat.title,
                        "subject": mat.subject,
                        "last_visited": mat.upload_date,
                        "file_url": request.build_absolute_uri(mat.file.url) if mat.file else ""
                    })
                if len(recent_materials) >= 3:
                    break

        return Response({
            "total_materials_accessed": accessed_materials_count,
            "total_queries_made": queries_count,
            "study_hours": study_hours,
            "saved_answers": saved_answers,
            "recent_materials": recent_materials[:3]
        }, status=status.HTTP_200_OK)
