export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const model = document.getElementById("operating-model");
    if (!model) return;
    const header = model.querySelector(":scope > .model-head"),
      layers = document.getElementById("utg-layers");
    if (header) {
      const card = document.createElement("section");
      card.className = "utg-model-card";
      header.before(card);
      card.append(header);
      if (layers) card.append(layers);
    }
    const bar = document.getElementById("utg33policybar");
    if (bar) {
      const tools = bar.previousElementSibling,
        card = document.createElement("section");
      card.className = "utg-model-card";
      bar.before(card);
      const heading = document.createElement("h3");
      heading.textContent = "Gemeinsame Flow-Regeln";
      card.append(heading);
      if (tools?.classList.contains("utg33-tools")) card.append(tools);
      card.append(bar);
    }
    for (const id of ["utg33detail", "utg33interfaces", "utg33events"])
      document.getElementById(id)?.classList.add("utg-model-card");
  })();
}
