export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const page = document.getElementById("utg-page-2");
    if (!page) return;
    const entries = [];
    for (const id of [
      "crud-management",
      "utg-design-criteria",
      "utg-masterdata",
      "utg-activities",
      "v3services",
      "utg-responsibilities",
      "v3matrix",
    ]) {
      const section = document.getElementById(id);
      if (!section) continue;
      const heading = section.querySelector(":scope > h2");
      if (!heading) continue;
      // Only static introductory text moves; counters, save status and errors stay visible.
      const descriptions = [...section.children].filter((node) =>
        node.matches("p.hint:not([id]),p.v3hint:not([id])"),
      );
      if (!descriptions.length) continue;
      const popup = document.createElement("div");
      popup.className = "app-section-info-popup";
      popup.id = id + "-info";
      popup.setAttribute("role", "tooltip");
      popup.hidden = true;
      for (const text of descriptions) popup.append(text);
      const help = section.querySelector(":scope > .utg-model-help");
      if (help) {
        while (help.firstChild) popup.append(help.firstChild);
        help.remove();
      }
      if (id === "crud-management") {
        const general = page.querySelector(":scope > .utg-config-hint");
        if (general) {
          popup.append(general);
        }
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "app-section-info";
      button.textContent = "i";
      button.setAttribute("aria-label", "Info: " + heading.textContent);
      button.setAttribute("aria-expanded", "false");
      heading.append(" ", button);
      document.body.append(popup);
      entries.push({ button, popup });
      let closeTimer;
      function hide() {
        clearTimeout(closeTimer);
        popup.hidden = true;
        button.removeAttribute("aria-describedby");
        button.setAttribute("aria-expanded", "false");
      }
      function show() {
        clearTimeout(closeTimer);
        for (const entry of entries)
          if (entry.popup !== popup) {
            entry.popup.hidden = true;
            entry.button.removeAttribute("aria-describedby");
            entry.button.setAttribute("aria-expanded", "false");
          }
        popup.hidden = false;
        button.setAttribute("aria-describedby", popup.id);
        button.setAttribute("aria-expanded", "true");
        const rect = button.getBoundingClientRect(),
          box = popup.getBoundingClientRect();
        const left = Math.max(
          12,
          Math.min(rect.left, window.innerWidth - box.width - 12),
        );
        const below = window.innerHeight - rect.bottom - 12,
          above = rect.top - 12;
        const top =
          below >= box.height || below >= above
            ? Math.min(rect.bottom + 6, window.innerHeight - box.height - 12)
            : Math.max(12, rect.top - box.height - 6);
        popup.style.left = left + "px";
        popup.style.top = Math.max(12, top) + "px";
      }
      button.addEventListener("mouseenter", show);
      button.addEventListener("mouseleave", (event) => {
        if (!popup.contains(event.relatedTarget))
          closeTimer = setTimeout(hide, 120);
      });
      popup.addEventListener("mouseenter", () => clearTimeout(closeTimer));
      button.addEventListener("focus", show);
      button.addEventListener("blur", (event) => {
        if (!popup.contains(event.relatedTarget)) hide();
      });
      button.addEventListener("click", show);
      popup.addEventListener("mouseleave", (event) => {
        if (event.relatedTarget !== button) hide();
      });
      popup.addEventListener("focusout", (event) => {
        if (
          !popup.contains(event.relatedTarget) &&
          event.relatedTarget !== button
        )
          hide();
      });
      for (const target of [button, popup])
        target.addEventListener("keydown", (event) => {
          if (event.key === "Escape") {
            hide();
            event.stopPropagation();
          }
        });
      app.addEventListener(
        "scroll",
        (event) => {
          if (!popup.contains(event.target)) hide();
        },
        true,
      );
      app.addEventListener("resize", hide);
      document
        .querySelectorAll("#utg-nav button")
        .forEach((nav) => nav.addEventListener("click", hide));
    }
  })();
}
