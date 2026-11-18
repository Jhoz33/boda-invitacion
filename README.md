# Invitación de Boda — Django

Proyecto Django funcional basado en la ingeniería inversa de
`https://www.fixdate.io/pe/modelo-invitacion/lilac-garden` (modelo Lilac Garden).

## Requisitos

- Python 3.13
- Django 6.x

## Puesta en marcha

```powershell
cd C:\Users\alexa\OneDrive\Escritorio\Boda
pip install django
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Abre <http://127.0.0.1:8000/>

El panel de administración está en <http://127.0.0.1:8000/admin/>

## Estructura

```
Boda/
├── boda_site/              # Configuración del proyecto
├── invitacion/             # App principal
│   ├── models.py           # Invitado, Confirmacion, SugerenciaCancion
│   ├── views.py            # Vistas + endpoints POST
│   ├── urls.py             # Rutas (incluye compatibilidad con .php del original)
│   ├── admin.py            # Registro en el admin
│   └── migrations/
├── templates/
│   └── index.html          # Template Django (HTML original + {% static %} / {% url %})
├── static/                 # Todos los assets descargados (CSS, JS, imágenes, fuentes, lottie)
└── db.sqlite3
```

## Personalización

### Nombres, fecha y datos del evento
En `invitacion/views.py`, diccionario `EVENTO`:

```python
EVENTO = {
    "novios": {"nombre1": "Luis", "nombre2": "Rosa"},
    "evento": {
        "fecha_texto": "15.05.2027",
        "ceremonia_texto": "Sábado 15 de Mayo - 17hs",
        "celebracion_texto": "Sábado 15 de Mayo - 20hs",
        "ceremonia_inicio": "2027-05-15 17:00:00",
        "ceremonia_fin": "2027-05-15 18:00:00",
        "celebracion_inicio": "2027-05-15 20:00:00",
        "celebracion_fin": "2027-05-16 02:00:00",
        "cuenta_regresiva": "05/15/2027 17:00:00",
    },
    "invitados": ["Valentina Ruiz", "Agustín Ruiz"],
    "acompanantes": 1,
    "mensaje_grupo": "Será un día inolvidable y queremos vivirlo con vos.",
}
```

### Invitados
Se leen de la base de datos (modelo `Invitado`). Si la tabla está vacía se usan los
valores de `EVENTO["invitados"]`. Se editan desde `/admin/`.

### Colores
`static/recursos-variantes-modelos/133/6/css/vars.css` — variables CSS
`--color-pallete-1..6`.

### Imágenes
- Portada: `static/recursos-variantes-modelos/133/6/portadas/`
- Galería: `static/modelo-invitacion/133/img/galeria/`
- Iconos de secciones: `static/modelo-invitacion/133/img/`

## Endpoints

| Ruta | Método | Descripción |
|---|---|---|
| `/` | GET | Invitación |
| `/<pais>/` | GET | Invitación con prefijo de país (`/pe/`, `/mx/`, …) |
| `/api/asistencia/` | POST | Confirmación de asistencia (formulario flexible) |
| `/producto/fetchs/confirmar-asistencia.php` | POST | Confirmación (formulario clásico) |
| `/producto/fetchs/sugerir-cancion.php` | POST | Sugerencia de canción |
| `/producto/fetchs/calendar-links.php` | POST | Links de calendario (Google, Outlook, Yahoo, .ics) |
| `/producto/fetchs/evento.ics` | GET | Descarga del archivo .ics |
| `/admin/` | GET | Panel de administración |

Las rutas `.php` se mantienen para que el JavaScript original funcione sin cambios.

## Notas

- Todo el HTML está en UTF-8 y el template declara `<meta charset="UTF-8">`.
- No hay peticiones a `fixdate.io` en tiempo de ejecución: los assets son locales.
- La música de fondo usa la API de YouTube (`youtube.com/iframe_api`), que sí requiere internet.
