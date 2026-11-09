export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const V2 = "gever-art-leistungsmatrix-v1",
      V3 = "gever-art-v3-config";
    const read = (k) => {
      try {
        return JSON.parse(app.UTGStorage.rawGet(k) || "null");
      } catch {
        return null;
      }
    };
    const esc = (x) =>
      String(x ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    const button = document.getElementById("utg-assign-products");
    if (!button) return;
    const dialog =
      app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
    dialog.id = "utg-assign-dialog";
    dialog.className = "app-drawer";
    dialog.setAttribute("aria-label", "Produkte dem Team zuordnen");
    dialog.innerHTML =
      '<form style="min-width:0;max-width:100%"><h2>Produkte dem Team zuordnen</h2><p id="utg-assign-team"></p><div id="utg-assign-choices" ></div><p class="hint">Bereits erfasste Leistungskonfigurationen bleiben auch beim Entfernen einer Zuordnung erhalten und werden bei erneuter Zuordnung wieder angezeigt.</p><div style="display:flex;gap:8px;justify-content:flex-end"><button value="cancel" type="button">Abbrechen</button><button class="primary" id="utg-assign-save" value="save" type="submit">Zuordnungen übernehmen</button></div></form>';
    document.body.appendChild(dialog);
    dialog.querySelector('button[value="cancel"]').onclick = () =>
      dialog.close("cancel");
    let selectedTeam = "";
    button.addEventListener("click", () => {
      const v2 = read(V2),
        v3 = read(V3),
        teamId = document.getElementById("v3team")?.value;
      const team = v2?.teams?.find((t) => t.id === teamId);
      if (!team) {
        alert("Bitte zuerst ein Team erstellen und auswählen.");
        return;
      }
      if (!v3?.products?.length) {
        alert(
          "Bitte zuerst unter «Teams und Produkte verwalten» ein Produkt erstellen.",
        );
        return;
      }
      selectedTeam = team.id;
      document.getElementById("utg-assign-team").textContent =
        "Team: " + team.name;
      const assigned = Array.isArray(team.productIds)
        ? team.productIds
        : v3.products
            .filter((p) =>
              Object.prototype.hasOwnProperty.call(
                v3.configs || {},
                team.id + "::" + p.id,
              ),
            )
            .map((p) => p.id);
      const owner = (pid) =>
        (v2.teams || []).find(
          (t) =>
            t.id !== team.id &&
            (Array.isArray(t.productIds)
              ? t.productIds.includes(pid)
              : Object.prototype.hasOwnProperty.call(
                  v3.configs || {},
                  t.id + "::" + pid,
                )),
        );
      document.getElementById("utg-assign-choices").innerHTML = v3.products
        .map(
          (p) =>
            '<label class="app-product-choice"><input type="checkbox" value="' +
            esc(p.id) +
            '" ' +
            (assigned.includes(p.id) ? "checked" : "") +
            (owner(p.id) ? " disabled" : "") +
            "><span>" +
            esc(p.name) +
            (owner(p.id)
              ? " (zugeordnet: " + esc(owner(p.id).name) + ")"
              : "") +
            "</span></label>",
        )
        .join("");
      dialog
        .querySelectorAll("[autofocus]")
        .forEach((element) => element.removeAttribute("autofocus"));
      const focusTarget =
        dialog.querySelector("#utg-assign-choices input:not(:disabled)") ||
        dialog.querySelector('button[value="cancel"]');
      focusTarget?.setAttribute("autofocus", "");
      dialog.showModal();
    });
    dialog.querySelector("form").addEventListener("submit", (event) => {
      if (event.submitter?.value !== "save") return;
      event.preventDefault();
      try {
        const v2 = read(V2),
          v3 = read(V3);
        const team = v2?.teams?.find((t) => t.id === selectedTeam);
        if (!team || !v3) return;
        const chosen = [
          ...dialog.querySelectorAll("#utg-assign-choices input:checked"),
        ].map((el) => el.value);
        if (!chosen.length) {
          alert(
            "Bitte mindestens ein Produkt auswählen, um die Leistungsmatrix für dieses Team zu aktivieren.",
          );
          return;
        }
        const occupied = chosen.find((pid) =>
          (v2.teams || []).some(
            (t) => t.id !== team.id && (t.productIds || []).includes(pid),
          ),
        );
        if (occupied) {
          alert("Dieses Produkt ist bereits einem anderen Team zugeordnet.");
          return;
        }
        team.productIds = chosen;
        v3.team = team.id;
        v3.product = chosen.includes(v3.product) ? v3.product : chosen[0] || "";
        app.UTGStorage.commitPair(v2, v3);
        dialog.close("save");
        app.UTGFeedback?.beforeReload();
        location.reload();
      } catch (error) {
        let message = dialog.querySelector(".app-save-error");
        if (!message) {
          message = document.createElement("p");
          message.className = "app-save-error app-open-value";
          message.setAttribute("role", "alert");
          dialog.querySelector("form").append(message);
        }
        message.textContent = error.message;
      }
    });
  })();
}
