export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const node = document.getElementById("utg-storage-location");
    if (!node) return;
    const protocol = location.protocol;
    const source =
      protocol === "file:"
        ? "lokale HTML-Datei (file://; browserabhängiger Speicherbereich)"
        : location.origin;
    node.textContent = " · Speicherbereich: " + source;
    node.setAttribute("aria-label", "Speicherbereich: " + source);
  })();
}
