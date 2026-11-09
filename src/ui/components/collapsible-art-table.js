export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const section = document.getElementById("utg-art-summary"),
      rows = document.getElementById("v3overviewrows");
    const table = rows?.closest(".v3scroll");
    if (!section || !table) return;
    const details = document.createElement("details");
    details.className = "utg-findings";
    details.id = "utg-art-table-details";
    const summary = document.createElement("summary");
    function update() {
      const count = rows.rows.length;
      summary.textContent =
        "Leistungszuordnungen" +
        (count
          ? " · " + count + " " + (count === 1 ? "Tätigkeit" : "Tätigkeiten")
          : "") +
        " · " +
        (details.open ? "Tabelle ausblenden" : "Tabelle anzeigen");
    }
    table.before(details);
    details.append(summary, table);
    details.addEventListener("toggle", update);
    new MutationObserver(update).observe(rows, { childList: true });
    update();
  })();
}
