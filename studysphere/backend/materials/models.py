from django.db import models
from django.conf import settings

class StudyMaterial(models.Model):
    SUBJECT_CHOICES = (
        ('Mathematics', 'Mathematics'),
        ('Physics', 'Physics'),
        ('History', 'History'),
        ('English', 'English'),
        ('Other', 'Other'),
    )
    title = models.CharField(max_length=255)
    subject = models.CharField(max_length=20, choices=SUBJECT_CHOICES)
    file = models.FileField(upload_to='uploads/pdfs/')
    uploaded_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='materials')
    upload_date = models.DateTimeField(auto_now_add=True)
    file_size = models.BigIntegerField()  # in bytes
    page_count = models.IntegerField(null=True, blank=True)
    query_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.title} - {self.subject} ({self.uploaded_by.username})"

class QueryLog(models.Model):
    material = models.ForeignKey(StudyMaterial, on_delete=models.CASCADE, related_name='query_logs')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    question = models.TextField()
    answer = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Query on {self.material.title} by {self.user.username} at {self.timestamp}"
