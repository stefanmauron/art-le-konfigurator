export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    function open(target) {
      const nav = document.querySelectorAll("#utg-nav button");
      if (target.kind === "service" || target.kind === "config") {
        nav[1]?.click();
        if (target.kind === "service" && target.id)
          app.UTGWorkspace.openService(target.id);
        else {
          const section = document.getElementById(
            target.section || "crud-management",
          );
          section?.scrollIntoView({ block: "start" });
          section?.querySelector("input,button,select")?.focus();
        }
        return;
      }
      nav[3]?.click();
      const selector = document.getElementById("model-view");
      selector.value = target.team ? "team:" + target.team : "reference";
      selector.dispatchEvent(new Event("change", { bubbles: true }));
      const index = app.UTGFlow.states.indexOf(target.stage || "Funnel"),
        button = document.querySelector(
          '#utg33policybar [data-policy="' + Math.max(0, index) + '"]',
        );
      button?.click();
      const detail = document.getElementById("utg33detail");
      detail?.scrollIntoView({ block: "start" });
      if (target.kind === "criteria")
        app.UTGFlowCriteriaUI.open(
          target.stage || "Funnel",
          target.team || "",
          target.type,
        );
      else detail?.querySelector("input,textarea,select")?.focus();
    }
    app.UTGReviewNavigation = Object.freeze({ open });
  })();
}
