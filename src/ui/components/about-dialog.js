export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const title = document.querySelector("body>header h1");
    if (!title) return;
    const version = title.querySelector(".app-version");
    if (!version) return;
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "app-version app-version-trigger";
    trigger.textContent = version.textContent;
    trigger.title = "Über diese App und Change-log";
    trigger.setAttribute(
      "aria-label",
      version.textContent + " – Über diese App und Change-log",
    );
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-controls", "utg-about-dialog");
    const meta = document.createElement("span");
    meta.className = "app-header-meta";
    title.append(meta);
    meta.append(trigger);
    version.remove();
    const dialog =
      app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
    dialog.id = "utg-about-dialog";
    dialog.setAttribute("aria-labelledby", "utg-about-title");
    dialog.innerHTML =
      '<div class="app-about-header"><h2 id="utg-about-title">Über diese App</h2><button type="button" class="app-about-close" aria-label="Fenster schliessen"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div><div class="app-about-content"><section aria-label="Über diese App"><h3>Zusammenarbeit klären. Gemeinsam liefern.</h3><p>Wenn mehrere Teams und Leistungserbringer an einem Produkt arbeiten, müssen Zuständigkeiten, Beiträge und Übergaben zusammenpassen. Diese App macht die Vereinbarungen sichtbar – vom Produktauftrag bis zur Bereitstellung und Betriebsübernahme.</p><p><strong>Damit klärt ihr:</strong></p><ul><li><strong>Wer welchen Beitrag leistet:</strong> Tätigkeiten, verantwortliche Rollen und Beiträge von ISCeco, BIT oder weiteren Leistungserbringern je Team festhalten.</li><li><strong>Wann Arbeit weitergehen kann:</strong> Bereitschaft, Qualitätskriterien und Übergaben für die sieben Flow-Phasen vereinbaren.</li><li><strong>Wo Entscheidungen fehlen:</strong> Offene Zuordnungen und unvollständige Vereinbarungen erkennen und gezielt bearbeiten.</li></ul><p><strong>Das Ergebnis:</strong> Eine gemeinsame Arbeitsgrundlage für die Abstimmung zwischen Teams, Product Management und Leistungserbringern.</p></section><section class="app-about-changelog" aria-labelledby="utg-changelog-title"><h3 id="utg-changelog-title">Change-log</h3><div id="utg-about-changelog"><p><strong>{{release.label}} – Technische Überarbeitung</strong></p><ul><li>Modularer Quellcode und automatischer Build zu einer einzelnen HTML-Datei.</li><li>Getrennte lokale Arbeitsstände für v3.16 RC2 und {{release.label}}; Übernahme über JSON-Export und -Import.</li><li>Fachfunktionen und Darstellung entsprechen der RC2-Referenz; bekannte fachliche Einschränkungen bleiben bestehen.</li></ul></div></section></div><div class="app-about-footer"><small class="app-about-credit">© 2026 <span class="app-credit-name" tabindex="0" aria-describedby="utg-credit-tooltip">flowlogic<span class="app-credit-tooltip" id="utg-credit-tooltip" role="tooltip">Stefan Mauron</span></span></small><button type="button" id="utg-about-dismiss">Schliessen</button></div>';
    document.body.append(dialog);
    const close = dialog.querySelector(".app-about-close");
    trigger.onclick = () => {
      if (!dialog.open) {
        dialog.showModal();
        close.focus();
      }
    };
    close.onclick = () => dialog.close();
    dialog.querySelector("#utg-about-dismiss").onclick = () => dialog.close();
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      dialog.close();
    });
    dialog.addEventListener("close", () => trigger.focus());
  })();
}
