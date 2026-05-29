from rest_framework import serializers
from .models import CustomUser, MCQResult, Subject, Attendance, Announcement, MockTest, MockTestAttempt

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = ('id', 'username', 'email', 'full_name', 'role', 'profile_picture', 'bio', 'created_at', 'is_active')
        read_only_fields = ('id', 'full_name', 'created_at')

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class MCQResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    material_title = serializers.CharField(source='material.title', read_only=True)

    class Meta:
        model = MCQResult
        fields = ('id', 'student', 'student_name', 'material', 'material_title', 'topic', 'score', 'total', 'answers', 'created_at')
        read_only_fields = ('student', 'created_at')


class SubjectSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    students_detail = UserSerializer(source='students', many=True, read_only=True)

    class Meta:
        model = Subject
        fields = ('id', 'name', 'teacher', 'teacher_name', 'students', 'students_detail')
        read_only_fields = ('teacher',)


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    marked_by_name = serializers.CharField(source='marked_by.username', read_only=True)

    class Meta:
        model = Attendance
        fields = ('id', 'student', 'student_name', 'subject', 'date', 'status', 'marked_by', 'marked_by_name')
        read_only_fields = ('marked_by', 'marked_by_name')


class AnnouncementSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = Announcement
        fields = ('id', 'title', 'content', 'created_by', 'author_name', 'created_at')
        read_only_fields = ('created_by', 'created_at')


class MockTestSerializer(serializers.ModelSerializer):
    material_title = serializers.CharField(source='material.title', read_only=True)
    creator_name = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = MockTest
        fields = ('id', 'title', 'material', 'material_title', 'questions', 'time_limit_minutes', 'created_by', 'creator_name', 'created_at')
        read_only_fields = ('created_by', 'created_at')


class MockTestAttemptSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.username', read_only=True)
    test_title = serializers.CharField(source='test.title', read_only=True)
    time_limit_minutes = serializers.IntegerField(source='test.time_limit_minutes', read_only=True)

    class Meta:
        model = MockTestAttempt
        fields = ('id', 'student', 'student_name', 'test', 'test_title', 'answers', 'score', 'total', 'time_taken_seconds', 'time_limit_minutes', 'completed_at')
        read_only_fields = ('student', 'completed_at')
