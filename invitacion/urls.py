from django.http import HttpResponse
from django.urls import path

from . import views

app_name = "invitacion"

urlpatterns = [
    path("", views.invitacion_view, name="inicio"),
    path("preview/", views.preview_view, name="preview"),
    path("<str:codigo>/", views.invitacion_view, name="por_pais"),
    path("api/asistencia/", views.submit_response, name="submit_response"),
    path("producto/fetchs/confirmar-asistencia.php", views.confirmar_asistencia, name="confirmar_asistencia"),
    path("producto/fetchs/sugerir-cancion.php", views.sugerir_cancion, name="sugerir_cancion"),
    path("producto/fetchs/calendar-links.php", views.calendar_links, name="calendar_links"),
    path("producto/fetchs/evento.ics", views.evento_ics, name="evento_ics"),
]
