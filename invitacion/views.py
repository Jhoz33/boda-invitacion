import json
import urllib.parse
from datetime import datetime

from django.http import HttpResponse, JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

from .models import Confirmacion, Invitado, SugerenciaCancion

EVENTO = {
    "novios": {"nombre1": "Marlon", "nombre2": "Kelly"},
    "evento": {
        "fecha_texto": "09.01.2027",
        "ceremonia_texto": "Sábado 09 de Enero - 17hs",
        "celebracion_texto": "Sábado 09 de Enero - 20hs",
        "ceremonia_inicio": "2027-01-09 17:00:00",
        "ceremonia_fin": "2027-01-09 18:00:00",
        "celebracion_inicio": "2027-01-09 20:00:00",
        "celebracion_fin": "2027-01-10 02:00:00",
        "cuenta_regresiva": "01/09/2027 17:00:00",
    },
    "invitados": ["Valentina Ruiz", "Agustín Ruiz"],
    "acompanantes": 1,
    "mensaje_grupo": "Será un día inolvidable y queremos vivirlo con vos.",
}


def invitacion_view(request, codigo="pe"):
    registros = list(Invitado.objects.all())
    invitados = [i.nombre for i in registros] or EVENTO["invitados"]
    acompanantes = EVENTO["acompanantes"]
    pases_total = len(invitados) + (
        sum(i.acompanantes for i in registros) if registros else acompanantes
    )

    context = {
        "novios": EVENTO["novios"],
        "evento": EVENTO["evento"],
        "invitados": invitados,
        "acompanantes": acompanantes,
        "pases_total": pases_total,
        "mensaje_grupo": EVENTO["mensaje_grupo"],
        "codigo_pais": codigo,
    }
    return render(request, "index.html", context)


def preview_view(request):
    """Vista previa de la invitación dentro de un marco de teléfono."""
    return render(request, "preview.html")


def gestion_invitados(request):
    if request.method == "POST":
        nombre = request.POST.get("nombre", "").strip()
        grupo = request.POST.get("grupo", "").strip()
        try:
            acompanantes = int(request.POST.get("acompanantes") or 0)
        except ValueError:
            acompanantes = 0
        if nombre:
            Invitado.objects.create(nombre=nombre, grupo=grupo, acompanantes=acompanantes)
    invitados = Invitado.objects.all()
    return render(request, "gestion_invitados.html", {"invitados": invitados})


def _parse_fecha(valor: str) -> datetime:
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(valor.strip(), fmt)
        except (ValueError, TypeError):
            continue
    return datetime(2027, 5, 15, 17, 0, 0)


def _ics_escape(valor: str) -> str:
    return (
        str(valor)
        .replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )


def _build_ics(data: dict) -> str:
    inicio = _parse_fecha(data.get("start", ""))
    fin = _parse_fecha(data.get("end", ""))
    timezone = data.get("timezone", "America/Lima")
    titulo = data.get("title", "Boda")
    descripcion = data.get("description", "")
    ubicacion = data.get("location", "")

    formato = "%Y%m%dT%H%M%S"
    return (
        "BEGIN:VCALENDAR\r\n"
        "VERSION:2.0\r\n"
        "PRODID:-//Fixdate//Boda//ES\r\n"
        "CALSCALE:GREGORIAN\r\n"
        "BEGIN:VEVENT\r\n"
        f"UID:{inicio.strftime(formato)}-boda@fixdate\r\n"
        f"DTSTAMP:{datetime.utcnow().strftime(formato)}Z\r\n"
        f"DTSTART:{inicio.strftime(formato)}\r\n"
        f"DTEND:{fin.strftime(formato)}\r\n"
        f"X-WR-TIMEZONE:{timezone}\r\n"
        f"SUMMARY:{_ics_escape(titulo)}\r\n"
        f"DESCRIPTION:{_ics_escape(descripcion)}\r\n"
        f"LOCATION:{_ics_escape(ubicacion)}\r\n"
        "END:VEVENT\r\n"
        "END:VCALENDAR\r\n"
    )


@csrf_exempt
@require_GET
def evento_ics(request):
    """Descarga directa del archivo .ics (Apple Calendar / Outlook)."""
    data = {
        "start": request.GET.get("start", ""),
        "end": request.GET.get("end", ""),
        "timezone": request.GET.get("timezone", "America/Lima"),
        "title": request.GET.get("title", "Boda"),
        "description": request.GET.get("description", ""),
        "location": request.GET.get("location", ""),
    }
    response = HttpResponse(_build_ics(data), content_type="text/calendar; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="evento.ics"'
    return response


@csrf_exempt
@require_POST
def submit_response(request):
    """Endpoint POST del formulario de asistencia (form-renderer.js)."""
    try:
        payload = json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"success": False, "error": "Payload invalido"}, status=400)

    respuestas = payload.get("respuestas") or {}
    if not isinstance(respuestas, dict):
        respuestas = {}

    nombre = str(respuestas.get("nombre") or respuestas.get("nombreInvitado") or "").strip()
    if not nombre:
        return JsonResponse(
            {"success": False, "error": "El nombre es obligatorio"},
            status=400,
        )

    evento = str(respuestas.get("evento") or payload.get("evento") or "todos")
    if evento not in dict(Confirmacion.EVENTOS):
        evento = "todos"

    autobus_raw = str(respuestas.get("autobus_simple") or "").strip().lower()
    autobus = autobus_raw in ("1", "si", "sí", "true", "yes")

    try:
        ninos = int(respuestas.get("ninios_cuantos") or 0)
    except (TypeError, ValueError):
        ninos = 0

    confirmacion = Confirmacion.objects.create(
        nombre=nombre[:120],
        evento=evento,
        restricciones_alimentarias=str(respuestas.get("restricciones_alimentarias") or "")[:2000],
        autobus=autobus,
        ninos=max(ninos, 0),
        mensaje=str(respuestas.get("mensaje_novios") or "")[:2000],
        idioma=str(payload.get("idioma") or "es-PE")[:10],
    )

    return JsonResponse(
        {
            "success": True,
            "id": confirmacion.pk,
            "esNueva": True,
            "message": "Confirmacion registrada",
        }
    )


@csrf_exempt
@require_POST
def confirmar_asistencia(request):
    """Endpoint POST clasico (formulario legacy)."""
    nombre = (request.POST.get("nombreAsistente") or request.POST.get("nombre") or "").strip()
    if not nombre:
        return JsonResponse({"error": True, "desc": "El nombre es obligatorio"})

    Confirmacion.objects.create(
        nombre=nombre[:120],
        evento=request.POST.get("evento") or "todos",
        restricciones_alimentarias=(request.POST.get("comentariosAsistente") or "")[:2000],
        idioma=(request.POST.get("lang") or "es-PE")[:10],
    )
    return JsonResponse({"error": False, "desc": ""})


@csrf_exempt
@require_POST
def sugerir_cancion(request):
    """Endpoint POST para sugerir canciones."""
    nombre = (request.POST.get("nombre") or "").strip()
    descripcion = (request.POST.get("descripcion") or "").strip()
    link = (request.POST.get("link") or "").strip()

    if not descripcion:
        return JsonResponse({"error": True, "desc": "La cancion es obligatoria"})
    if not nombre:
        return JsonResponse({"error": True, "desc": "El nombre es obligatorio"})

    SugerenciaCancion.objects.create(
        nombre=nombre[:120],
        descripcion=descripcion[:200],
        link=link[:500],
    )
    return JsonResponse({"error": False, "desc": ""})


@csrf_exempt
@require_POST
def calendar_links(request):
    """Genera links de calendario (ical, google, office365, outlook, yahoo)."""
    try:
        data = json.loads(request.body.decode("utf-8") or "{}")
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": True, "data": {}}, status=400)

    inicio = _parse_fecha(data.get("start", ""))
    fin = _parse_fecha(data.get("end", ""))
    timezone = data.get("timezone", "America/Lima")
    titulo = data.get("title", "Boda")
    descripcion = data.get("description", "")
    ubicacion = data.get("location", "")

    def fmt(dt: datetime) -> str:
        return dt.strftime("%Y%m%dT%H%M%S")

    def q(value: str) -> str:
        return urllib.parse.quote(value, safe="")

    google = (
        "https://www.google.com/calendar/render?action=TEMPLATE"
        f"&text={q(titulo)}&dates={fmt(inicio)}/{fmt(fin)}"
        f"&ctz={q(timezone)}&details={q(descripcion)}&location={q(ubicacion)}"
    )
    office = (
        "https://outlook.office.com/calendar/0/deeplink/compose"
        f"?path=/calendar/action/compose&rru=addevent&subject={q(titulo)}"
        f"&startdt={fmt(inicio)}&enddt={fmt(fin)}&body={q(descripcion)}"
        f"&location={q(ubicacion)}"
    )
    outlook = (
        "https://outlook.live.com/calendar/0/deeplink/compose"
        f"?path=/calendar/action/compose&rru=addevent&subject={q(titulo)}"
        f"&startdt={fmt(inicio)}&enddt={fmt(fin)}&body={q(descripcion)}"
        f"&location={q(ubicacion)}"
    )
    yahoo = (
        "https://calendar.yahoo.com/?v=60&view=d&type=20"
        f"&title={q(titulo)}&st={fmt(inicio)}&et={fmt(fin)}"
        f"&in_loc={q(ubicacion)}&desc={q(descripcion)}"
    )

    return JsonResponse(
        {
            "error": False,
            "data": {
                "ics": "/producto/fetchs/evento.ics",
                "google": google,
                "office365": office,
                "outlook": outlook,
                "yahoo": yahoo,
            },
        }
    )
