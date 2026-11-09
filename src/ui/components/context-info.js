export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const pages = [
      document.getElementById("utg-page-4"),
      document.getElementById("utg-page-5"),
    ].filter(Boolean);
    if (!pages.length) return;
    const texts = new WeakMap(),
      tooltip = document.createElement("div");
    tooltip.className = "app-column-tooltip";
    tooltip.id = "utg-model-overview-info";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.append(tooltip);
    let active = null;
    function hide() {
      active?.removeAttribute("aria-describedby");
      active = null;
      tooltip.hidden = true;
    }
    function show(button) {
      hide();
      active = button;
      tooltip.textContent = texts.get(button) || button.dataset.info || "";
      tooltip.hidden = false;
      button.setAttribute("aria-describedby", tooltip.id);
      const rect = button.getBoundingClientRect(),
        box = tooltip.getBoundingClientRect();
      tooltip.style.left =
        Math.max(12, Math.min(rect.left, window.innerWidth - box.width - 12)) +
        "px";
      tooltip.style.top =
        Math.max(
          12,
          rect.bottom + 8 + box.height <= window.innerHeight - 12
            ? rect.bottom + 8
            : rect.top - box.height - 8,
        ) + "px";
    }
    function scan(page) {
      if (active && !active.isConnected) hide();
      for (const note of page.querySelectorAll(
        "p.hint:not([id]),p.v3hint:not([id]),p.muted:not([id]),p.utg-muted:not([id]),p.utg-note:not([id]),p.utg33-muted:not([id]),.model-subhead > span.muted,.utg-secondary-heading > span.muted,.utg33-tools > span.utg33-muted",
      )) {
        if (note.closest("table,.flow-tasks,.utg-task-responsibilities"))
          continue;
        // Preserve the current team/product selection as visible context.
        if (note.textContent.trim().startsWith("Team:")) continue;
        const parent = note.parentElement;
        const heading = parent.querySelector(
          ":scope > h2,:scope > h3,:scope > strong",
        );
        if (!heading && !parent.classList.contains("utg33-tools")) continue;
        const target = heading || parent;
        let button = [...target.children].find((child) =>
          child.classList.contains("app-context-info"),
        );
        if (!button) {
          button = document.createElement("button");
          button.type = "button";
          button.className = "app-context-info";
          button.textContent = "i";
          button.setAttribute(
            "aria-label",
            "Info: " + (heading?.textContent || "Steuerungsansicht"),
          );
          target.append(" ", button);
          texts.set(button, "");
        }
        texts.set(
          button,
          [texts.get(button), note.textContent.trim()]
            .filter(Boolean)
            .join("\n\n"),
        );
        note.remove();
      }
    }
    for (const page of pages) {
      scan(page);
      new MutationObserver(() => scan(page)).observe(page, {
        childList: true,
        subtree: true,
      });
      page.addEventListener("mouseover", (event) => {
        const button = event.target.closest(".app-context-info");
        if (button) show(button);
      });
      page.addEventListener("mouseout", (event) => {
        const button = event.target.closest(".app-context-info");
        if (button && !button.contains(event.relatedTarget)) hide();
      });
      page.addEventListener("focusin", (event) => {
        if (event.target.matches(".app-context-info")) show(event.target);
      });
      page.addEventListener("focusout", (event) => {
        if (event.target.matches(".app-context-info")) hide();
      });
      page.addEventListener("click", (event) => {
        const button = event.target.closest(".app-context-info");
        if (button) show(button);
      });
      page.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hide();
      });
    }
    app.addEventListener("scroll", hide, true);
    app.addEventListener("resize", hide);
    document
      .querySelectorAll("#utg-nav button")
      .forEach((button) => button.addEventListener("click", hide));
  })();
}
