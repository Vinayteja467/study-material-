from rest_framework import serializers
from .models import StudyMaterial

class StudyMaterialSerializer(serializers.ModelSerializer):
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = StudyMaterial
        fields = (
            'id', 'title', 'subject', 'file', 'file_url', 
            'uploaded_by', 'uploaded_by_name', 'upload_date', 
            'file_size', 'file_size_mb', 'page_count', 'query_count'
        )
        read_only_fields = ('uploaded_by', 'upload_date', 'file_size', 'page_count', 'query_count')

    def get_file_size_mb(self, obj):
        return round(obj.file_size / (1024 * 1024), 2)

    def get_file_url(self, obj):
        request = self.context.get('request')
        if request and obj.file:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url if obj.file else ''

class ChatRequestSerializer(serializers.Serializer):
    pdf_id = serializers.IntegerField()
    question = serializers.CharField()

class ChatResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    sources = serializers.ListField(child=serializers.CharField(), required=False)
