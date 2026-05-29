from django.apps import AppConfig



class UsersConfig(AppConfig):
    name = 'users'
    verbose_name = 'Users'

    def ready(self):
        # Any custom logic that needs to run when the app is ready
        pass





