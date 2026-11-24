/* Pantalla de bienvenida: libro que se abre + avecita */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var modo = params.get('libro');
  var activo = modo !== 'off';
  var autoAbrir = modo !== 'capa';

  var estado = {
    activo: activo,
    autoAbrir: autoAbrir,
    reabrir: function () {}
  };
  window.__libroBienvenida = estado;

  if (!activo) {
    return;
  }

  var overlay = null;
  var escena = null;
  var tapa = null;
  var interior = null;
  var pista = null;

  var progress = 0;
  var raf = 0;
  var abierto = false;
  var arrastrando = false;
  var pointerId = null;
  var inicioX = 0;
  var anteriorX = 0;
  var anteriorT = 0;
  var velocidad = 0;
  var movido = false;
  var animando = false;
  var timerApertura = 0;
  var timerCierre = 0;

  function clamp(valor, min, max) {
    return Math.min(max, Math.max(min, valor));
  }

  function aplicarProgress(t) {
    progress = clamp(t, 0, 1);
    var angulo = -90.5 * progress;
    var opacidad = progress <= 0.87 ? 1 : clamp(1 - (progress - 0.87) / 0.13, 0, 1);
    if (tapa) {
      tapa.style.transform = 'rotateY(' + angulo + 'deg)';
      tapa.style.opacity = String(opacidad);
    }
    if (interior) {
      interior.style.transition = 'none';
      var interiorOp = progress > 0.6 ? 1 : 0;
      interior.style.opacity = String(interiorOp);
      interior.style.transform = 'scale(' + (0.96 + 0.04 * interiorOp) + ')';
    }
  }

  function terminar() {
    if (abierto) {
      return;
    }
    abierto = true;
    animando = false;
    if (timerApertura) {
      clearTimeout(timerApertura);
      timerApertura = 0;
    }
    if (tapa) {
      tapa.style.visibility = 'hidden';
    }
    if (overlay) {
      overlay.classList.add('libro-abierto');
    }
    if (timerCierre) {
      clearTimeout(timerCierre);
      timerCierre = 0;
    }
    timerCierre = window.setTimeout(function () {
      if (overlay) {
        overlay.classList.add('oculto');
      }
      window.dispatchEvent(new CustomEvent('convite:capa-abierta'));
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('scroll'));
      timerCierre = 0;
    }, 1200);
  }

  function animarA(destino, tipo) {
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    var delta = Math.abs(destino - progress);
    var duracion;
    var easing;

    if (tipo === 'full') {
      duracion = 2850;
      easing = 'cubic-bezier(.42, 0, .16, 1)';
    } else if (tipo === 'open') {
      duracion = clamp(900 + delta * 1600, 900, 2400);
      easing = 'cubic-bezier(.42, 0, .16, 1)';
    } else {
      duracion = clamp(400 + delta * 450, 400, 800);
      easing = 'cubic-bezier(.22, .61, .36, 1)';
    }

    if (tapa) {
      if (tipo === 'close') {
        tapa.style.transition = [
          'transform ' + duracion + 'ms ' + easing,
          'opacity ' + duracion + 'ms ease-out'
        ].join(', ');
      } else {
        var retraso = Math.round(duracion * 0.82);
        tapa.style.transition = [
          'transform ' + duracion + 'ms ' + easing,
          'opacity ' + (duracion - retraso) + 'ms ease-out ' + retraso + 'ms',
          'filter ' + duracion + 'ms ease-in-out'
        ].join(', ');
      }
    }

    if (interior) {
      if (tipo === 'close') {
        interior.style.transition = [
          'opacity 220ms ease-out',
          'transform 220ms ease-out'
        ].join(', ');
      } else {
        var duracionRevelado = Math.max(350, Math.round(duracion * 0.22));
        var retrasoRevelado = Math.round(duracion * 0.72);
        interior.style.transition = [
          'opacity ' + duracionRevelado + 'ms ease-out ' + retrasoRevelado + 'ms',
          'transform ' + duracionRevelado + 'ms ease-out ' + retrasoRevelado + 'ms'
        ].join(', ');
      }
    }

    window.requestAnimationFrame(function () {
      aplicarProgress(destino);
    });

    if (tipo === 'close') {
      window.setTimeout(function () {
        if (!animando && tapa) {
          tapa.style.transition = 'none';
        }
      }, duracion + 50);
      return;
    }

    animando = true;
    timerApertura = window.setTimeout(terminar, duracion + 250);
  }

  function alSoltar(evento) {
    if (pointerId !== evento.pointerId) {
      return;
    }
    arrastrando = false;
    if (tapa) {
      tapa.classList.remove('arrastrando');
    }
    if (raf) {
      window.cancelAnimationFrame(raf);
      raf = 0;
    }
    try {
      if (evento.currentTarget.hasPointerCapture(evento.pointerId)) {
        evento.currentTarget.releasePointerCapture(evento.pointerId);
      }
    } catch (e) {}
    pointerId = null;
    if (animando) {
      return;
    }

    var actual = progress;
    var impulso = velocidad < -0.35 && actual > 0.06;
    var avanzado = actual >= 0.3;

    if (!movido) {
      animarA(1, 'full');
    } else if (impulso || avanzado) {
      animarA(1, 'open');
    } else {
      animarA(0, 'close');
    }
  }

  function alMover(evento) {
    if (pointerId !== evento.pointerId || animando) {
      return;
    }
    var ahora = performance.now();
    var transcurrido = Math.max(1, ahora - anteriorT);
    velocidad = (evento.clientX - anteriorX) / transcurrido;
    anteriorX = evento.clientX;
    anteriorT = ahora;

    var recorrido = inicioX - evento.clientX;
    if (Math.abs(recorrido) > 6) {
      movido = true;
    }

    var caja = escena ? escena.getBoundingClientRect() : null;
    var distancia = caja ? Math.max(180, caja.width * 0.72) : Math.max(220, window.innerWidth * 0.72);
    var valor = Math.max(0, recorrido) / distancia;

    progress = clamp(valor, 0, 1);
    if (!raf) {
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        aplicarProgress(progress);
      });
    }
  }

  function alPresionar(evento) {
    if (animando || abierto || evento.button > 0) {
      return;
    }
    arrastrando = true;
    movido = false;
    pointerId = evento.pointerId;
    inicioX = evento.clientX;
    anteriorX = evento.clientX;
    anteriorT = performance.now();
    velocidad = 0;
    if (tapa) {
      tapa.style.transition = 'none';
      tapa.classList.add('arrastrando');
    }
    if (interior) {
      interior.style.transition = 'none';
    }
    try {
      evento.currentTarget.setPointerCapture(evento.pointerId);
    } catch (e) {}
  }

  function alCancelar(evento) {
    if (pointerId !== evento.pointerId) {
      return;
    }
    arrastrando = false;
    if (tapa) {
      tapa.classList.remove('arrastrando');
    }
    pointerId = null;
    if (!animando) {
      animarA(0, 'close');
    }
  }

  function alTeclado(evento) {
    if (evento.key !== 'ArrowLeft' && evento.key !== 'Enter' && evento.key !== ' ') {
      return;
    }
    evento.preventDefault();
    if (!animando && !abierto) {
      animarA(1, 'full');
    }
  }

  function crearPetalos() {
    if (!overlay || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    var cantidad = window.innerWidth < 480 ? 10 : 16;
    for (var i = 0; i < cantidad; i++) {
      var petalo = document.createElement('span');
      petalo.className = 'libro-petalo';
      petalo.style.left = (Math.random() * 100).toFixed(2) + '%';
      petalo.style.animationDuration = (9 + Math.random() * 8).toFixed(2) + 's';
      petalo.style.animationDelay = (-Math.random() * 12).toFixed(2) + 's';
      petalo.style.transform = 'scale(' + (0.5 + Math.random() * 0.9).toFixed(2) + ')';
      overlay.appendChild(petalo);
    }
  }

  function preparar() {
    overlay = document.getElementById('bienvenida-libro');
    if (!overlay) {
      estado.activo = false;
      return;
    }
    escena = overlay.querySelector('.libro-escena');
    tapa = overlay.querySelector('.libro-tapa');
    interior = overlay.querySelector('.libro-interior');
    pista = overlay.querySelector('.libro-pista');

    crearPetalos();
    aplicarProgress(0);

    if (escena) {
      escena.addEventListener('pointerdown', alPresionar);
      escena.addEventListener('pointermove', alMover);
      escena.addEventListener('pointerup', alSoltar);
      escena.addEventListener('pointercancel', alCancelar);
      escena.addEventListener('keydown', alTeclado);
    }

    estado.reabrir = function () {
      if (!overlay) {
        return;
      }
      if (timerCierre) {
        clearTimeout(timerCierre);
        timerCierre = 0;
      }
      abierto = false;
      animando = false;
      if (tapa) {
        tapa.style.visibility = 'visible';
        tapa.classList.remove('arrastrando');
      }
      overlay.classList.remove('oculto', 'libro-abierto');
      if (interior) {
        interior.style.transition = 'none';
      }
      aplicarProgress(0);
      if (pista) {
        pista.style.display = 'none';
      }
      window.setTimeout(function () {
        animarA(1, 'full');
      }, 420);
    };

    if (autoAbrir) {
      var espera = window.setTimeout(function () {
        if (!abierto && !animando) {
          animarA(1, 'full');
        }
      }, 1800);
      window.addEventListener('load', function () {
        window.clearTimeout(espera);
        window.setTimeout(function () {
          if (!abierto && !animando) {
            animarA(1, 'full');
          }
        }, 900);
      });
    }
  }

  window.addEventListener('message', function (evento) {
    var datos = evento.data;
    if (datos && datos.type === 'abrir-libro') {
      estado.reabrir();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', preparar);
  } else {
    preparar();
  }
})();
