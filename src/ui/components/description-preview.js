export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    for (const host of document.querySelectorAll(
      "#utg-activity-rows,#utg-design-rows,#utg-design-overview-rows,#crud-products,#model-content",
    )) {
      const observed = new Set();
      function update() {
        for (const row of observed)
          if (!row.isConnected) {
            resize.unobserve(row);
            observed.delete(row);
          }
        for (const container of host.querySelectorAll(
          ".app-activity-description",
        )) {
          if (!observed.has(container)) {
            observed.add(container);
            resize.observe(container);
          }
          if (
            container.classList.contains("is-expanded") ||
            !container.clientWidth
          )
            continue;
          const text = container.querySelector(".app-description-text"),
            button = container.querySelector(".app-description-toggle");
          button.hidden =
            text.scrollWidth <= container.clientWidth + 1 &&
            !/[\r\n]/.test(text.textContent.trim());
        }
      }
      const resize = new ResizeObserver(update);
      new MutationObserver(update).observe(host, {
        childList: true,
        subtree: true,
      });
      host.addEventListener("click", (event) => {
        const button = event.target.closest(".app-description-toggle");
        if (!button) return;
        const container = button.closest(".app-activity-description"),
          expanded = container.classList.toggle("is-expanded");
        button.setAttribute("aria-expanded", String(expanded));
        button.setAttribute(
          "aria-label",
          expanded ? "Beschreibung zuklappen" : "Beschreibung aufklappen",
        );
        button.textContent = expanded ? "−" : "+";
        if (!expanded) update();
      });
      app.addEventListener("resize", update);
      update();
    }
  })();
}
