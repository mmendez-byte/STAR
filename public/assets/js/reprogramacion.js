// Escenarios R1–R5: reprogramación y cancelación de una visita programada, con datos ilusorios.
//
// Regla en prueba:
// - Hasta 2 reprogramaciones; antes de cada una, un modal avisa que tiene un costo.
// - Si el cliente cancela después de las 2, la visita pasa al día hábil siguiente y queda fija.
// - Si cancela Sullair, el cliente elige una nueva fecha sin que cuente como reprogramación.
//
// Estados: programada · reprogramada · dia-siguiente · cancelada-sullair
(function () {
  var MAX = 2;
  var SLOTS = { manana: "9 a 12 h", tarde: "14 a 17 h" };
  var DATE_OPTIONS = 4;

  var screen = document.querySelector(".v-screen");
  var initial = JSON.parse(screen.getAttribute("data-initial"));
  var storageKey = "star-escenario-" + screen.getAttribute("data-scenario");
  var form = bind("form");
  var sheet = bind("sheet");
  var modal = bind("modal");
  var overlay = bind("overlay");
  var confirmButton = bind("confirm");

  var state = load();
  var sheetMode = null; // reprogramar · forzada · sullair
  var opener = null;
  var flash = null; // confirmación del último cambio hecho en esta sesión

  function bind(name) {
    return screen.parentElement.parentElement.querySelector('[data-bind="' + name + '"]');
  }

  function load() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(storageKey));
      if (saved && typeof saved.used === "number" && saved.date && SLOTS[saved.slot] && saved.status) return saved;
    } catch (e) {}
    return Object.assign({}, initial);
  }

  function save() {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(state));
    } catch (e) {}
  }

  // ── Fechas ────────────────────────────────────────────────
  function parse(iso) {
    var p = iso.split("-").map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function toIso(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function pad(n) {
    return String(n).padStart(2, "0");
  }
  function nextBusinessDay(d) {
    var n = new Date(d);
    do n.setDate(n.getDate() + 1);
    while (n.getDay() === 0 || n.getDay() === 6);
    return n;
  }
  var weekday = new Intl.DateTimeFormat("es-AR", { weekday: "long" });
  var dayMonth = new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "long" });
  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }
  function day(d) {
    return weekday.format(d) + " " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  }
  function current() {
    return parse(state.date);
  }

  // ── Pantalla ──────────────────────────────────────────────
  var TITLES = {
    programada: "Visita programada",
    reprogramada: "Visita reprogramada",
    "dia-siguiente": "Fecha definitiva",
    "cancelada-sullair": "Visita cancelada",
  };
  var BADGES = {
    programada: ["info", "Programado"],
    reprogramada: ["info", "Reprogramado"],
    "dia-siguiente": ["info", "Fecha definitiva"],
    "cancelada-sullair": ["neutral", "Cancelado"],
  };

  function render() {
    var status = state.status;
    var date = current();
    var cancelled = status === "cancelada-sullair";

    screen.classList.toggle("is-cancelled", cancelled);
    bind("state-title").textContent = TITLES[status];
    var dateEl = bind("visit-date");
    dateEl.textContent = capitalize(day(date)) + " · " + SLOTS[state.slot];
    dateEl.classList.toggle("is-cancelled", cancelled);

    var badge = bind("badge");
    badge.className = "sgo-badge sgo-badge--" + BADGES[status][0];
    badge.textContent = BADGES[status][1];

    bind("checklist").hidden = cancelled;
    bind("sullair-cancelled").hidden = !cancelled;
    bind("cancelled-day").textContent = day(date);
    bind("notice-locked").hidden = status !== "dia-siguiente";
    bind("locked-day").textContent = day(date);

    var footer = bind("footer");
    var footerText = bind("footer-text");
    var footerAction = bind("footer-action");
    footer.hidden = cancelled;
    footerAction.hidden = false;
    if (status === "dia-siguiente") {
      footerText.textContent = "Esta visita ya no admite cambios. Para otra modificación, contactá a tu ejecutivo de cuenta.";
      footerAction.hidden = true;
    } else if (state.used === 0) {
      footerText.textContent = "¿No pueden recibirnos ese día?";
      footerAction.textContent = "Reprogramar visita";
    } else if (state.used < MAX) {
      footerText.textContent = "Te queda " + (MAX - state.used) + " reprogramación ·";
      footerAction.textContent = "Reprogramar visita";
    } else {
      footerText.textContent = "Ya usaste las " + MAX + " reprogramaciones ·";
      footerAction.textContent = "Cancelar visita";
    }

    var banner = bind("banner");
    banner.hidden = !flash;
    if (flash) {
      bind("banner-title").textContent = flash.title;
      bind("banner-text").textContent = flash.text;
    }
    bind("used").textContent = state.used;
  }

  function setQuota(el, textEl, text) {
    el.querySelectorAll(".v-quota__dots i").forEach(function (dot, i) {
      dot.classList.toggle("is-used", i < state.used);
    });
    textEl.textContent = text;
  }

  // ── Capas (modal y hoja) ──────────────────────────────────
  function openLayer(layer, trigger) {
    if (trigger) opener = trigger;
    modal.hidden = true;
    sheet.hidden = true;
    overlay.hidden = false;
    layer.hidden = false;
    if (window.matchMedia("(max-width: 479px)").matches) document.body.style.overflow = "hidden";
    var first = layer === modal ? layer.querySelector('[data-action="close"]') : focusables(layer)[0];
    first.focus();
  }

  function closeLayers() {
    overlay.hidden = true;
    modal.hidden = true;
    sheet.hidden = true;
    document.body.style.overflow = "";
    if (opener && document.contains(opener) && opener.offsetParent) opener.focus();
  }

  function openLayerEl() {
    if (!modal.hidden) return modal;
    if (!sheet.hidden) return sheet;
    return null;
  }

  function focusables(layer) {
    return Array.prototype.filter.call(layer.querySelectorAll("input, button"), function (el) {
      if (el.disabled || el.offsetParent === null) return false;
      if (el.type !== "radio") return true;
      var checked = layer.querySelector('input[name="' + el.name + '"]:checked');
      return checked ? el === checked : el === layer.querySelector('input[name="' + el.name + '"]');
    });
  }

  // Aviso previo: reprogramar tiene un costo y no es ilimitado.
  function openWarning(trigger) {
    var left = MAX - state.used;
    var title, body, cta;
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
      var next = nextBusinessDay(current());
      title = "Ya no quedan reprogramaciones";
      body =
        "<p>Usaste las 2 reprogramaciones de esta visita.</p>" +
        "<p>Si cancelás la del <b>" + day(current()) + "</b>, la pasamos al día hábil siguiente, el <b>" + day(next) +
        "</b>, y esa fecha ya no se podrá cambiar.</p>";
      cta = "Cancelar y pasar al " + day(next);
    }
    bind("modal-title").textContent = title;
    bind("modal-body").innerHTML = body;
    bind("modal-continue").textContent = cta;
    // Sin reprogramaciones el título ya lo dice: no se repite el contador.
    bind("modal-quota").hidden = left === 0;
    setQuota(bind("modal-quota"), bind("modal-quota-text"), left === 1 ? "Te queda 1 reprogramación" : "Te quedan " + left + " reprogramaciones");
    openLayer(modal, trigger);
  }

  function openSheet(mode) {
    sheetMode = mode;
    var date = current();
    var forced = mode === "forzada";

    form.querySelector('[data-step="choose"]').hidden = forced;
    form.querySelector('[data-step="forced"]').hidden = !forced;
    bind("sheet-quota").hidden = mode !== "reprogramar";

    if (mode === "reprogramar") {
      bind("sheet-title").textContent = "Nueva fecha";
      setQuota(bind("sheet-quota"), bind("sheet-quota-text"), "Reprogramación " + (state.used + 1) + " de " + MAX);
    } else if (mode === "sullair") {
      bind("sheet-title").textContent = "Elegí una nueva fecha";
    } else {
      bind("sheet-title").textContent = "Cancelar visita";
      bind("forced-day").textContent = day(nextBusinessDay(date));
    }

    if (forced) {
      confirmButton.textContent = "Pasar al " + day(nextBusinessDay(date));
      confirmButton.disabled = false;
    } else {
      var options = bind("date-options");
      options.innerHTML = "";
      var d = date;
      for (var i = 0; i < DATE_OPTIONS; i++) {
        d = nextBusinessDay(d);
        var label = document.createElement("label");
        label.className = "v-option";
        label.innerHTML =
          '<input type="radio" name="date" value="' + toIso(d) + '"><span><strong>' +
          capitalize(weekday.format(d)) + "</strong>" + dayMonth.format(d) + "</span>";
        options.appendChild(label);
      }
      confirmButton.textContent = "Confirmar nueva fecha";
      confirmButton.disabled = true;
    }
    form.querySelector('input[name="slot"][value="' + state.slot + '"]').checked = true;
    openLayer(sheet);
  }

  // ── Acciones ──────────────────────────────────────────────
  form.addEventListener("change", function (e) {
    if (e.target.name === "date") confirmButton.disabled = false;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var slot = form.querySelector('input[name="slot"]:checked').value;
    if (sheetMode === "forzada") {
      state = { used: state.used, date: toIso(nextBusinessDay(current())), slot: slot, status: "dia-siguiente" };
      flash = null;
    } else {
      var picked = form.querySelector('input[name="date"]:checked');
      if (!picked) return;
      var label = day(parse(picked.value)) + ", de " + SLOTS[slot] + ".";
      if (sheetMode === "sullair") {
        state = { used: state.used, date: picked.value, slot: slot, status: "programada" };
        flash = { title: "Nueva fecha confirmada", text: "Te esperamos el " + label + " Este cambio no cuenta como reprogramación." };
      } else {
        var used = state.used + 1;
        state = { used: used, date: picked.value, slot: slot, status: "reprogramada" };
        flash = {
          title: "Visita reprogramada",
          text: "Quedó para el " + label + (used >= MAX ? " Ya no quedan reprogramaciones." : " Te avisamos por WhatsApp."),
        };
      }
    }
    save();
    closeLayers();
    render();
    var dateEl = bind("visit-date");
    dateEl.classList.remove("is-updated");
    void dateEl.offsetWidth;
    dateEl.classList.add("is-updated");
    screen.querySelector(".v-scroll").scrollTo({ top: 0, behavior: "smooth" });
    if (window.matchMedia("(max-width: 479px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("click", function (e) {
    if (e.target === overlay) return closeLayers();
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
        openSheet("sullair");
        opener = action;
        break;
      case "close":
        closeLayers();
        break;
      case "reset":
        state = Object.assign({}, initial);
        flash = null;
        save();
        closeLayers();
        render();
        break;
    }
  });

  document.addEventListener("keydown", function (e) {
    var layer = openLayerEl();
    if (!layer) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeLayers();
    }
    if (e.key === "Tab") {
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

  render();
})();
