/**
 * Drop-in sustituto de AddEvent ATC para FULL + calendar_links_own.
 * Lee spans .start/.end/.timezone/.title y pide links al endpoint PHP.
 */
(function (window, document) {
  'use strict';

  var MENU_ITEMS = [
    { key: 'ics', label: 'Apple Calendar', cls: 'ateappleical', open: 'ics' },
    { key: 'google', label: 'Google <em>(online)</em>', cls: 'ategoogle', open: 'url' },
    { key: 'office365', label: 'Office 365 <em>(online)</em>', cls: 'ateoffice365', open: 'url' },
    { key: 'ics', label: 'Outlook', cls: 'ateoutlook', open: 'ics' },
    { key: 'outlook', label: 'Outlook.com <em>(online)</em>', cls: 'ateoutlookcom', open: 'url' },
    { key: 'yahoo', label: 'Yahoo <em>(online)</em>', cls: 'ateyahoo', open: 'url' }
  ];

  var openMenuEl = null;
  var pending = false;

  function textOf(el, selector) {
    var node = el.querySelector(selector);
    return node ? String(node.textContent || '').trim() : '';
  }

  function endpointUrl() {
    if (typeof window._pathApp === 'string' && window._pathApp) {
      return window._pathApp + 'producto/fetchs/calendar-links.php';
    }
    return '/producto/fetchs/calendar-links.php';
  }

  function closeMenus() {
    var menus = document.querySelectorAll('.addeventatc_dropdown.fd-calendar-menu');
    for (var i = 0; i < menus.length; i++) {
      menus[i].style.display = 'none';
      menus[i].classList.remove('addeventatc-selected');
    }
    var selectedBtns = document.querySelectorAll('.addeventatc.addeventatc-selected');
    for (var b = 0; b < selectedBtns.length; b++) {
      selectedBtns[b].classList.remove('addeventatc-selected');
    }
    openMenuEl = null;
  }

  function ensureMenu(btn) {
    var menu = btn.querySelector('.addeventatc_dropdown.fd-calendar-menu');
    if (menu) {
      return menu;
    }
    menu = document.createElement('div');
    menu.className = 'addeventatc_dropdown fd-calendar-menu';
    menu.setAttribute('role', 'menu');
    menu.style.display = 'none';

    for (var i = 0; i < MENU_ITEMS.length; i++) {
      var item = MENU_ITEMS[i];
      var span = document.createElement('span');
      span.className = item.cls;
      span.setAttribute('role', 'menuitem');
      span.setAttribute('data-link-key', item.key);
      span.setAttribute('data-open-mode', item.open);
      span.innerHTML = item.label;
      menu.appendChild(span);
    }

    btn.appendChild(menu);
    return menu;
  }

  function isIosDevice() {
    var ua = window.navigator.userAgent || '';
    if (/iPad|iPhone|iPod/i.test(ua)) {
      return true;
    }
    var platform = window.navigator.platform || '';
    var maxTouch = window.navigator.maxTouchPoints || 0;
    return platform === 'MacIntel' && maxTouch > 1;
  }

  function openProvider(mode, url) {
    if (!url) {
      return;
    }
    if (mode === 'ics') {
      // iOS: navegar al .ics HTTP (sin download). El botón Agendar es <a>,
      // no se usan <a> internos para no anidar anchors.
      if (isIosDevice()) {
        window.location.href = url;
        return;
      }
      var a = document.createElement('a');
      a.href = url;
      a.setAttribute('download', 'evento.ics');
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  function bindMenuClicks(menu, links) {
    var spans = menu.querySelectorAll('[data-link-key]');
    for (var i = 0; i < spans.length; i++) {
      (function (span) {
        span.onclick = function (ev) {
          ev.preventDefault();
          ev.stopPropagation();
          var key = span.getAttribute('data-link-key');
          var mode = span.getAttribute('data-open-mode') || 'url';
          openProvider(mode, links[key]);
          closeMenus();
        };
      })(spans[i]);
    }
  }

  function showMenu(btn, links) {
    closeMenus();
    var menu = ensureMenu(btn);
    bindMenuClicks(menu, links);
    btn.classList.add('addeventatc-selected');
    menu.style.display = 'block';
    menu.classList.add('addeventatc-selected');
    openMenuEl = menu;
  }

  function fetchLinks(payload) {
    return fetch(endpointUrl(), {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      return res.json().then(function (body) {
        return { ok: res.ok, body: body };
      });
    });
  }

  function onButtonClick(ev) {
    ev.preventDefault();
    ev.stopPropagation();

    var btn = ev.currentTarget;
    if (pending) {
      return;
    }

    var start = textOf(btn, '.start');
    var end = textOf(btn, '.end');
    var timezone = textOf(btn, '.timezone');
    var title = textOf(btn, '.title');
    var location = textOf(btn, '.location');
    var description = textOf(btn, '.description');

    if (!start || !end || !timezone || !title) {
      return;
    }

    pending = true;
    btn.classList.add('addeventatc-selected');

    fetchLinks({
      start: start,
      end: end,
      timezone: timezone,
      title: title,
      location: location,
      description: description
    })
      .then(function (result) {
        pending = false;
        if (!result.ok || !result.body || result.body.error || !result.body.data) {
          btn.classList.remove('addeventatc-selected');
          return;
        }
        showMenu(btn, result.body.data);
      })
      .catch(function () {
        pending = false;
        btn.classList.remove('addeventatc-selected');
      });
  }

  var HIDDEN_SPAN_SELECTORS = [
    '.start', '.end', '.timezone', '.title', '.description', '.location',
    '.organizer', '.organizer_email', '.facebook_event', '.all_day_event',
    '.date_format', '.alarm_reminder', '.recurring', '.attendees',
    '.calname', '.uid', '.sequence', '.status', '.method', '.client', '.transp'
  ];

  function hideDataSpans(btn) {
    for (var i = 0; i < HIDDEN_SPAN_SELECTORS.length; i++) {
      var nodes = btn.querySelectorAll(HIDDEN_SPAN_SELECTORS[i]);
      for (var j = 0; j < nodes.length; j++) {
        nodes[j].style.display = 'none';
      }
    }
  }

  function init() {
    var buttons = document.querySelectorAll('.addeventatc');
    for (var i = 0; i < buttons.length; i++) {
      hideDataSpans(buttons[i]);
      buttons[i].addEventListener('click', onButtonClick);
    }

    document.addEventListener('click', function (ev) {
      if (!openMenuEl) {
        return;
      }
      if (openMenuEl.contains(ev.target)) {
        return;
      }
      var parentBtn = openMenuEl.parentElement;
      if (parentBtn && parentBtn.contains(ev.target)) {
        return;
      }
      closeMenus();
      var selected = document.querySelectorAll('.addeventatc.addeventatc-selected');
      for (var j = 0; j < selected.length; j++) {
        selected[j].classList.remove('addeventatc-selected');
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window, document);
