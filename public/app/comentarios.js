// Comentarios de los testers sobre la pantalla actual (se guardan en D1 vía /api/comentarios).
// Bolita flotante encima de la del escenario: abre la lista y el formulario (nombre + comentario).
(function () {
  "use strict";

  var sc = window.STAR_ACTUAL;
  if (!sc) return;

  var NAME_KEY = "star-nombre";
  var comments = [];
  var loaded = false;

  var ICON_BUBBLE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.6A8 8 0 1 1 21 12z"/><path d="M8.5 10.5h7M8.5 14h4.5"/></svg>';
  var ICON_CLOSE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';

  function esc(text) {
    return String(text).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function readName() {
    try {
      return localStorage.getItem(NAME_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function saveName(name) {
    try {
      localStorage.setItem(NAME_KEY, name);
    } catch (e) {}
  }
  function view() {
    return window.matchMedia("(min-width: 900px)").matches ? "desktop" : "mobile";
  }
  function initials(name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(function (w) {
        return w.charAt(0).toUpperCase();
      })
      .join("");
  }
  var relative = new Intl.RelativeTimeFormat("es-AR", { numeric: "auto" });
  var dateFmt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  function when(iso) {
    var seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    var abs = Math.abs(seconds);
    if (abs < 60) return "recién";
    if (abs < 3600) return relative.format(Math.round(seconds / 60), "minute");
    if (abs < 86400) return relative.format(Math.round(seconds / 3600), "hour");
    return dateFmt.format(new Date(iso));
  }

  // ── Interfaz ────────────────────────────────────────────
  var root = document.createElement("div");
  root.className = "cmt";
  root.innerHTML =
    '<button type="button" class="cmt__fab" aria-haspopup="dialog" aria-expanded="false" aria-label="Comentarios de esta pantalla">' +
    ICON_BUBBLE +
    '<span class="cmt__count" hidden></span></button>' +
    '<section class="cmt__panel" role="dialog" aria-labelledby="cmt-title" hidden>' +
    '<header class="cmt__head"><div><h2 id="cmt-title">Comentarios</h2><p>' + esc(sc.id + " · " + sc.title) + "</p></div>" +
    '<button type="button" class="cmt__close" aria-label="Cerrar comentarios">' + ICON_CLOSE + "</button></header>" +
    '<div class="cmt__scroll"><ol class="cmt__list" aria-live="polite"></ol></div>' +
    '<form class="cmt__form" novalidate>' +
    '<div class="cmt__field"><label for="cmt-nombre">Tu nombre</label><input id="cmt-nombre" name="nombre" autocomplete="name" maxlength="80"></div>' +
    '<div class="cmt__field"><label for="cmt-texto">Comentario</label><textarea id="cmt-texto" name="comentario" rows="3" maxlength="2000" placeholder="¿Qué cambiarías en esta pantalla?"></textarea></div>' +
    '<p class="cmt__error" role="alert" hidden></p>' +
    '<button type="submit" class="sgo-btn sgo-btn--primary sgo-btn--md">Enviar comentario</button>' +
    "</form></section>";
  document.body.appendChild(root);

  var fab = root.querySelector(".cmt__fab");
  var count = root.querySelector(".cmt__count");
  var panel = root.querySelector(".cmt__panel");
  var list = root.querySelector(".cmt__list");
  var form = root.querySelector(".cmt__form");
  var nameInput = form.querySelector("#cmt-nombre");
  var textInput = form.querySelector("#cmt-texto");
  var errorEl = form.querySelector(".cmt__error");
  var submit = form.querySelector('button[type="submit"]');
  nameInput.value = readName();

  function paintCount() {
    var open = comments.filter(function (c) {
      return c.estado !== "resuelto";
    }).length;
    count.textContent = open;
    count.hidden = open === 0;
    fab.setAttribute("aria-label", "Comentarios de esta pantalla" + (open ? " (" + open + " abiertos)" : ""));
  }

  function itemHTML(c) {
    var resolved = c.estado === "resuelto";
    return (
      '<li class="cmt__item' + (resolved ? " is-resolved" : "") + '">' +
      '<span class="cmt__avatar" aria-hidden="true">' + esc(initials(c.nombre)) + "</span>" +
      '<div class="cmt__body">' +
      '<p class="cmt__meta"><strong>' + esc(c.nombre) + "</strong><span>" + esc(when(c.creado)) + " · en " + (c.vista === "desktop" ? "desktop" : "celular") + "</span></p>" +
      '<p class="cmt__text">' + esc(c.comentario) + "</p>" +
      (resolved ? '<p class="cmt__actions"><span class="cmt__resolved">Resuelto</span></p>' : "") +
      "</div></li>"
    );
  }

  function paintList() {
    if (!loaded) {
      list.innerHTML = '<li class="cmt__empty">Cargando comentarios…</li>';
      return;
    }
    list.innerHTML = comments.length
      ? comments.map(itemHTML).join("")
      : '<li class="cmt__empty">Todavía no hay comentarios en esta pantalla. Contanos qué cambiarías.</li>';
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
  }

  // ── Datos ───────────────────────────────────────────────
  function request(method, url, body) {
    return fetch(url, {
      method: method,
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body ? JSON.stringify(body) : undefined,
      credentials: "same-origin",
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || "No se pudo guardar. Probá de nuevo.");
        return data;
      });
    });
  }

  function load() {
    return request("GET", "/api/comentarios?escenario=" + encodeURIComponent(sc.id))
      .then(function (data) {
        comments = data.comentarios || [];
        loaded = true;
        paintCount();
        paintList();
      })
      .catch(function () {
        loaded = true;
        list.innerHTML = '<li class="cmt__empty">No se pudieron cargar los comentarios.</li>';
      });
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var nombre = nameInput.value.trim();
    var comentario = textInput.value.trim();
    if (!nombre) {
      showError("Escribí tu nombre.");
      return nameInput.focus();
    }
    if (!comentario) {
      showError("Escribí el comentario.");
      return textInput.focus();
    }
    showError("");
    submit.disabled = true;
    submit.textContent = "Enviando…";
    request("POST", "/api/comentarios", { escenario: sc.id, nombre: nombre, comentario: comentario, vista: view() })
      .then(function (data) {
        saveName(nombre);
        comments.unshift(data.comentario);
        textInput.value = "";
        paintCount();
        paintList();
        root.querySelector(".cmt__scroll").scrollTop = 0;
      })
      .catch(function (err) {
        showError(err.message);
      })
      .then(function () {
        submit.disabled = false;
        submit.textContent = "Enviar comentario";
      });
  });

  // ── Abrir y cerrar ──────────────────────────────────────
  function open() {
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    paintList();
    if (!loaded) load();
    (nameInput.value ? textInput : nameInput).focus();
  }
  function close() {
    if (panel.hidden) return;
    panel.hidden = true;
    fab.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
  }

  fab.addEventListener("click", function () {
    panel.hidden ? open() : close();
  });
  root.querySelector(".cmt__close").addEventListener("click", function () {
    close();
    fab.focus();
  });
  document.addEventListener("click", function (e) {
    if (e.target.closest(".demo__fab")) close();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) {
      close();
      fab.focus();
    }
  });

  load();
})();
