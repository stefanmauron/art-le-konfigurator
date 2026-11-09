export function initialize(app, browser = globalThis) {
  const sessionStorage = app.sessionStorage ?? globalThis.sessionStorage;

  (function () {
    "use strict";
    const reset = document.getElementById("reset");
    if (!reset) return;
    const dialog =
      app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
    dialog.setAttribute("aria-labelledby", "utg-reset-title");
    dialog.style.cssText =
      "max-width:520px;border:1px solid #bdccda;border-radius:12px;padding:24px;color:#17263d";
    dialog.innerHTML =
      '<h2 id="utg-reset-title">Default-Datensatz wiederherstellen?</h2><p id="utg-reset-summary"></p><p>Teams, Produkte, LE-Services, Tätigkeiten und Flow-Regeln einschliesslich DoD-, DoR- und AC-Kriterien werden durch den aktuellen eingebetteten Standarddatensatz ersetzt. Eigene Änderungen gehen dabei verloren.</p><div class="actions"><button type="button" id="utg-reset-cancel">Abbrechen</button><button type="button" class="primary" id="utg-reset-confirm">Standard wiederherstellen</button></div>';
    document.body.appendChild(dialog);
    reset.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        const b = app.UTGDefaults.baseline();
        document.getElementById("utg-reset-summary").textContent =
          b.v2.teams.length +
          " Teams · " +
          b.v3.products.length +
          " Produkte · " +
          b.v3.services.length +
          " LE-Services · " +
          b.v3.activities.length +
          " Tätigkeiten";
        dialog.showModal();
      },
      true,
    );
    document.getElementById("utg-reset-cancel").onclick = () => dialog.close();
    document.getElementById("utg-reset-confirm").onclick = () => {
      try {
        app.UTGDefaults.install();
        app.UTGPending?.clearAfterImport();
        sessionStorage.setItem("utg-active-register", "1");
        app.UTGFeedback?.beforeReload();
        location.reload();
      } catch (e) {
        dialog.close();
        document.getElementById("status").textContent =
          "Zurücksetzen fehlgeschlagen: " + e.message;
      }
    };
  })();
}
