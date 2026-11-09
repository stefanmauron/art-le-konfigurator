export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const page = document.getElementById("utg-page-5"),
      host = document.getElementById("v3overview");
    if (!page || !host) return;
    // Keep the overview host and its table styles; move existing nodes with their handlers.
    const summary = document.createElement("section");
    summary.id = "utg-art-summary";
    summary.className = "panel utg-overview-card";
    for (const node of [...host.children])
      if (!node.matches("section")) summary.append(node);
    host.prepend(summary);
    const checks = document.getElementById("utg-checks")?.closest("section");
    if (checks) {
      checks.id = "utg-flow-review";
      host.append(checks);
    }
    const order = [
      "utg-art-summary",
      "utg-integrated-quality",
      "utg-team-audit",
      "utg-contract-report",
      "utg-interface-3907",
      "utg-design-overview",
      "utg-flow-review",
    ];
    for (const id of order) {
      const section = document.getElementById(id);
      if (!section) continue;
      section.classList.add("panel", "utg-overview-card");
      host.append(section);
    }
  })();
}
