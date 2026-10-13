// App de seguimiento de visita técnica (SullairGo · Proyecto STAR).
// Una sola pantalla responsive: en el celular es la app a pantalla completa y
// en desktop el layout ancho con el mapa protagonista. El escenario sale de la
// URL (/escenarios/<id>) y los datos de app/data.js.
(function () {
  "use strict";

  var D = window.STAR;
  var root = document.getElementById("app");
  var requested = decodeURIComponent(location.pathname.replace(/\/+$/, "").split("/").pop() || "");
  var sc =
    D.SCENARIOS.filter(function (s) {
      return s.id.toLowerCase() === requested.toLowerCase();
    })[0] || D.SCENARIOS[0];
  var agenda = sc.kind === "agenda";
  window.STAR_ACTUAL = sc; // lo usa comentarios.js

  // ── Íconos (trazos del board) ─────────────────────────────
  var ICONS = {
    nav: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3 11l19-9-9 19-2-8-8-2z"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a4 4 0 0 0-5.6 5.6L3 18l3 3 6.1-6.1a4 4 0 0 0 5.6-5.6l-2.7 2.7-2.3-.4-.4-2.3 2.4-2.7Z"/></svg>',
    done: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8.5 12.5l2.3 2.3 4.7-4.8"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><path d="M8.5 15l2.3 2.3L15.5 13"/></svg>',
    calendarX: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><path d="M10 13.5l4 4M14 13.5l-4 4"/></svg>',
    calendarLock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4.5" width="18" height="16" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/><rect x="9" y="14" width="6" height="4.5" rx="1"/><path d="M10.5 14v-1a1.5 1.5 0 0 1 3 0v1"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v4h-4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-11"/></svg>',
    air: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.8 19.6A2 2 0 1 0 14 16H2"/><path d="M17.5 8a2.5 2.5 0 1 1 2 4H2"/><path d="M9.8 4.4A2 2 0 1 1 11 8H2"/></svg>',
    power: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
    lift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20V7"/><path d="m6 12 6-6 6 6"/><path d="M5 4h14"/></svg>',
    truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V9l8-5 8 5v11z"/><path d="M9 20v-5h6v5"/></svg>',
    expand: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
    grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/></svg>',
  };
  function icon(name, cls) {
    return '<span class="ico' + (cls ? " " + cls : "") + '">' + ICONS[name] + "</span>";
  }
  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function $(sel, ctx) {
    return (ctx || document).querySelector(sel);
  }
  function isMobile() {
    return window.matchMedia("(max-width: 767px)").matches;
  }

  // ── Fechas (escenarios de agenda) ─────────────────────────
  var MAX = 2;
  // Espacios no separables: las franjas y fechas no se cortan en dos renglones.
  var SLOTS = { manana: "9\u00a0a\u00a012\u00a0h", tarde: "14\u00a0a\u00a017\u00a0h" };
  // Franjas elegidas por el cliente: una o ambas (al menos una).
  function slotsLabel(slots) {
    return slots.length > 1 ? "9\u00a0a\u00a017\u00a0h" : SLOTS[slots[0]];
  }
  var DATE_OPTIONS = 6;
  var weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long" });
  var dayMonth = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });
  function parse(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function toIso(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function nextBusinessDay(d) {
    var n = new Date(d);
    do n.setDate(n.getDate() + 1);
    while (n.getDay() === 0 || n.getDay() === 6);
    return n;
  }
  function capitalize(t) {
    return t.charAt(0).toUpperCase() + t.slice(1);
  }
  function day(d) {
    return weekday.format(d) + " " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  }
  var weekdayShort = new Intl.DateTimeFormat("es-AR", { weekday: "short" });
  // "vie 16/10, lun 19/10 o mar 20/10"
  function daysList(isoDates) {
    var items = isoDates.map(function (iso) {
      var d = parse(iso);
      return weekdayShort.format(d).replace(".", "") + "\u00a0" + pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
    });
    return items.length > 1 ? items.slice(0, -1).join(", ") + " o " + items[items.length - 1] : items[0];
  }

  // ── Estado de agenda (R1–R5) ──────────────────────────────
  var storageKey = "star-escenario-" + sc.id;
  var state = agenda ? loadState() : null;
  var flash = null;

  function loadState() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(storageKey));
      var validSlots = saved && Array.isArray(saved.slots) && saved.slots.length && saved.slots.every(function (k) { return SLOTS[k]; });
      if (validSlots && typeof saved.used === "number" && saved.date && saved.status) return saved;
    } catch (e) {}
    return Object.assign({}, sc.state);
  }
  function saveState() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {}
  }

  // ── Contenido según escenario ─────────────────────────────
  var STATUS_BADGE = {
    pendiente: ["info", "Pendiente", false],
    "en-curso": ["warning", "En curso", true],
    terminado: ["success", "Terminado", true],
    programado: ["info", "Programado", false],
    "a-confirmar": ["warning", "A confirmar", true],
    reprogramado: ["info", "Reprogramado", false],
    definitivo: ["info", "Fecha definitiva", false],
    cancelado: ["neutral", "Cancelado", false],
  };
  function badge(status) {
    var b = STATUS_BADGE[status];
    return '<span class="sgo-badge sgo-badge--' + b[0] + '">' + (b[2] ? '<span class="sgo-badge__dot"></span>' : "") + b[1] + "</span>";
  }

  function summaryData() {
    var site = D.SITE.name + " · " + D.SITE.city;
    var tech = D.TECH.name + " · " + D.TECH.role;
    var avatar = '<span class="avatar">' + D.TECH.initials + "</span>";
    if (!agenda) {
      var n = sc.equipos.length;
      var equipos = n + (n === 1 ? " equipo" : " equipos");
      if (sc.status === "en-camino")
        return {
          icon: "nav",
          eyebrow: "Seguimiento de visita · " + equipos,
          title: "Técnico en camino",
          chip: "Técnico en camino",
          facts: [
            { icon: "clock", label: "Llegada estimada", value: sc.eta },
            { icon: "pin", label: "Ubicación", value: site },
            { avatar: avatar, label: "Técnico asignado", value: tech },
          ],
        };
      if (sc.status === "en-sitio")
        return {
          icon: "wrench",
          eyebrow: "En sitio · " + equipos,
          title: "Intervención en curso",
          subtitle: sc.since,
          chip: "Intervención en curso",
          facts: [
            { icon: "pin", label: "Ubicación", value: site },
            { avatar: avatar, label: "Técnico asignado", value: tech },
          ],
        };
      return {
        icon: "done",
        eyebrow: "Visita completada · " + equipos,
        title: "Visita finalizada",
        subtitle: sc.finished,
        chip: "Finalizada",
        facts: [
          { icon: "pin", label: "Ubicación", value: site },
          { avatar: avatar, label: "Técnico", value: tech },
        ],
      };
    }
    var date = parse(state.date);
    var titles = {
      programada: ["calendar", "Visita programada"],
      reprogramada: ["calendar", "Visita reprogramada"],
      "dia-siguiente": ["calendarLock", "Fecha definitiva"],
      "cancelada-sullair": ["calendarX", "Visita cancelada"],
    };
    var t = state.pending ? ["calendar", "Nueva fecha a confirmar"] : titles[state.status];
    var when = state.pending ? "A confirmar: " + daysList(state.pending) : capitalize(day(date));
    return {
      icon: t[0],
      eyebrow: "Mantenimiento preventivo · 1 equipo",
      title: t[1],
      chip: t[1],
      facts: [
        {
          icon: "clock",
          label: "Fecha",
          value: when + " · " + slotsLabel(state.slots),
          cls: state.status === "cancelada-sullair" ? "is-cancelled" : "",
          bind: "visit-date",
        },
        { icon: "pin", label: "Ubicación", value: site },
        { avatar: avatar, label: "Técnico asignado", value: tech },
      ],
    };
  }

  function summaryHTML(s, variant) {
    var facts = s.facts
      .map(function (f) {
        return (
          '<div class="fact">' +
          (f.avatar || icon(f.icon)) +
          "<div><dt>" + esc(f.label) + "</dt><dd" + (f.cls ? ' class="' + f.cls + '"' : "") + (f.bind ? ' data-bind="' + f.bind + '"' : "") + ">" + esc(f.value) + "</dd></div></div>"
        );
      })
      .join("");
    return (
      '<div class="summary__head">' +
      '<span class="summary__icon">' + ICONS[s.icon] + "</span>" +
      '<div><p class="summary__eyebrow">' + esc(s.eyebrow) + "</p>" +
      "<h1 class=\"summary__title\">" + esc(s.title) + "</h1>" +
      (s.subtitle ? '<p class="summary__subtitle">' + esc(s.subtitle) + "</p>" : "") +
      "</div></div>" +
      '<dl class="facts facts--' + variant + '">' + facts + "</dl>"
    );
  }

  function equipmentHTML() {
    var list = agenda ? [Object.assign({}, D.EQUIPOS.compresor, { status: agendaBadge() })] : sc.equipos;
    var compact = !agenda && sc.status === "finalizada";
    var title = compact ? "Equipos atendidos" : list.length === 1 ? "Equipo a revisar" : "Equipos en esta visita";
    var counts = "";
    if (!agenda && sc.status === "en-sitio") {
      var c = { terminado: 0, "en-curso": 0, pendiente: 0 };
      list.forEach(function (e) {
        c[e.status]++;
      });
      counts =
        '<p class="counts">' +
        '<span><i class="dot dot--success"></i>' + c.terminado + " listo</span>" +
        '<span><i class="dot dot--warning"></i>' + c["en-curso"] + " en curso</span>" +
        '<span><i class="dot dot--muted"></i>' + c.pendiente + " pendiente</span></p>";
    }
    var items = list
      .map(function (e) {
        if (compact)
          return (
            '<li class="equip-row">' +
            '<span class="equip__icon equip__icon--sm">' + ICONS[e.icon] + "</span>" +
            '<div class="equip-row__text"><strong>' + esc(e.name) + "</strong><span>" + esc(e.service + " · " + e.model + " · " + e.internal) + "</span></div>" +
            badge(e.status) +
            "</li>"
          );
        return (
          '<li class="equip' + (e.status === "en-curso" ? " equip--active" : "") + '">' +
          '<div class="equip__head">' +
          '<span class="equip__icon">' + ICONS[e.icon] + "</span>" +
          '<div class="equip__name"><span class="label">' + esc(e.type) + "</span><strong>" + esc(e.name) + "</strong></div>" +
          badge(e.status) +
          "</div>" +
          '<dl class="specs">' +
          '<div><dt class="label">Modelo</dt><dd>' + esc(e.model) + "</dd></div>" +
          '<div><dt class="label">N° serie</dt><dd>' + esc(e.serial) + "</dd></div>" +
          '<div><dt class="label">N° interno</dt><dd>' + esc(e.internal) + "</dd></div>" +
          "</dl>" +
          '<div class="service"><div><span class="label">Servicio</span>' + esc(e.service) + "</div>" +
          (e.detail ? '<button type="button" class="service__info" aria-label="Qué incluye el servicio" data-tip="' + esc(e.detail) + '">' + ICONS.info + "</button>" : "") +
          "</div></li>"
        );
      })
      .join("");
    return '<h2 class="section-title">' + title + "</h2>" + counts + '<ul class="' + (compact ? "equip-list equip-list--compact" : "equip-list") + '">' + items + "</ul>";
  }

  function agendaBadge() {
    if (state.pending) return "a-confirmar";
    return { programada: "programado", reprogramada: "reprogramado", "dia-siguiente": "definitivo", "cancelada-sullair": "cancelado" }[state.status];
  }

  function noticesHTML() {
    var out = "";
    if (!agenda) {
      if (sc.status === "finalizada")
        out += '<div class="notice notice--success">' + icon("done") + "<div><strong>Todo listo</strong><span>Se cerraron las intervenciones de los " + sc.equipos.length + " equipos.</span></div></div>";
      return out;
    }
    if (state.pending)
      out +=
        '<div class="notice notice--info" role="status">' + icon("clock") +
        "<div><strong>Recibimos tu disponibilidad</strong><span>Elegimos el día y la franja entre las opciones que marcaste y te confirmamos por WhatsApp.</span></div></div>";
    if (flash) out += '<div class="notice notice--success" role="status">' + icon("done") + "<div><strong>" + esc(flash.title) + "</strong><span>" + esc(flash.text) + "</span></div></div>";
    var date = parse(state.date);
    if (state.status === "dia-siguiente")
      out +=
        '<div class="notice notice--info">' + icon("lock") +
        "<div><strong>Pasó al día hábil siguiente</strong><span>Cancelaste después de usar las 2 reprogramaciones, así que la visita quedó para el <b>" +
        day(date) + "</b>. Esta fecha ya no se puede cambiar.</span></div></div>";
    if (state.status === "cancelada-sullair")
      out +=
        '<div class="cancelled">' +
        "<strong>Tuvimos que cancelar tu visita</strong>" +
        "<p>Surgió un imprevisto en la agenda del técnico y no vamos a poder ir el <b>" + day(date) + "</b>. Disculpá las molestias.</p>" +
        '<button type="button" class="sgo-btn sgo-btn--primary sgo-btn--lg" data-action="choose-date">Elegir nueva fecha</button>' +
        '<span class="cancelled__hint">Este cambio no cuenta como reprogramación.</span></div>';
    return out;
  }

  function checklistHTML() {
    if (!agenda || state.status === "cancelada-sullair") return "";
    return (
      '<h2 class="section-title">Antes de la visita</h2><ul class="checklist">' +
      "<li>Acceso a planta autorizado para el técnico</li>" +
      "<li>Equipo detenido al menos 30 min antes</li>" +
      "<li>Un responsable en sitio para firmar el remito</li></ul>"
    );
  }

  function footerHTML() {
    if (!agenda || state.status === "cancelada-sullair") return "";
    if (state.status === "dia-siguiente") return "<p>Esta visita ya no admite cambios. Para otra modificación, contactá a tu ejecutivo de cuenta.</p>";
    if (state.pending) return "<p>Te confirmamos la nueva fecha en unos minutos.</p>";
    var text, action;
    if (state.used === 0) {
      text = "¿No pueden recibirnos ese día?";
      action = "Reprogramar visita";
    } else if (state.used < MAX) {
      text = "Te queda " + (MAX - state.used) + " reprogramación ·";
      action = "Reprogramar visita";
    } else {
      text = "Ya usaste las " + MAX + " reprogramaciones ·";
      action = "Cancelar visita";
    }
    return "<p>" + esc(text) + ' <button type="button" class="link" data-action="request">' + action + "</button></p>";
  }

  function ctaHTML() {
    if (agenda || !sc.cta) return "";
    return (
      '<div class="cta__icon">' + ICONS.users + "</div>" +
      '<div class="cta__text"><strong>' + esc(sc.cta.title) + "</strong><span>" + esc(sc.cta.text) + "</span></div>" +
      '<a class="sgo-btn sgo-btn--primary sgo-btn--lg" href="#" data-action="noop">' + esc(sc.cta.action) + "</a>"
    );
  }

  // ── Esqueleto ─────────────────────────────────────────────
  var minutesAgo = 4;
  function updatedLabel() {
    if (!sc.updated) return sc.status === "finalizada" ? "Finalizada" : "";
    return "Actualizado hace " + minutesAgo + " min";
  }

  root.className = "app app--" + (agenda ? "agenda" : sc.status);
  root.innerHTML =
    '<header class="app-bar">' +
    '<img class="app-bar__logo" src="/assets/img/sullairgo-logo.jpg" alt="SullairGo">' +
    '<div class="app-bar__right"><span class="app-bar__chip" data-slot="chip"></span>' +
    '<span class="app-bar__updated" data-slot="updated"></span></div>' +
    "</header>" +
    '<section class="hero" data-slot="hero"></section>' +
    '<main class="layout">' +
    '<div class="layout__map">' +
    '<section class="map-block" aria-label="Mapa">' +
    '<div class="map" id="map"></div>' +
    '<div class="map__chip" data-slot="map-chip"></div>' +
    '<div class="map__legend" data-slot="map-legend"></div>' +
    '<button type="button" class="map__expand" data-action="expand-map" aria-label="Ampliar mapa">' + ICONS.expand + "</button>" +
    '<button type="button" class="map__close" data-action="close-map" aria-label="Cerrar mapa">' + ICONS.close + "</button>" +
    "</section>" +
    '<p class="map__caption" data-slot="map-caption"></p>' +
    "</div>" +
    '<div class="layout__side">' +
    '<section class="card summary-card" data-slot="summary"></section>' +
    '<section class="notices" data-slot="notices"></section>' +
    '<section class="equipment" data-slot="equipment"></section>' +
    '<section class="checklist-block" data-slot="checklist"></section>' +
    '<footer class="reschedule" data-slot="footer"></footer>' +
    "</div>" +
    '<section class="cta" data-slot="cta"></section>' +
    "</main>" +
    '<p class="app-footer">Sullair Argentina · Seguimiento de visita</p>';

  function slot(name) {
    return root.querySelector('[data-slot="' + name + '"]');
  }

  function paint() {
    var s = summaryData();
    slot("chip").innerHTML = icon(s.icon) + esc(s.chip);
    var updated = updatedLabel();
    slot("updated").innerHTML = updated ? icon(sc.updated ? "refresh" : "done") + esc(updated) : "";
    slot("updated").hidden = !updated;
    slot("hero").innerHTML = summaryHTML(s, "hero");
    slot("summary").innerHTML = summaryHTML(s, "card");
    slot("notices").innerHTML = noticesHTML();
    slot("notices").hidden = !slot("notices").innerHTML;
    slot("equipment").innerHTML = equipmentHTML();
    slot("checklist").innerHTML = checklistHTML();
    slot("checklist").hidden = !slot("checklist").innerHTML;
    slot("footer").innerHTML = footerHTML();
    slot("footer").hidden = !slot("footer").innerHTML;
    slot("cta").innerHTML = ctaHTML();
    slot("cta").hidden = !slot("cta").innerHTML;
    root.classList.toggle("is-cancelled", agenda && state.status === "cancelada-sullair");
    paintMapOverlays();
    paintDemoState();
  }

  // ── Mapa real (Leaflet + OpenStreetMap) ───────────────────
  var map = null;
  var routeInfo = null;
  var site = [D.SITE.lat, D.SITE.lng];

  function markerIcon(kind) {
    if (kind === "plant")
      return L.divIcon({
        className: "marker",
        html: '<span class="marker-plant">' + ICONS.building + "</span>",
        iconSize: [44, 54],
        iconAnchor: [22, 52],
      });
    return L.divIcon({
      className: "marker",
      html: '<span class="marker-tech"><span class="marker-tech__ping"></span><span class="marker-tech__dot">' + ICONS.truck + "</span></span>",
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  }

  function initMap() {
    if (!window.L) return;
    map = L.map("map", {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: !isMobile(),
      tap: false,
      attributionControl: true,
    });
    // Teselas estándar de OpenStreetMap: no piden clave (CARTO pasó a exigirla).
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    if (!isMobile()) map.zoomControl = L.control.zoom({ position: "topright" }).addTo(map);

    L.marker(site, { icon: markerIcon("plant"), keyboard: false, title: D.SITE.name }).addTo(map);

    if (!agenda && sc.status === "en-camino") {
      var tech = [sc.tech.lat, sc.tech.lng];
      L.marker(tech, { icon: markerIcon("tech"), keyboard: false, title: D.TECH.name, zIndexOffset: 500 }).addTo(map);
      map.fitBounds(L.latLngBounds([tech, site]), { padding: [56, 56] });
      loadRoute(tech, site).then(function (route) {
        routeInfo = route;
        L.polyline(route.coords, { color: "#ffffff", weight: 9, opacity: 0.9, lineCap: "round", lineJoin: "round" }).addTo(map);
        L.polyline(route.coords, { color: "#025157", weight: 5, opacity: 1, lineCap: "round", lineJoin: "round", dashArray: "2 10", className: "route-line" }).addTo(map);
        map.fitBounds(L.latLngBounds(route.coords), { padding: isMobile() ? [64, 40] : [72, 72] });
        paintMapOverlays();
      });
    } else if (!agenda && sc.status === "en-sitio") {
      L.marker([D.SITE.lat - 0.0012, D.SITE.lng + 0.0016], { icon: markerIcon("tech"), keyboard: false, title: D.TECH.name, zIndexOffset: 500 }).addTo(map);
      map.setView(site, 16);
    } else {
      map.setView(site, 15);
    }
  }

  // Recorrido por calles reales (servicio público de OSRM). Si no responde, línea directa.
  function loadRoute(from, to) {
    var key = "star-ruta-" + from.join(",") + "-" + to.join(",");
    try {
      var cached = JSON.parse(sessionStorage.getItem(key));
      if (cached && cached.coords) return Promise.resolve(cached);
    } catch (e) {}
    var url =
      "https://router.project-osrm.org/route/v1/driving/" +
      from[1] + "," + from[0] + ";" + to[1] + "," + to[0] +
      "?overview=full&geometries=geojson";
    var timeout = new Promise(function (_, reject) {
      setTimeout(function () {
        reject(new Error("timeout"));
      }, 5000);
    });
    return Promise.race([fetch(url).then(function (r) { return r.json(); }), timeout])
      .then(function (data) {
        var r = data.routes[0];
        var route = {
          coords: r.geometry.coordinates.map(function (c) { return [c[1], c[0]]; }),
          meters: r.distance,
        };
        try {
          sessionStorage.setItem(key, JSON.stringify(route));
        } catch (e) {}
        return route;
      })
      .catch(function () {
        return { coords: [from, to], meters: L.latLng(from).distanceTo(to) * 1.25 };
      });
  }

  function distanceLabel(meters) {
    if (meters < 1000) return Math.round(meters / 10) * 10 + " m";
    return (Math.round(meters / 100) / 10).toLocaleString("es-AR") + " km";
  }

  function paintMapOverlays() {
    var chip = "";
    var legend = "";
    var caption = "";
    if (!agenda && sc.status === "en-camino") {
      chip = '<i class="dot dot--accent"></i>' + (routeInfo ? "A ≈ " + distanceLabel(routeInfo.meters) + " de tu planta" : "Calculando distancia…");
      legend = '<span><i class="dot dot--accent"></i>' + esc(D.TECH.short) + ' (técnico)</span><span><i class="dot dot--brand"></i>Tu planta</span>';
      caption = icon("refresh") + "La ubicación se actualiza cada ~10 min · las distancias pasan a metros al acercarse";
    } else if (!agenda && sc.status === "en-sitio") {
      chip = icon("check", "ico--success") + "Técnico en tu planta";
    } else if (!agenda) {
      chip = icon("done", "ico--success") + "Visita finalizada";
    } else {
      chip = icon("pin") + esc(D.SITE.name + " · " + D.SITE.city);
    }
    slot("map-chip").innerHTML = chip;
    slot("map-legend").innerHTML = legend;
    slot("map-legend").hidden = !legend;
    slot("map-caption").innerHTML = caption;
    slot("map-caption").hidden = !caption;
  }

  function setMapExpanded(expanded) {
    var block = $(".map-block", root);
    block.classList.toggle("is-expanded", expanded);
    document.body.classList.toggle("no-scroll", expanded);
    if (map) {
      map.invalidateSize();
      if (expanded) {
        map.dragging.enable();
        if (!map.zoomControl) map.zoomControl = L.control.zoom({ position: "topright" }).addTo(map);
      } else if (isMobile()) {
        map.dragging.disable();
        if (map.zoomControl && map.zoomControl._map) map.removeControl(map.zoomControl);
        map.zoomControl = null;
      }
    }
  }

  // ── Reprogramación: modal de aviso y hoja de nueva fecha ──
  var sheetMode = null;
  var opener = null;
  var overlays = document.createElement("div");
  overlays.innerHTML =
    '<div class="overlay" data-el="overlay" hidden></div>' +
    '<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-body" data-el="modal" hidden>' +
    '<span class="modal__icon">' + ICONS.warning + "</span>" +
    '<h2 id="modal-title" data-el="modal-title"></h2>' +
    '<div id="modal-body" class="modal__body" data-el="modal-body"></div>' +
    '<span class="quota" data-el="modal-quota"><span class="quota__dots" aria-hidden="true"><i></i><i></i></span><span data-el="modal-quota-text"></span></span>' +
    '<div class="modal__actions">' +
    '<button type="button" class="sgo-btn sgo-btn--primary sgo-btn--lg" data-action="close">Mantener la fecha</button>' +
    '<button type="button" class="sgo-btn sgo-btn--ghost sgo-btn--md" data-action="continue" data-el="modal-continue"></button>' +
    "</div></div>" +
    '<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-title" data-el="sheet" hidden>' +
    '<span class="sheet__handle" aria-hidden="true"></span>' +
    '<form data-el="form">' +
    '<div class="sheet__head"><h2 id="sheet-title" data-el="sheet-title"></h2>' +
    '<span class="quota" data-el="sheet-quota"><span class="quota__dots" aria-hidden="true"><i></i><i></i></span><span data-el="sheet-quota-text"></span></span></div>' +
    '<fieldset class="field" data-step="choose" aria-describedby="dates-hint"><legend>Días posibles</legend><div class="options options--dates" data-el="date-options"></div>' +
    '<p class="field__hint" id="dates-hint" data-el="dates-hint"></p></fieldset>' +
    '<div class="notice notice--warning" data-step="forced" hidden>' + icon("calendar") + '<span>La visita pasa al <strong data-el="forced-day"></strong>. Elegí en qué franja pueden recibirnos.</span></div>' +
    '<fieldset class="field" aria-describedby="slots-hint"><legend>Franja horaria</legend><div class="options options--slots">' +
    '<label class="option option--check"><input type="checkbox" name="slots" value="manana"><span><strong>Mañana</strong>9 a 12 h</span></label>' +
    '<label class="option option--check"><input type="checkbox" name="slots" value="tarde"><span><strong>Tarde</strong>14 a 17 h</span></label>' +
    '</div><p class="field__hint" id="slots-hint" data-el="slots-hint">Podés marcar una o las dos.</p></fieldset>' +
    '<div class="sheet__actions">' +
    '<button type="submit" class="sgo-btn sgo-btn--primary sgo-btn--lg" data-el="confirm">Confirmar nueva fecha</button>' +
    '<button type="button" class="sgo-btn sgo-btn--ghost sgo-btn--md" data-action="close">Volver</button>' +
    "</div></form></div>";
  document.body.appendChild(overlays);
  function el(name) {
    return overlays.querySelector('[data-el="' + name + '"]');
  }
  var form = el("form");

  function openLayer(layer, trigger) {
    if (trigger) opener = trigger;
    el("modal").hidden = true;
    el("sheet").hidden = true;
    closeDemo();
    el("overlay").hidden = false;
    layer.hidden = false;
    document.body.classList.add("no-scroll");
    var first = layer === el("modal") ? layer.querySelector('[data-action="close"]') : focusables(layer)[0];
    if (first) first.focus();
  }
  function closeLayers() {
    el("overlay").hidden = true;
    el("modal").hidden = true;
    el("sheet").hidden = true;
    document.body.classList.remove("no-scroll");
    if (opener && document.contains(opener) && opener.offsetParent) opener.focus();
  }
  function activeLayer() {
    if (!el("modal").hidden) return el("modal");
    if (!el("sheet").hidden) return el("sheet");
    if (!demoPanel.hidden) return demoPanel;
    return null;
  }
  function focusables(layer) {
    return Array.prototype.filter.call(layer.querySelectorAll("a[href], input, button"), function (node) {
      if (node.disabled || node.offsetParent === null) return false;
      if (node.type !== "radio") return true;
      var checked = layer.querySelector('input[name="' + node.name + '"]:checked');
      return checked ? node === checked : node === layer.querySelector('input[name="' + node.name + '"]');
    });
  }
  function setQuota(box, textEl, text) {
    box.querySelectorAll(".quota__dots i").forEach(function (dot, i) {
      dot.classList.toggle("is-used", i < state.used);
    });
    textEl.textContent = text;
  }

  function openWarning(trigger) {
    var left = MAX - state.used;
    var title, body, cta;
    var date = parse(state.date);
    if (left === 2) {
      title = "Reprogramar tiene un costo";
      body =
        "<p>Cada cambio de fecha nos obliga a reorganizar la agenda de los técnicos y demora la atención de otros clientes.</p>" +
        "<p>Por eso cada visita se puede reprogramar <b>hasta 2 veces</b>.</p>";
      cta = "Reprogramar de todos modos";
    } else if (left === 1) {
      title = "Es tu última reprogramación";
      body =
        "<p>Reprogramar tiene un costo: cada cambio reorganiza la agenda de los técnicos y demora a otros clientes.</p>" +
        "<p>Después de esta, si necesitás cancelar, la visita pasa automáticamente al <b>día hábil siguiente</b>.</p>";
      cta = "Usar la última reprogramación";
    } else {
      var next = nextBusinessDay(date);
      title = "Ya no quedan reprogramaciones";
      body =
        "<p>Usaste las 2 reprogramaciones de esta visita.</p>" +
        "<p>Si cancelás la del <b>" + day(date) + "</b>, la pasamos al día hábil siguiente, el <b>" + day(next) + "</b>, y esa fecha ya no se podrá cambiar.</p>";
      cta = "Cancelar y pasar al " + day(next);
    }
    el("modal-title").textContent = title;
    el("modal-body").innerHTML = body;
    el("modal-continue").textContent = cta;
    el("modal-quota").hidden = left === 0;
    setQuota(el("modal-quota"), el("modal-quota-text"), left === 1 ? "Te queda 1 reprogramación" : "Te quedan " + left + " reprogramaciones");
    openLayer(el("modal"), trigger);
  }

  function openSheet(mode, trigger) {
    sheetMode = mode;
    var date = parse(state.date);
    var forced = mode === "forzada";
    form.querySelector('[data-step="choose"]').hidden = forced;
    form.querySelector('[data-step="forced"]').hidden = !forced;
    el("sheet-quota").hidden = mode !== "reprogramar";
    if (mode === "reprogramar") {
      el("sheet-title").textContent = "¿Cuándo pueden recibirnos?";
      setQuota(el("sheet-quota"), el("sheet-quota-text"), "Reprogramación " + (state.used + 1) + " de " + MAX);
    } else if (mode === "sullair") {
      el("sheet-title").textContent = "¿Cuándo pueden recibirnos?";
    } else {
      el("sheet-title").textContent = "Cancelar visita";
      el("forced-day").textContent = day(nextBusinessDay(date));
    }
    var confirm = el("confirm");
    if (forced) {
      confirm.textContent = "Pasar al " + day(nextBusinessDay(date));
    } else {
      var options = el("date-options");
      options.innerHTML = "";
      var d = date;
      for (var i = 0; i < DATE_OPTIONS; i++) {
        d = nextBusinessDay(d);
        options.insertAdjacentHTML(
          "beforeend",
          '<label class="option option--check"><input type="checkbox" name="dates" value="' + toIso(d) + '"><span><strong>' + capitalize(weekday.format(d)) + "</strong>" + dayMonth.format(d) + "</span></label>"
        );
      }
    }
    form.querySelectorAll('input[name="slots"]').forEach(function (box) {
      box.checked = state.slots.indexOf(box.value) !== -1;
    });
    touched = false;
    validateSheet();
    openLayer(el("sheet"), trigger);
  }

  function checkedSlots() {
    return Array.prototype.map.call(form.querySelectorAll('input[name="slots"]:checked'), function (box) {
      return box.value;
    });
  }
  function checkedDates() {
    return Array.prototype.map.call(form.querySelectorAll('input[name="dates"]:checked'), function (box) {
      return box.value;
    });
  }
  // Criterio: al menos un día (salvo que la fecha sea forzada) y al menos una franja.
  var touched = false;
  function validateSheet() {
    var forced = sheetMode === "forzada";
    var dates = checkedDates().length;
    var datesOk = forced || dates > 0;
    var slotsOk = checkedSlots().length > 0;
    var datesHint = el("dates-hint");
    datesHint.textContent = datesOk || !touched ? "Podés marcar uno o varios." : "Elegí al menos un día.";
    datesHint.classList.toggle("is-error", !datesOk && touched);
    var slotsHint = el("slots-hint");
    slotsHint.textContent = slotsOk ? "Podés marcar una o las dos." : "Elegí al menos una franja.";
    slotsHint.classList.toggle("is-error", !slotsOk);
    var confirm = el("confirm");
    if (!forced) confirm.textContent = dates > 1 ? "Enviar disponibilidad" : "Confirmar nueva fecha";
    confirm.disabled = !(datesOk && slotsOk);
  }
  form.addEventListener("change", function () {
    touched = true;
    validateSheet();
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var slots = checkedSlots();
    if (!slots.length) return validateSheet();
    if (sheetMode === "forzada") {
      state = { used: state.used, date: toIso(nextBusinessDay(parse(state.date))), slots: slots, status: "dia-siguiente" };
      flash = null;
    } else {
      var dates = checkedDates();
      if (!dates.length) return validateSheet();
      var used = sheetMode === "sullair" ? state.used : state.used + 1;
      state = { used: used, date: dates[0], slots: slots, status: sheetMode === "sullair" ? "programada" : "reprogramada" };
      if (dates.length > 1) {
        // Varios días posibles: Sullair elige uno y lo confirma (en la demo, a los pocos segundos).
        state.pending = dates;
        flash = null;
        scheduleConfirmation();
      } else {
        flash = confirmationFlash(sheetMode === "sullair" ? "Nueva fecha confirmada" : "Visita reprogramada");
      }
    }
    saveState();
    closeLayers();
    paint();
    var dateEls = root.querySelectorAll('[data-bind="visit-date"]');
    dateEls.forEach(function (node) {
      node.classList.add("is-updated");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  function confirmationFlash(title) {
    var label = day(parse(state.date)) + ", de " + slotsLabel(state.slots) + (state.slots.length > 1 ? " (mañana o tarde)." : ".");
    var tail =
      state.status === "programada" ? " Este cambio no cuenta como reprogramación." : state.used >= MAX ? " Ya no quedan reprogramaciones." : " Te avisamos por WhatsApp.";
    return { title: title, text: (state.status === "programada" ? "Te esperamos el " : "Quedó para el ") + label + tail };
  }

  // Simula la respuesta de Sullair: toma el primer día y la primera franja marcados.
  var confirmationTimer = null;
  function scheduleConfirmation() {
    clearTimeout(confirmationTimer);
    confirmationTimer = setTimeout(function () {
      if (!state.pending) return;
      state.date = state.pending[0];
      state.slots = [state.slots[0]];
      delete state.pending;
      flash = confirmationFlash("Sullair confirmó tu visita");
      saveState();
      paint();
      root.querySelectorAll('[data-bind="visit-date"]').forEach(function (node) {
        node.classList.add("is-updated");
      });
    }, 4000);
  }

  // ── Control de la demo (botón flotante) ───────────────────
  var demo = document.createElement("div");
  demo.className = "demo";
  demo.innerHTML =
    '<button type="button" class="demo__fab" data-action="toggle-demo" aria-haspopup="dialog" aria-expanded="false" aria-label="Escenarios de la demo">' +
    '<span class="demo__code">' + esc(sc.id) + '</span><span class="demo__label">Escenarios</span></button>' +
    '<div class="demo__panel" role="dialog" aria-label="Escenarios de la demo" hidden>' +
    '<div class="demo__head"><strong>Demo · Proyecto STAR</strong><button type="button" class="demo__close" data-action="close-demo" aria-label="Cerrar">' + ICONS.close + "</button></div>" +
    D.GROUPS.map(function (g) {
      return (
        '<p class="demo__group">' + esc(g.title) + "</p><ul>" +
        D.SCENARIOS.filter(function (s) { return s.group === g.id; })
          .map(function (s) {
            return (
              '<li><a href="/escenarios/' + s.id + '"' + (s.id === sc.id ? ' aria-current="page"' : "") + '><span class="demo__code">' + esc(s.id) + "</span>" + esc(s.title) + "</a></li>"
            );
          })
          .join("") +
        "</ul>"
      );
    }).join("") +
    (agenda
      ? '<div class="demo__rule"><p><b>Regla en prueba:</b> hasta 2 reprogramaciones, con aviso de costo antes de cada una. Si cancela después, pasa al día hábil siguiente y queda fija. Las cancelaciones de Sullair no cuentan.</p>' +
        '<p>Reprogramaciones usadas: <b data-el-demo="used"></b> de 2 · <button type="button" class="link" data-action="reset">Reiniciar escenario</button></p></div>'
      : "") +
    '<div class="demo__links"><a href="/">Todos los escenarios</a><a href="/comentarios">Todos los comentarios</a><a href="/board">Board de diseño</a><a href="/salir">Salir</a></div>' +
    "</div>";
  document.body.appendChild(demo);
  var demoPanel = $(".demo__panel", demo);
  var demoFab = $(".demo__fab", demo);

  function openDemo() {
    demoPanel.hidden = false;
    demoFab.setAttribute("aria-expanded", "true");
    var current = $('[aria-current="page"]', demoPanel);
    (current || $(".demo__close", demoPanel)).focus();
  }
  function closeDemo() {
    if (demoPanel.hidden) return;
    demoPanel.hidden = true;
    demoFab.setAttribute("aria-expanded", "false");
  }
  function paintDemoState() {
    var used = demo.querySelector('[data-el-demo="used"]');
    if (used) used.textContent = state.used;
  }

  // ── Eventos ───────────────────────────────────────────────
  document.addEventListener("click", function (e) {
    if (e.target === el("overlay")) return closeLayers();
    if (!demoPanel.hidden && !demo.contains(e.target)) closeDemo();
    var action = e.target.closest("[data-action]");
    if (!action) return;
    switch (action.getAttribute("data-action")) {
      case "request":
        openWarning(action);
        break;
      case "continue":
        openSheet(state.used >= MAX ? "forzada" : "reprogramar");
        break;
      case "choose-date":
        openSheet("sullair", action);
        break;
      case "close":
        closeLayers();
        break;
      case "reset":
        clearTimeout(confirmationTimer);
        state = Object.assign({}, sc.state);
        flash = null;
        saveState();
        closeDemo();
        paint();
        break;
      case "toggle-demo":
        demoPanel.hidden ? openDemo() : closeDemo();
        break;
      case "close-demo":
        closeDemo();
        demoFab.focus();
        break;
      case "expand-map":
        setMapExpanded(true);
        break;
      case "close-map":
        setMapExpanded(false);
        break;
      case "noop":
        e.preventDefault();
        break;
    }
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if ($(".map-block.is-expanded", root)) return setMapExpanded(false);
      if (!demoPanel.hidden) {
        closeDemo();
        return demoFab.focus();
      }
      if (activeLayer()) {
        e.preventDefault();
        closeLayers();
      }
      return;
    }
    var layer = activeLayer();
    if (e.key === "Tab" && layer && layer !== demoPanel) {
      var items = focusables(layer);
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  // Tooltip del servicio (tap en celular, hover/foco en desktop).
  root.addEventListener("click", function (e) {
    var tip = e.target.closest("[data-tip]");
    root.querySelectorAll(".tip").forEach(function (t) {
      t.remove();
    });
    if (!tip) return;
    var bubble = document.createElement("span");
    bubble.className = "tip";
    bubble.setAttribute("role", "tooltip");
    bubble.textContent = tip.getAttribute("data-tip");
    tip.parentElement.appendChild(bubble);
  });

  document.title = sc.id + " · " + sc.title + " · SullairGo";
  paint();
  if (agenda && state.pending) scheduleConfirmation();
  initMap();

  if (sc.updated) {
    setInterval(function () {
      minutesAgo++;
      var updated = slot("updated");
      updated.innerHTML = icon("refresh") + esc(updatedLabel());
    }, 60000);
  }
})();
