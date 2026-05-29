from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings

class CustomUser(AbstractUser):
    ROLE_CHOICES = (
        ('Teacher', 'Teacher'),
        ('Student', 'Student'),
        ('admin', 'admin'),
    )
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Student')
    profile_picture = models.ImageField(upload_to='profiles/', null=True, blank=True)
    bio = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.username} ({self.role})"


class MCQResult(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='mcq_results')
    material = models.ForeignKey('materials.StudyMaterial', on_delete=models.CASCADE, related_name='mcq_results')
    topic = models.CharField(max_length=255, default='General')
    score = models.IntegerField()
    total = models.IntegerField()
    answers = models.JSONField()  # Store student answers log
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.username} - Quiz: {self.score}/{self.total} ({self.created_at})"


class Subject(models.Model):
    name = models.CharField(max_length=255)
    teacher = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='subjects_taught')
    students = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='subjects_enrolled', blank=True)

    def __str__(self):
        return f"{self.name} (Taught by: {self.teacher.username})"


class Attendance(models.Model):
    STATUS_CHOICES = (
        ('Present', 'Present'),
        ('Absent', 'Absent'),
        ('Late', 'Late'),
    )
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='attendances')
    subject = models.CharField(max_length=255)  # E.g. subject name or linking FK
    date = models.DateField()
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Present')
    marked_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='marked_attendances')

    def __str__(self):
        return f"{self.student.username} - {self.subject} - {self.date}: {self.status}"


class Announcement(models.Model):
    title = models.CharField(max_length=255)
    content = models.TextField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Announcement: {self.title} by {self.created_by.username} ({self.created_at})"


class MockTest(models.Model):
    title = models.CharField(max_length=255)
    material = models.ForeignKey('materials.StudyMaterial', on_delete=models.CASCADE, related_name='mock_tests')
    questions = models.JSONField()  # JSON array of {question, options:[A,B,C,D], correct_answer, explanation}
    time_limit_minutes = models.IntegerField(default=30)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} (Material: {self.material.title})"


class MockTestAttempt(models.Model):
    student = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='test_attempts')
    test = models.ForeignKey(MockTest, on_delete=models.CASCADE, related_name='attempts')
    answers = models.JSONField()  # Store student answers key selections
    score = models.IntegerField()
    total = models.IntegerField()
    time_taken_seconds = models.IntegerField()
    completed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.student.username} - {self.test.title}: {self.score}/{self.total}"
