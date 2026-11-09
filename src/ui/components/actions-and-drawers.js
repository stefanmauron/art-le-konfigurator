export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const paths = {
      back: "M19 12H5m5-5-5 5 5 5",
      check: "m5 12 4 4L19 6",
      open: "M5 12h14m-5-5 5 5-5 5",
      reset: "M3 10a9 9 0 1 1 2.6 8.4M3 4v6h6",
      rule: "M5 3h10l4 4v14H5V3ZM14 3v5h5M8 12h8M8 16h6",
      add: "M12 5v14M5 12h14",
      edit: "m15 5 4 4M4 20l4-1L20 7a2 2 0 0 0-4-4L4 15v5Z",
      delete: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
      save: "M5 3h9l5 5v13H5V3ZM14 3v5h5M12 10v7m-3-3 3 3 3-3",
      download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
      upload: "M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4",
      close: "m6 6 12 12M18 6 6 18",
    };
    function icon(kind) {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      svg.setAttribute("fill", "none");
      svg.setAttribute("stroke", "currentColor");
      svg.setAttribute("stroke-width", "1.7");
      svg.setAttribute("stroke-linecap", "round");
      svg.setAttribute("stroke-linejoin", "round");
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.classList.add("ui-action-icon");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", paths[kind]);
      svg.append(path);
      return svg;
    }
    function decorateActions() {
      for (const button of document.querySelectorAll("button,.filebtn")) {
        if (
          button.closest("#utg-nav") ||
          button.matches(
            ".app-description-toggle,.app-column-info,.app-section-info,.app-matrix-info,.app-context-info,.ui-drawer-close",
          )
        )
          continue;
        const text = button.textContent.trim();
        let kind =
          button.id === "reset" || button.id === "utg-reset-confirm"
            ? "reset"
            : button.hasAttribute("data-policy")
              ? "rule"
              : button.id === "save"
                ? "save"
                : button.id === "export"
                  ? "download"
                  : button.classList.contains("filebtn")
                    ? "upload"
                    : /zurück/i.test(text)
                      ? "back"
                      : /bestätigen/i.test(text)
                        ? "check"
                        : /speichern|übernehmen/i.test(text)
                          ? "save"
                          : /löschen/i.test(text)
                            ? "delete"
                            : /bearbeiten|beurteilen/i.test(text)
                              ? "edit"
                              : /öffnen|anzeigen/i.test(text)
                                ? "open"
                                : /(?:^|\s)(?:erstellen|hinzufügen)(?:\s|$)|^\+/i.test(
                                      text,
                                    )
                                  ? "add"
                                  : null;
        if (!kind || button.dataset.uiAction === kind) continue;
        button.querySelector(":scope > .ui-action-icon")?.remove();
        button.dataset.uiAction = kind;
        button.classList.add("ui-action");
        if (kind === "add") {
          button.classList.add("primary");
          for (const node of button.childNodes)
            if (node.nodeType === 3)
              node.textContent = node.textContent.replace(/^\s*\+\s*/, "");
        }
        button.prepend(icon(kind));
      }
    }
    function enhanceDrawers() {
      for (const drawer of document.querySelectorAll("dialog.app-drawer")) {
        if (drawer.dataset.uiDrawer) continue;
        drawer.dataset.uiDrawer = "true";
        const focused = drawer.contains(document.activeElement)
          ? document.activeElement
          : null;
        const form = drawer.querySelector(":scope > form"),
          container = form || drawer;
        const originalChildren = [...container.children],
          heading = container.querySelector("h2,h3");
        if (!heading) continue;
        const header = document.createElement("div");
        header.className = "ui-drawer-header";
        const close = document.createElement("button");
        close.type = "button";
        close.className = "ui-drawer-close";
        close.setAttribute("aria-label", "Drawer schliessen");
        close.append(icon("close"));
        close.onclick = () => drawer.close("cancel");
        const headingParent = heading.parentElement,
          headingNext = heading.nextSibling;
        header.append(heading, close);
        const body = document.createElement("div");
        body.className = "ui-drawer-body";
        const footer = document.createElement("div");
        footer.className = "ui-drawer-footer";
        for (const child of originalChildren) {
          if (child === heading) continue;
          const isFooter =
            child.matches(".crud-actions,.actions") ||
            (!form && child.tagName === "BUTTON") ||
            (form &&
              child.tagName === "DIV" &&
              child.querySelector('button[type="submit"]'));
          if (isFooter) footer.append(child);
          else body.append(child);
        }
        container.append(header, body, footer);
        container.classList.add("ui-drawer-layout");
        if (form) drawer.classList.add("ui-drawer-with-form");
        // Responsibility drawers move a persistent editor into a temporary modal. Restore its heading too.
        if (!form)
          drawer.addEventListener(
            "close",
            () => {
              if (headingNext?.parentNode === headingParent)
                headingParent.insertBefore(heading, headingNext);
              else headingParent.prepend(heading);
            },
            { once: true },
          );
        if (focused?.isConnected) focused.focus({ preventScroll: true });
      }
    }
    function refresh() {
      decorateActions();
      enhanceDrawers();
      for (const error of document.querySelectorAll(
        "dialog.app-drawer .app-save-error",
      )) {
        const body = error.closest("dialog").querySelector(".ui-drawer-body");
        if (body && !body.contains(error)) body.append(error);
      }
    }
    new MutationObserver(refresh).observe(document.body, {
      childList: true,
      subtree: true,
    });
    refresh();
  })();
}
