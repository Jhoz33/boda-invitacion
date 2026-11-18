from django.contrib import admin

from .models import Confirmacion, Invitado, SugerenciaCancion


@admin.register(Invitado)
class InvitadoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "grupo", "acompanantes", "creado")
    search_fields = ("nombre", "grupo")


@admin.register(Confirmacion)
class ConfirmacionAdmin(admin.ModelAdmin):
    list_display = (
        "nombre",
        "evento",
        "autobus",
        "ninos",
        "restricciones_alimentarias",
        "creado",
    )
    list_filter = ("evento", "autobus")
    search_fields = ("nombre", "mensaje", "restricciones_alimentarias")
    list_editable = ("evento", "autobus", "ninos")


@admin.register(SugerenciaCancion)
class SugerenciaCancionAdmin(admin.ModelAdmin):
    list_display = ("descripcion", "nombre", "link", "creado")
    search_fields = ("nombre", "descripcion")
