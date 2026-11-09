export function initialize(app, browser = globalThis) {
  (function () {
    "use strict";
    const select = document.getElementById("v3team");
    if (!select) return;
    function synchronize() {
      let data;
      try {
        data = JSON.parse(
          app.UTGStorage.rawGet("gever-art-leistungsmatrix-v1") || "{}",
        );
      } catch {
        return;
      }
      const teams = Array.isArray(data.teams) ? data.teams : [];
      const previous = select.value;
      select.replaceChildren(
        ...teams.map((t) => {
          const o = document.createElement("option");
          o.value = t.id;
          o.textContent = t.name;
          return o;
        }),
      );
      if (teams.some((t) => t.id === previous)) select.value = previous;
      else if (teams.some((t) => t.id === data.selected))
        select.value = data.selected;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    }
    app.addEventListener("utg:teams-changed", synchronize);
  })();
}
