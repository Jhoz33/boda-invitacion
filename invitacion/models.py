from django.db import models


class Invitado(models.Model):
    nombre = models.CharField(max_length=120)
    grupo = models.CharField(max_length=120, blank=True)
    acompanantes = models.PositiveSmallIntegerField(default=0)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Confirmacion(models.Model):
    EVENTOS = [
        ("ceremonia", "Ceremonia"),
        ("celebracion", "Celebración"),
        ("todos", "Todos"),
    ]

    invitado = models.ForeignKey(
        Invitado,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="confirmaciones",
    )
    nombre = models.CharField(max_length=120)
    evento = models.CharField(max_length=20, choices=EVENTOS, default="todos")
    restricciones_alimentarias = models.TextField(blank=True)
    autobus = models.BooleanField(default=False)
    ninos = models.PositiveSmallIntegerField(default=0)
    mensaje = models.TextField(blank=True)
    idioma = models.CharField(max_length=10, default="es-PE")
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self) -> str:
        return f"{self.nombre} ({self.evento})"


class SugerenciaCancion(models.Model):
    nombre = models.CharField(max_length=120)
    descripcion = models.CharField(max_length=200)
    link = models.URLField(max_length=500, blank=True)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-creado"]

    def __str__(self) -> str:
        return f"{self.descripcion} - {self.nombre}"
