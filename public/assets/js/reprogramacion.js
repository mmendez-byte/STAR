// Escenario 0a: reprogramación de una visita programada, con datos ilusorios.
// Regla en prueba: hasta 2 cancelaciones; la última pasa la visita al día hábil siguiente.
(function () {
  var MAX_CHANGES = 2;
  var INITIAL = { used: 0, date: "2026-10-15", slot: "manana" };
  var SLOTS = { manana: "9 a 12 h", tarde: "14 a 17 h" };
  var DATE_OPTIONS = 4;
  var STORAGE_KEY = "star-escenario-0a";

  var screen = document.querySelector(".v-screen");
  var form = bind("form");
  var sheet = bind("sheet");
  var overlay = bind("overlay");
  var confirmButton = bind("confirm");
  var state = load();
  var opener = null;

  function bind(name) {
    return document.querySelector('[data-bind="' + name + '"]');
  }

  function load() {
    try {
      var saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (saved && typeof saved.used === "number" && saved.date && SLOTS[saved.slot]) return saved;
    } catch (e) {}
    return Object.assign({}, INITIAL);
  }

  function save() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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
  function dayLabel(d) {
    return weekday.format(d) + " " + pad(d.getDate()) + "/" + pad(d.getMonth() + 1);
  }

  // ── Pantalla ──────────────────────────────────────────────
  function render() {
    var date = parse(state.date);
    var dateEl = bind("visit-date");
    dateEl.textContent = capitalize(dayLabel(date)) + " · " + SLOTS[state.slot];
    bind("state-title").textContent = state.used ? "Visita reprogramada" : "Visita programada";
    bind("reschedule").hidden = state.used >= MAX_CHANGES;
    bind("reschedule-locked").hidden = state.used < MAX_CHANGES;
    bind("used").textContent = state.used;
    bind("banner").hidden = state.used === 0;
    if (state.used) {
      bind("banner-text").textContent =
        "Quedó para el " + dayLabel(date) + ", de " + SLOTS[state.slot] + ". Te avisamos por WhatsApp." +
        (state.used >= MAX_CHANGES ? " Ya no quedan cambios de fecha." : "");
    }
  }

  function flashDate() {
    var dateEl = bind("visit-date");
    dateEl.classList.remove("is-updated");
    void dateEl.offsetWidth;
    dateEl.classList.add("is-updated");
  }

  // ── Hoja de reprogramación ────────────────────────────────
  function isLastChange() {
    return state.used === MAX_CHANGES - 1;
  }

  function openSheet(trigger) {
    var last = isLastChange();
    var current = parse(state.date);
    var forced = nextBusinessDay(current);
    var left = MAX_CHANGES - state.used;

    bind("sheet-title").textContent = last ? "Último cambio disponible" : "Reprogramar visita";
    bind("quota-text").textContent = left === 1 ? "Queda 1 cambio de fecha" : "Quedan " + left + " cambios de fecha";
    bind("quota").querySelectorAll(".v-quota__dots i").forEach(function (dot, i) {
      dot.classList.toggle("is-used", i < state.used);
    });

    form.querySelector('[data-step="first"]').hidden = last;
    form.querySelector('[data-step="last"]').hidden = !last;
    bind("cancel").textContent = last ? "Mantener la fecha actual" : "Volver";

    if (last) {
      bind("current-day").textContent = dayLabel(current);
      bind("forced-day").textContent = dayLabel(forced);
      confirmButton.textContent = "Pasar al " + dayLabel(forced);
      confirmButton.disabled = false;
    } else {
      var options = bind("date-options");
      options.innerHTML = "";
      var d = current;
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

    opener = trigger || document.activeElement;
    overlay.hidden = false;
    sheet.hidden = false;
    if (window.matchMedia("(max-width: 479px)").matches) document.body.style.overflow = "hidden";
    focusables()[0].focus();
  }

  function closeSheet() {
    overlay.hidden = true;
    sheet.hidden = true;
    document.body.style.overflow = "";
    if (opener && document.contains(opener) && opener.offsetParent) opener.focus();
  }

  function focusables() {
    return Array.prototype.filter.call(
      sheet.querySelectorAll("input, button"),
      function (el) {
        return !el.disabled && el.offsetParent !== null && (el.type !== "radio" || el.checked || !form.querySelector('input[name="' + el.name + '"]:checked'));
      }
    );
  }

  form.addEventListener("change", function (e) {
    if (e.target.name === "date") confirmButton.disabled = false;
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var date;
    if (isLastChange()) {
      date = toIso(nextBusinessDay(parse(state.date)));
    } else {
      var picked = form.querySelector('input[name="date"]:checked');
      if (!picked) return;
      date = picked.value;
    }
    state = { used: state.used + 1, date: date, slot: form.querySelector('input[name="slot"]:checked').value };
    save();
    closeSheet();
    render();
    flashDate();
    screen.querySelector(".v-scroll").scrollTo({ top: 0, behavior: "smooth" });
    if (window.matchMedia("(max-width: 479px)").matches) window.scrollTo({ top: 0, behavior: "smooth" });
  });

  document.addEventListener("click", function (e) {
    var action = e.target.closest("[data-action]");
    if (e.target === overlay) return closeSheet();
    if (!action) return;
    var name = action.getAttribute("data-action");
    if (name === "open") openSheet(action);
    if (name === "close") closeSheet();
    if (name === "reset") {
      state = Object.assign({}, INITIAL);
      save();
      closeSheet();
      render();
    }
  });

  document.addEventListener("keydown", function (e) {
    if (sheet.hidden) return;
    if (e.key === "Escape") {
      e.preventDefault();
      closeSheet();
    }
    if (e.key === "Tab") {
      var items = focusables();
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
