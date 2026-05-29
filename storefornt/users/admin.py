    
from django.contrib import admin
from .models import CustomUser, PDF

@admin.register(CustomUser)
class CustomUserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role')

# admin.site.register(PDF)


@admin.register(PDF)  # Register the PDF model
class PDFAdmin(admin.ModelAdmin):
    list_display = ('title', 'description', 'file', 'uploaded_at')  # Customize the fields to display