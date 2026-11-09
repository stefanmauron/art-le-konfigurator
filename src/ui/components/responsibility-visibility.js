export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const STORAGE = "utg-model-show-responsibilities-v1";
    const model = document.getElementById("operating-model"),
      target = document.getElementById("model-content"),
      selector = document.getElementById("model-view");
    if (!model || !target || !selector) return;
    const controls =
      model.querySelector(".model-controls") ||
      model.querySelector(".model-head");
    const label = document.createElement("label");
    label.id = "utg-responsibility-switch";
    const check = document.createElement("input");
    check.type = "checkbox";
    try {
      check.checked = app.UTGStorage.rawGet(STORAGE) === "true";
    } catch {}
    label.append(
      check,
      document.createTextNode("Verantwortlichkeiten je Tätigkeit anzeigen"),
    );
    controls.append(label);
    const fields = [
      ["business", "Fachlich"],
      ["technical", "Technisch"],
      ["operations", "Betrieb"],
    ];
    const read = () => {
      try {
        return JSON.parse(app.UTGStorage.rawGet("gever-art-v3-config") || "{}");
      } catch {
        return {};
      }
    };
    function render() {
      const teamId = selector.value.startsWith("team:")
        ? selector.value.slice(5)
        : "";
      check.disabled = !teamId;
      label.style.opacity = teamId ? "1" : ".5";
      label.title = teamId
        ? "Verantwortlichkeiten aus der Leistungsmatrix anzeigen"
        : "Bitte zuerst ein Team auswählen";
      target
        .querySelectorAll(".utg-task-responsibilities")
        .forEach((el) => el.remove());
      if (!teamId || !check.checked) return;
      const data = read(),
        product = document.getElementById("v3product")?.value || data.product;
      const config =
        data.configs?.[teamId + "::flow"] ||
        data.configs?.[teamId + "::" + product];
      const entries = config?.entries || {};
      target.querySelectorAll(".flow-tasks li").forEach((li) => {
        const name = (
          li.querySelector(":scope > span:first-child")?.textContent ||
          li.firstChild?.textContent ||
          ""
        )
          .replace(/\s*\(begleitend\)\s*$/, "")
          .trim();
        if (!name) return;
        const entry = entries[name] || {};
        const detail = document.createElement("div");
        detail.className = "utg-task-responsibilities";
        fields.forEach(([field, title]) => {
          const line = document.createElement("span"),
            heading = document.createElement("b");
          heading.textContent = title + ": ";
          line.append(
            heading,
            document.createTextNode(String(entry[field] || "Nicht zugewiesen")),
          );
          detail.append(line);
        });
        li.append(detail);
      });
    }
    check.addEventListener("change", () => {
      try {
        app.UTGStorage.rawSet(STORAGE, String(check.checked));
      } catch {}
      render();
    });
    selector.addEventListener("change", () => queueMicrotask(render));
    app.addEventListener("gever-v3-updated", () => queueMicrotask(render));
    app.addEventListener("storage", render);
    const product = document.getElementById("v3product");
    product?.addEventListener("change", render);
    new MutationObserver((mutations) => {
      if (
        mutations.some((m) =>
          [...m.addedNodes, ...m.removedNodes].some(
            (n) =>
              n.nodeType === 1 &&
              !n.classList?.contains("utg-task-responsibilities"),
          ),
        )
      )
        queueMicrotask(render);
    }).observe(target, { childList: true, subtree: true });
    render();
  })();
}
