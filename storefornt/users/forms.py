from django import forms
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from .models import CustomUser
from .models import PDF

from django.apps import AppConfig

class UsersConfig(AppConfig):
    name = 'users'
    verbose_name = 'Users'

    def ready(self):
        # Any custom logic that needs to run when the app is ready
        pass

class MaterialForm(forms.ModelForm):
    class Meta:
        model = PDF
        fields = ['title', 'description', 'file','is_public']

        

   
class CustomAuthenticationForm(AuthenticationForm):
    username = forms.EmailField(widget=forms.EmailInput(attrs={'autofocus': True}))




class CustomUserCreationForm(UserCreationForm):
    email = forms.EmailField(required=True)
    role = forms.ChoiceField(choices=CustomUser.ROLE_CHOICES)

    class Meta:
        model = CustomUser
        fields = ('username', 'email', 'role')
