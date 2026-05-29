from django.shortcuts import render, redirect , get_object_or_404
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from .forms import CustomUserCreationForm, CustomAuthenticationForm
from .models import PDF
from django.http import HttpResponseRedirect, JsonResponse, HttpResponse
from .forms import MaterialForm
from django.core.paginator import Paginator
from django.conf import settings
import os
from .utils import get_pdf_text, get_text_chunks, get_vector_store, user_input

@login_required
def process_pdf(request):
    if request.method == 'POST':
        path = request.POST.get('path')
        if path and path.startswith('/'):
            path = path[1:]
        
        if not path:
            return JsonResponse({'status': 'error', 'message': 'Path is required'}, status=400)
            
        # Extract filename to lookup PDF and find its ID
        filename = os.path.basename(path)
        pdf = PDF.objects.filter(file__contains=filename).first()
        pdf_id = pdf.id if pdf else "global"
        
        try:
            raw_text = get_pdf_text(path)
            text_chunks = get_text_chunks(raw_text)
            get_vector_store(text_chunks, pdf_id)
            return JsonResponse({'status': 'pdf load successful'})
        except Exception as e:
            return JsonResponse({'status': 'error', 'message': str(e)}, status=500)
    return JsonResponse({'status': 'invalid request'}, status=400)


@login_required
def search_question(request):
    if request.method == 'POST':
        question = request.POST.get('question')
        marks = request.GET.get('marks', '2')
        pdf_id = request.POST.get('pdf_id') or request.session.get('current_pdf_id', 'global')
        
        if not question:
            return JsonResponse({'response': 'Please enter a valid question.'}, status=400)
            
        try:
            response = user_input(question, marks, pdf_id)
            
            # Save to session history
            history_key = f"pdf_history_{pdf_id}"
            history = request.session.get(history_key, [])
            history.append({'question': question, 'response': response})
            request.session[history_key] = history
            request.session.modified = True
            
            if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.POST.get('ajax') == 'true':
                return JsonResponse({'response': response})
            else:
                pdf = get_object_or_404(PDF, id=pdf_id)
                return render(request, 'view_pdf.html', {
                    'pdf': pdf,
                    'question': question,
                    'response': response,
                    'history': history
                })
        except Exception as e:
            return JsonResponse({'response': f"An error occurred while generating the response: {str(e)}"}, status=500)
            
    return redirect('student_dashboard')


@login_required
def student_dashboard(request):
    if request.user.role == 'student':
        pdfs = PDF.objects.all()
        return render(request, 'student_dashboard.html', {'pdfs': pdfs})
    else:
        return redirect('login')


# Register View
def register_view(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            messages.success(request, 'Registration successful. Please log in.')
            return redirect('login')
        else:
            print(form.errors)
            messages.error(request, 'Please correct the errors below.')
    else:
        form = CustomUserCreationForm()
    return render(request, 'registration/register.html', {'form': form})


# Login View with Role-Based Redirection
def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        if username and password:
            user = authenticate(request, username=username, password=password)
            if user is not None:
                login(request, user)
                if hasattr(user, 'role'):
                    if user.role == 'student':
                        return redirect('student_dashboard')
                    elif user.role == 'teacher':
                        return redirect('dashboard')
                    else:
                        messages.error(request, 'User role is not defined.')
                else:
                    messages.error(request, 'User role attribute missing.')
            else:
                messages.error(request, 'Invalid username or password')
        else:
            messages.error(request, 'Both fields are required')
    return render(request, 'registration/login.html')


@login_required
def dashboard(request):
    if request.method == 'POST':
        title = request.POST.get('title')
        description = request.POST.get('description')
        pdf_file = request.FILES.get('pdf')

        if pdf_file:
            PDF.objects.create(
                title=title,
                description=description,
                file=pdf_file,
                uploaded_by=request.user
            )
        return HttpResponseRedirect(request.path)

    # Fetch materials uploaded by this teacher to show on their dashboard
    pdfs = PDF.objects.filter(uploaded_by=request.user)
    return render(request, 'dashboard.html', {'pdfs': pdfs})


def logout_view(request):
    logout(request)
    return redirect('login')


@login_required
def view_pdf(request, pdf_id):
    pdf = get_object_or_404(PDF, id=pdf_id)
    request.session['current_pdf_id'] = pdf_id
    history_key = f"pdf_history_{pdf_id}"
    history = request.session.get(history_key, [])
    return render(request, 'view_pdf.html', {
        'pdf': pdf,
        'history': history,
    })


@login_required
def uploaded_pdfs(request):
    pdfs = PDF.objects.all()
    return render(request, 'uploaded_pdfs.html', {'pdfs': pdfs})
