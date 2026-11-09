export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const KEY = "gever-art-v3-config";
    function sync() {
      const data = app.UTGStorage.read(KEY) || {};
      document
        .querySelectorAll('#v3rows td[data-f="service"] select')
        .forEach((select) => {
          const current = select.value,
            options = app.UTGModels.serviceOptions(data, current);
          const existing = [...select.options];
          if (
            existing.length === options.length &&
            existing.every(
              (o, i) =>
                o.value === options[i].value &&
                o.textContent === options[i].label,
            )
          )
            return;
          select.replaceChildren(
            ...options.map((item) => {
              const option = document.createElement("option");
              option.value = item.value;
              option.textContent = item.label;
              return option;
            }),
          );
          select.value = current;
        });
    }
    // Both the service catalog and the matrix are dynamically rendered.
    document.addEventListener(
      "focusin",
      (e) => {
        if (e.target.matches?.('#v3rows td[data-f="service"] select')) sync();
      },
      true,
    );
    const serviceTable = document.getElementById("v3servicerows");
    if (serviceTable) {
      serviceTable.addEventListener("change", () => queueMicrotask(sync));
      serviceTable.addEventListener("click", () => setTimeout(sync, 0));
    }
    const create = document.getElementById("v3newservice");
    if (create) create.addEventListener("click", () => queueMicrotask(sync));
    app.addEventListener("utg-catalog-changed", () => queueMicrotask(sync));
    app.addEventListener("gever-v3-updated", () => queueMicrotask(sync));
    // Service selectors are refreshed through explicit catalog and matrix events.
  })();
}
