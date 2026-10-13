// Navegación entre escenarios con las flechas del teclado y ajuste de la vista desktop al ancho disponible.
(function () {
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select, [role=dialog]")) return;
    var link = document.querySelector('.pager__step[data-key="' + e.key + '"]');
    if (link) location.href = link.href;
  });

  var browser = document.querySelector('.stage--desktop .browser');
  if (!browser) return;
  var stage = browser.parentElement;
  function fit() {
    var styles = getComputedStyle(stage);
    var available = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    browser.style.zoom = Math.min(1, available / 1180);
  }
  fit();
  addEventListener('resize', fit);
})();
