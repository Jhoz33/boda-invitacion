import os
import sys
sys.path.insert(0, os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'boda_site.settings')
import django
django.setup()
from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
