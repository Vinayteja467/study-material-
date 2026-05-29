import os
import json
import hashlib
from datetime import datetime, timedelta
from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.db.models import Sum, Count, Q, Avg
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.conf import settings
from pypdf import PdfReader

# Imports from same app
from .models import (
    CustomUser, MCQResult, Subject, Attendance, Announcement, MockTest, MockTestAttempt
)
from .serializers import (
    UserSerializer, MCQResultSerializer, SubjectSerializer, AttendanceSerializer,
    AnnouncementSerializer, MockTestSerializer, MockTestAttemptSerializer
)
from .permissions import IsTeacher, IsStudent
from rest_framework.permissions import BasePermission

# Imports from materials app
from materials.models import StudyMaterial, QueryLog
from materials.utils import get_pdf_hash

# LangChain and Gemini
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_community.vectorstores import FAISS

User = get_user_model()

# Custom Admin Permission
class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'admin'


# =====================================================================
# 1. CORE AUTHENTICATION VIEWS
# =====================================================================

class RegisterView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'Student')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')
        bio = request.data.get('bio', '')
        profile_picture = request.FILES.get('profile_picture')

        if not username or not email or not password:
            return Response(
                {"error": "Please provide username, email, and password."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(username=username).exists():
            return Response(
                {"error": "Username already exists."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if User.objects.filter(email=email).exists():
            return Response(
                {"error": "Email already registered."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role,
                first_name=first_name,
                last_name=last_name,
                bio=bio
            )
            if profile_picture:
                user.profile_picture = profile_picture
                user.save()

            # Generate tokens automatically upon successful registration
            refresh = RefreshToken.for_user(user)
            serializer = UserSerializer(user, context={'request': request})
            return Response({
                "user": serializer.data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
                "message": "User registered successfully!"
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        serializer = UserSerializer(request.user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class StudentsListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only Teachers can access student lists."}, status=status.HTTP_403_FORBIDDEN)
        
        students = User.objects.filter(role='Student')
        serializer = UserSerializer(students, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================================
# 2. FEATURE 1: MCQ & FLASHCARD GENERATOR VIEWS
# =====================================================================

def get_faiss_context(pdf_path, topic):
    """Utility to retrieve similar text chunks from local FAISS vector store cache."""
    try:
        api_key = getattr(settings, 'GOOGLE_API_KEY', '')
        embeddings = GoogleGenerativeAIEmbeddings(
            model="models/gemini-embedding-001",
            google_api_key=api_key
        )
        cache_root = os.path.join(settings.MEDIA_ROOT, 'faiss_cache')
        pdf_hash = get_pdf_hash(pdf_path)
        faiss_dir = os.path.join(cache_root, f"index_{pdf_hash}")

        if os.path.exists(faiss_dir):
            vector_store = FAISS.load_local(
                faiss_dir, embeddings, allow_dangerous_deserialization=True
            )
            docs = vector_store.similarity_search(topic, k=4)
            return "\n".join([doc.page_content for doc in docs])
    except Exception as e:
        print(f"Error loading FAISS chunks: {e}")
    
    # Fallback: Extract text from first 5 pages of PDF
    try:
        reader = PdfReader(pdf_path)
        return "\n".join([page.extract_text() for page in reader.pages[:5]])
    except Exception as ex:
        print(f"Fallback reading failed: {ex}")
        return "No context available"

class MCQGenerateView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def post(self, request):
        pdf_id = request.data.get('pdf_id')
        topic = request.data.get('topic', 'General Overview')
        count = int(request.data.get('count', 5))

        material = get_object_or_404(StudyMaterial, id=pdf_id)
        context = get_faiss_context(material.file.path, topic)

        prompt = f"""
        Based on the following academic text, generate a list of {count} multiple choice questions (MCQ) on the topic "{topic}".
        You must return a raw JSON array of objects. Do NOT wrap it in markdown code blocks or write any extra text. Return ONLY the parseable JSON array.
        Each object in the array must have exactly the following keys:
        - "question": the question text
        - "options": a JSON array of 4 options (strings) representing [A, B, C, D]
        - "correct_answer": the exact string of the correct option (must be one of the options)
        - "explanation": a detailed explanation of why it is the correct answer

        Context Text:
        {context}
        """

        try:
            api_key = getattr(settings, 'GOOGLE_API_KEY', '')
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash", google_api_key=api_key, temperature=0.3
            )
            response = llm.invoke(prompt)
            response_text = response.content.strip()

            # Clean JSON brackets if Gemini wraps in code blocks
            if response_text.startswith("```"):
                lines = response_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                response_text = "\n".join(lines).strip()

            questions_list = json.loads(response_text)
            return Response({
                "material_id": pdf_id,
                "topic": topic,
                "questions": questions_list
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MCQSaveResultView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def post(self, request):
        pdf_id = request.data.get('pdf_id')
        topic = request.data.get('topic', 'General')
        score = request.data.get('score')
        total = request.data.get('total')
        answers = request.data.get('answers', [])

        material = get_object_or_404(StudyMaterial, id=pdf_id)

        result = MCQResult.objects.create(
            student=request.user,
            material=material,
            topic=topic,
            score=score,
            total=total,
            answers=answers
        )

        serializer = MCQResultSerializer(result, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class MCQHistoryView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def get(self, request):
        history = MCQResult.objects.filter(student=request.user).order_by('-created_at')
        serializer = MCQResultSerializer(history, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class FlashcardsGenerateView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def post(self, request):
        pdf_id = request.data.get('pdf_id')
        topic = request.data.get('topic', 'Key Terms')
        count = int(request.data.get('count', 5))

        material = get_object_or_404(StudyMaterial, id=pdf_id)
        context = get_faiss_context(material.file.path, topic)

        prompt = f"""
        Based on the following academic text, generate a list of {count} flashcards on the topic "{topic}".
        You must return a raw JSON array of objects. Do NOT wrap it in markdown code blocks or write any extra text. Return ONLY the parseable JSON array.
        Each object in the array must have exactly the following keys:
        - "front": the question or concept on the front of the flashcard
        - "back": the answer or explanation on the back of the flashcard

        Context Text:
        {context}
        """

        try:
            api_key = getattr(settings, 'GOOGLE_API_KEY', '')
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash", google_api_key=api_key, temperature=0.3
            )
            response = llm.invoke(prompt)
            response_text = response.content.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                response_text = "\n".join(lines).strip()

            flashcards_list = json.loads(response_text)
            return Response(flashcards_list, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =====================================================================
# 3. FEATURE 2: ATTENDANCE TRACKER VIEWS
# =====================================================================

class AttendanceMarkView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    def post(self, request):
        subject_id = request.data.get('subject_id')
        date_str = request.data.get('date')
        records = request.data.get('records', [])

        subject_obj = get_object_or_404(Subject, id=subject_id, teacher=request.user)

        try:
            date_val = datetime.strptime(date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        attendance_records = []
        for rec in records:
            student_id = rec.get('student_id')
            status_val = rec.get('status')
            student = get_object_or_404(User, id=student_id, role='Student')

            # Create or update attendance log
            attendance, created = Attendance.objects.update_or_create(
                student=student,
                subject=subject_obj.name,
                date=date_val,
                defaults={
                    'status': status_val,
                    'marked_by': request.user
                }
            )
            attendance_records.append(attendance)

        return Response({"message": "Attendance successfully registered!"}, status=status.HTTP_201_CREATED)

class AttendanceSummaryView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, student_id):
        student = get_object_or_404(User, id=student_id, role='Student')

        # Prevent other students from seeing this unless they are teacher or admin
        if request.user.role == 'Student' and request.user.id != student.id:
            return Response({"error": "Unauthorized access to profile attendance summary."}, status=status.HTTP_403_FORBIDDEN)

        # Overall summary
        total_logs = Attendance.objects.filter(student=student).count()
        if total_logs == 0:
            return Response({
                "overall_percent": 100,
                "low_attendance_flag": False,
                "subjects": []
            }, status=status.HTTP_200_OK)

        presents = Attendance.objects.filter(student=student, status__in=['Present', 'Late']).count()
        overall_percent = round((presents / total_logs) * 100, 1)

        # Subject summaries
        subjects_list = Attendance.objects.filter(student=student).values_list('subject', flat=True).distinct()
        subjects_data = []
        low_attendance_flag = False

        for sub_name in subjects_list:
            sub_logs = Attendance.objects.filter(student=student, subject=sub_name).count()
            sub_presents = Attendance.objects.filter(student=student, subject=sub_name, status__in=['Present', 'Late']).count()
            sub_percent = round((sub_presents / sub_logs) * 100, 1)
            
            if sub_percent < 75.0:
                low_attendance_flag = True

            subjects_data.append({
                "subject": sub_name,
                "attendance_percent": sub_percent,
                "total_classes": sub_logs,
                "classes_attended": sub_presents
            })

        return Response({
            "overall_percent": overall_percent,
            "low_attendance_flag": low_attendance_flag or (overall_percent < 75.0),
            "subjects": subjects_data
        }, status=status.HTTP_200_OK)

class AttendanceClassView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    def get(self, request, subject_id):
        subject_obj = get_object_or_404(Subject, id=subject_id, teacher=request.user)
        students = subject_obj.students.all()
        
        # Pull past attendance records for this class
        records = Attendance.objects.filter(subject=subject_obj.name).order_by('-date')
        
        student_serializer = UserSerializer(students, many=True, context={'request': request})
        attendance_serializer = AttendanceSerializer(records, many=True, context={'request': request})

        return Response({
            "subject": SubjectSerializer(subject_obj, context={'request': request}).data,
            "students": student_serializer.data,
            "past_records": attendance_serializer.data
        }, status=status.HTTP_200_OK)

class AttendanceEditView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    def put(self, request, id):
        attendance = get_object_or_404(Attendance, id=id)
        status_val = request.data.get('status')
        if status_val not in ['Present', 'Absent', 'Late']:
            return Response({"error": "Invalid status value."}, status=status.HTTP_400_BAD_REQUEST)
        
        attendance.status = status_val
        attendance.save()

        serializer = AttendanceSerializer(attendance, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================================
# 4. FEATURE 3: ANALYTICS DASHBOARD VIEWS
# =====================================================================

class TeacherAnalyticsDashboardView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    def get(self, request):
        teacher = request.user
        
        # 1. Weekly active timelines
        one_week_ago = timezone.now().date() - timedelta(days=7)
        weekly_activity = []
        for i in range(7):
            day_date = one_week_ago + timedelta(days=i)
            queries_count = QueryLog.objects.filter(
                material__uploaded_by=teacher,
                timestamp__date=day_date
            ).count()
            uploads_count = StudyMaterial.objects.filter(
                uploaded_by=teacher,
                upload_date__date=day_date
            ).count()
            weekly_activity.append({
                "day": day_date.strftime('%a'),
                "queries": queries_count,
                "uploads": uploads_count
            })

        # 2. Subject analytics performance
        subjects_perf = StudyMaterial.objects.filter(uploaded_by=teacher).values('subject').annotate(
            materials_count=Count('id'),
            avg_queries=Avg('query_count')
        )
        subject_performance = []
        for perf in subjects_perf:
            subject_performance.append({
                "subject": perf['subject'],
                "materials_count": perf['materials_count'],
                "avg_queries": round(perf['avg_queries'] or 0, 1)
            })

        # 3. Top materials
        top_mats = StudyMaterial.objects.filter(uploaded_by=teacher).order_by('-query_count')[:5]
        top_materials = []
        for mat in top_mats:
            top_materials.append({
                "title": mat.title,
                "query_count": mat.query_count,
                "subject": mat.subject
            })

        # 4. Student engagement
        student_engagement = []
        # Find students who interacted with this teacher's files
        engagements = QueryLog.objects.filter(material__uploaded_by=teacher).values('user').annotate(
            queries_count=Count('id'),
            accessed_files=Count('material', distinct=True)
        )
        for eng in engagements:
            user_obj = User.objects.filter(id=eng['user']).first()
            if user_obj:
                student_engagement.append({
                    "student_name": user_obj.get_full_name() or user_obj.username,
                    "queries_this_week": eng['queries_count'],
                    "materials_accessed": eng['accessed_files']
                })

        # 5. Total counts
        total_students = User.objects.filter(role='Student').count()
        total_materials = StudyMaterial.objects.filter(uploaded_by=teacher).count()
        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        queries_today = QueryLog.objects.filter(material__uploaded_by=teacher, timestamp__gte=today_start).count()
        queries_this_week = QueryLog.objects.filter(material__uploaded_by=teacher, timestamp__gte=one_week_ago).count()

        return Response({
            "subject_performance": subject_performance,
            "weekly_activity": weekly_activity,
            "top_materials": top_materials,
            "student_engagement": student_engagement,
            "total_stats": {
                "students": total_students,
                "materials": total_materials,
                "queries_today": queries_today,
                "queries_this_week": queries_this_week
            }
        }, status=status.HTTP_200_OK)

class StudentAnalyticsDashboardView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def get(self, request):
        student = request.user
        
        # 1. Queries by subject
        queries_by_sub = QueryLog.objects.filter(user=student).values('material__subject').annotate(
            count=Count('id')
        )
        queries_by_subject = []
        for q in queries_by_sub:
            queries_by_subject.append({
                "subject": q['material__subject'] or 'General',
                "count": q['count']
            })

        # 2. Daily activity logs over last 14 days
        two_weeks_ago = timezone.now().date() - timedelta(days=14)
        daily_activity = []
        for i in range(14):
            day_date = two_weeks_ago + timedelta(days=i)
            count = QueryLog.objects.filter(user=student, timestamp__date=day_date).count()
            daily_activity.append({
                "date": day_date.strftime('%b %d'),
                "queries": count
            })

        # 3. Weak areas (subjects with lowest queries count vs available materials count)
        # For simplicity, list subjects with lowest query counts
        weak_subjects = []
        subjects_engagement = QueryLog.objects.filter(user=student).values('material__subject').annotate(
            engagement=Count('id')
        ).order_by('engagement')
        for sub in subjects_engagement:
            weak_subjects.append(sub['material__subject'])

        # 4. Study streak logs
        logs = QueryLog.objects.filter(user=student).order_by('-timestamp')
        streak = 0
        current_date = timezone.now().date()
        
        # Extract unique dates when queries were made
        log_dates = sorted(list(set([log.timestamp.date() for log in logs])), reverse=True)
        
        if log_dates:
            # Check if student was active today or yesterday to continue streak
            if log_dates[0] == current_date or log_dates[0] == current_date - timedelta(days=1):
                streak = 1
                for i in range(len(log_dates) - 1):
                    if log_dates[i] - log_dates[i+1] == timedelta(days=1):
                        streak += 1
                    else:
                        break

        return Response({
            "queries_by_subject": queries_by_subject,
            "daily_activity": daily_activity,
            "weak_subjects": weak_subjects[:2],
            "study_streak": streak
        }, status=status.HTTP_200_OK)


# =====================================================================
# 5. FEATURE 4: ADMIN CONTROL PANEL VIEWS
# =====================================================================

class AdminUsersView(APIView):
    permission_classes = (IsAuthenticated, IsAdmin)

    def get(self, request):
        users = User.objects.all().order_by('-created_at')
        
        # Compile metadata detailing queries and last active timestamps
        users_list = []
        for u in users:
            query_count = QueryLog.objects.filter(user=u).count()
            last_query = QueryLog.objects.filter(user=u).order_by('-timestamp').first()
            last_active = last_query.timestamp if last_query else u.created_at

            users_list.append({
                "id": u.id,
                "username": u.username,
                "email": u.email,
                "full_name": u.get_full_name() or u.username,
                "role": u.role,
                "created_at": u.created_at,
                "query_count": query_count,
                "last_active": last_active,
                "is_active": u.is_active
            })
        return Response(users_list, status=status.HTTP_200_OK)

    def post(self, request):
        username = request.data.get('username')
        email = request.data.get('email')
        password = request.data.get('password')
        role = request.data.get('role', 'Student')

        if not username or not email or not password:
            return Response({"error": "Username, email, and password are required."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role=role
            )
            serializer = UserSerializer(user, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

class AdminUserDetailView(APIView):
    permission_classes = (IsAuthenticated, IsAdmin)

    def put(self, request, id):
        user = get_object_or_404(User, id=id)
        role = request.data.get('role')
        is_active = request.data.get('is_active')

        if role:
            user.role = role
        if is_active is not None:
            user.is_active = is_active
        
        user.save()
        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, id):
        user = get_object_or_404(User, id=id)
        user.delete()
        return Response({"message": "User successfully deleted!"}, status=status.HTTP_200_OK)

class AdminStatsView(APIView):
    permission_classes = (IsAuthenticated, IsAdmin)

    def get(self, request):
        total_users = User.objects.count()
        total_students = User.objects.filter(role='Student').count()
        total_teachers = User.objects.filter(role='Teacher').count()
        
        total_materials = StudyMaterial.objects.count()
        total_queries = QueryLog.objects.count()

        today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
        queries_today = QueryLog.objects.filter(timestamp__gte=today_start).count()

        one_week_ago = timezone.now() - timedelta(days=7)
        new_users_this_week = User.objects.filter(created_at__gte=one_week_ago).count()

        # Compute mock disk storage metrics
        total_size = StudyMaterial.objects.aggregate(sum_size=Sum('file_size'))['sum_size'] or 0
        storage_used_mb = round(total_size / (1024 * 1024), 2)

        return Response({
            "total_users": total_users,
            "total_students": total_students,
            "total_teachers": total_teachers,
            "total_materials": total_materials,
            "total_queries": total_queries,
            "queries_today": queries_today,
            "new_users_this_week": new_users_this_week,
            "storage_used_mb": storage_used_mb
        }, status=status.HTTP_200_OK)

class AdminMaterialsView(APIView):
    permission_classes = (IsAuthenticated, IsAdmin)

    def get(self, request):
        materials = StudyMaterial.objects.all().order_by('-upload_date')
        
        materials_list = []
        for m in materials:
            materials_list.append({
                "id": m.id,
                "title": m.title,
                "subject": m.subject,
                "upload_date": m.upload_date,
                "file_size": m.file_size,
                "file_size_mb": round(m.file_size / (1024 * 1024), 2),
                "page_count": m.page_count,
                "query_count": m.query_count,
                "uploader_name": m.uploaded_by.username
            })
        return Response(materials_list, status=status.HTTP_200_OK)

class AdminMaterialDetailView(APIView):
    permission_classes = (IsAuthenticated, IsAdmin)

    def delete(self, request, id):
        material = get_object_or_404(StudyMaterial, id=id)
        
        # Also clean up the actual file from disk
        if material.file and os.path.exists(material.file.path):
            os.remove(material.file.path)
            
        material.delete()
        return Response({"message": "Material successfully deleted!"}, status=status.HTTP_200_OK)

class AdminAnnounceView(APIView):
    permission_classes = (IsAuthenticated, IsAdmin)

    def post(self, request):
        title = request.data.get('title')
        content = request.data.get('content')

        if not title or not content:
            return Response({"error": "Title and content are required."}, status=status.HTTP_400_BAD_REQUEST)

        announce = Announcement.objects.create(
            title=title,
            content=content,
            created_by=request.user
        )

        serializer = AnnouncementSerializer(announce, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class AnnouncementListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        announcements = Announcement.objects.all().order_by('-created_at')
        serializer = AnnouncementSerializer(announcements, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


# =====================================================================
# 6. FEATURE 5: MOCK TEST EXAM SYSTEM VIEWS
# =====================================================================

class MockTestCreateView(APIView):
    permission_classes = (IsAuthenticated, IsTeacher)

    def post(self, request):
        pdf_id = request.data.get('pdf_id')
        title = request.data.get('title', 'Academic Evaluation')
        time_limit = int(request.data.get('time_limit_minutes', 30))
        count = int(request.data.get('question_count', 10))

        material = get_object_or_404(StudyMaterial, id=pdf_id)
        context = get_faiss_context(material.file.path, title)

        prompt = f"""
        Based on the following academic text, generate a mock exam test containing {count} questions on the topic "{title}".
        You must return a raw JSON array of objects. Do NOT wrap it in markdown code blocks or write any extra text. Return ONLY the parseable JSON array.
        Each object in the array must have exactly the following keys:
        - "id": an integer starting from 1
        - "question": the question text
        - "options": a JSON array of 4 options (strings) representing [A, B, C, D]
        - "correct_answer": the exact string of the correct option (must be one of the options)
        - "explanation": a detailed explanation of why it is the correct answer

        Context Text:
        {context}
        """

        try:
            api_key = getattr(settings, 'GOOGLE_API_KEY', '')
            llm = ChatGoogleGenerativeAI(
                model="gemini-2.5-flash", google_api_key=api_key, temperature=0.3
            )
            response = llm.invoke(prompt)
            response_text = response.content.strip()

            if response_text.startswith("```"):
                lines = response_text.split("\n")
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines[-1].startswith("```"):
                    lines = lines[:-1]
                response_text = "\n".join(lines).strip()

            questions_list = json.loads(response_text)
            
            mock_test = MockTest.objects.create(
                title=title,
                material=material,
                questions=questions_list,
                time_limit_minutes=time_limit,
                created_by=request.user
            )

            serializer = MockTestSerializer(mock_test, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class MockTestListView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        # Students see tests from materials they have access to. Let's return all available tests
        tests = MockTest.objects.all().order_by('-created_at')
        serializer = MockTestSerializer(tests, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class MockTestDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request, id):
        test = get_object_or_404(MockTest, id=id)
        
        # Hide the correct answers from students to prevent cheating!
        questions = []
        for q in test.questions:
            questions.append({
                "id": q.get("id"),
                "question": q.get("question"),
                "options": q.get("options")
            })

        # Calculate if already attempted to return high scores
        best_score = 0
        has_attempted = False
        best_attempt = MockTestAttempt.objects.filter(student=request.user, test=test).order_by('-score').first()
        if best_attempt:
            best_score = best_attempt.score
            has_attempted = True

        return Response({
            "id": test.id,
            "title": test.title,
            "material_title": test.material.title,
            "time_limit_minutes": test.time_limit_minutes,
            "questions": questions,
            "best_score": best_score,
            "has_attempted": has_attempted
        }, status=status.HTTP_200_OK)

class MockTestAttemptView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def post(self, request, id):
        test = get_object_or_404(MockTest, id=id)
        student_answers = request.data.get('answers', {})  # Map of "question_id": "selected_option"
        time_taken = int(request.data.get('time_taken_seconds', 0))

        # Auto grading logic
        score = 0
        total = len(test.questions)
        results_review = []

        for q in test.questions:
            q_id = str(q.get("id"))
            selected = student_answers.get(q_id, '')
            correct = q.get("correct_answer", '')
            is_correct = (selected.strip().lower() == correct.strip().lower())

            if is_correct:
                score += 1

            results_review.append({
                "id": q.get("id"),
                "question": q.get("question"),
                "options": q.get("options"),
                "selected_answer": selected,
                "correct_answer": correct,
                "is_correct": is_correct,
                "explanation": q.get("explanation", '')
            })

        # Save Attempt History
        attempt = MockTestAttempt.objects.create(
            student=request.user,
            test=test,
            answers=student_answers,
            score=score,
            total=total,
            time_taken_seconds=time_taken
        )

        return Response({
            "attempt_id": attempt.id,
            "score": score,
            "total": total,
            "percentage": round((score / total) * 100, 1),
            "review": results_review,
            "time_taken_seconds": time_taken
        }, status=status.HTTP_201_CREATED)

class MockTestResultsListView(APIView):
    permission_classes = (IsAuthenticated, IsStudent)

    def get(self, request):
        attempts = MockTestAttempt.objects.filter(student=request.user).order_by('-completed_at')
        serializer = MockTestAttemptSerializer(attempts, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

class SubjectListCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        if request.user.role == 'Teacher':
            subjects = Subject.objects.filter(teacher=request.user)
        elif request.user.role == 'Student':
            subjects = Subject.objects.filter(students=request.user)
        else:
            subjects = Subject.objects.all()
        serializer = SubjectSerializer(subjects, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only Teachers can create subjects."}, status=status.HTTP_403_FORBIDDEN)
        name = request.data.get('name')
        student_ids = request.data.get('students', [])
        if not name:
            return Response({"error": "Subject name is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        subject = Subject.objects.create(name=name, teacher=request.user)
        if student_ids:
            students = User.objects.filter(id__in=student_ids, role='Student')
            subject.students.set(students)
        serializer = SubjectSerializer(subject, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

