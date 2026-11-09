export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const V2 = "gever-art-leistungsmatrix-v1",
      V3 = "gever-art-v3-config";
    const read = (k) => app.UTGStorage.read(k);
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
    const page = document.querySelectorAll(".utg-page")[1];
    if (!page) return;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "crud-management";
    panel.innerHTML =
      '<h2>Teams und Produkte verwalten</h2><p class="hint">Teams können zuerst ohne Produkt angelegt werden. Für die aktive Leistungsmatrix muss jedem Team mindestens ein Produkt zugeordnet sein. Jedes Produkt gehört genau einem Team. Pro Team gilt ein gemeinsamer End-to-End-Flow für alle seine Produkte.</p><div class="crud-columns"><div><h3>Teams</h3><div id="crud-teams"></div><button id="crud-add-team" type="button">+ Team erstellen</button></div><div><h3>Produkte</h3><div id="crud-products"></div><button id="crud-add-product" type="button">+ Produkt erstellen</button></div></div>';
    page.insertBefore(panel, page.firstChild);
    const css = document.createElement("style");
    css.textContent =
      ".crud-columns{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}.crud-entry{padding:10px 0;border-bottom:1px solid #e3e9f0}.crud-entry-head{display:flex;align-items:center;gap:7px}.crud-entry strong{flex:1;overflow-wrap:anywhere;font-size:var(--text-body)}.crud-entry button{padding:7px 9px;font-size:12px}.crud-entry button.danger{color:#a12c36;border-color:#dfb3b6}.crud-entry small{display:block;color:#65748a;margin-top:4px;overflow-wrap:anywhere}.crud-columns h3{margin:5px 0 8px}.crud-form{border:1px solid #d7e0ea;padding:14px;margin:12px 0;border-radius:9px;background:#f8fafc}.crud-form label{display:block;font-size:var(--text-body);font-weight:600;margin:10px 0 4px}.crud-form input[type=text],.crud-form input[type=url],.crud-form textarea{width:100%;box-sizing:border-box;padding:9px;border:1px solid #bccbdb;border-radius:6px;background:white}.crud-form textarea{min-height:90px;resize:vertical}.crud-check{display:flex;gap:8px;align-items:center;padding:5px 0}.crud-check input{width:auto}.crud-actions{display:flex;gap:8px;margin-top:14px;flex-wrap:wrap}.crud-url{color:#175a99;overflow-wrap:anywhere}@media(max-width:760px){.crud-columns{grid-template-columns:minmax(0,1fr)}}";
    document.head.appendChild(css);
    function assigned(t, v3) {
      return Array.isArray(t.productIds)
        ? t.productIds
        : v3.products
            .filter((p) => Object.hasOwn(v3.configs || {}, t.id + "::" + p.id))
            .map((p) => p.id);
    }
    function owner(pid, v2, v3, exclude) {
      return (v2.teams || []).find(
        (t) => t.id !== exclude && assigned(t, v3).includes(pid),
      );
    }
    function draw() {
      const v2 = read(V2) || { teams: [] },
        v3 = read(V3) || { products: [], configs: {} };
      for (const [target, items, type] of [
        ["crud-teams", v2.teams || [], "team"],
        ["crud-products", v3.products || [], "product"],
      ]) {
        const el = document.getElementById(target);
        el.replaceChildren();
        if (!items.length) {
          el.textContent = "Keine Einträge vorhanden.";
          continue;
        }
        items.forEach((item) => {
          const row = document.createElement("div");
          row.className = "crud-entry";
          const head = document.createElement("div");
          head.className = "crud-entry-head";
          head.innerHTML =
            "<strong>" +
            esc(item.name) +
            '</strong><button type="button">Bearbeiten</button><button type="button" class="danger">Löschen</button>';
          head.children[1].onclick = () => form(type, item.id);
          head.children[2].onclick = () => del(type, item.id);
          row.appendChild(head);
          const info = document.createElement("small");
          if (type === "team") {
            const names = v3.products
              .filter((p) => assigned(item, v3).includes(p.id))
              .map((p) => p.name);
            info.textContent =
              "Produkte: " +
              (names.join(", ") ||
                "Noch kein Produkt zugeordnet – bitte vor der Flow-Konfiguration zuordnen");
          } else {
            if (item.description) {
              const preview = document.createElement("div");
              preview.className = "app-activity-description";
              const text = document.createElement("span");
              text.className = "app-description-text";
              text.id = "product-description-" + item.id;
              text.textContent = item.description;
              const toggle = document.createElement("button");
              toggle.type = "button";
              toggle.className = "app-description-toggle";
              toggle.textContent = "+";
              toggle.hidden = true;
              toggle.setAttribute("aria-label", "Beschreibung aufklappen");
              toggle.setAttribute("aria-expanded", "false");
              toggle.setAttribute("aria-controls", text.id);
              preview.append(text, toggle);
              info.append(preview);
            } else info.textContent = "Keine Beschreibung";
            if (item.wikiUrl) {
              const link = document.createElement("a");
              link.href = item.wikiUrl;
              link.target = "_blank";
              link.rel = "noopener noreferrer";
              link.className = "crud-url";
              link.textContent = "Wiki öffnen";
              info.append(" · ", link);
            }
          }
          row.appendChild(info);
          el.appendChild(row);
        });
      }
    }
    function form(type, id) {
      document.getElementById("crud-edit-form")?.closest("dialog")?.remove();
      const v2 = read(V2) || { teams: [] },
        v3 = read(V3) || {
          schema: 3,
          products: [],
          configs: {},
          services: [],
          policies: [],
        };
      const isTeam = type === "team",
        items = isTeam ? v2.teams : v3.products,
        item = id ? items.find((x) => x.id === id) : null;
      const form = document.createElement("form");
      form.id = "crud-edit-form";
      form.className = "crud-form";
      form.innerHTML =
        "<h3>" +
        (item ? "Bearbeiten" : "Erstellen") +
        ": " +
        (isTeam ? "Team" : "Produkt") +
        '</h3><label for="crud-name">Name</label><input id="crud-name" type="text" required maxlength="160" value="' +
        esc(item?.name || "") +
        '">' +
        (isTeam
          ? '<label>Produkte dieses Teams</label><div id="crud-memberships"></div>'
          : '<label for="crud-description">Produktbeschreibung</label><textarea id="crud-description" placeholder="Was ist das Produkt?">' +
            esc(item?.description || "") +
            '</textarea><label for="crud-wiki">Wiki-Link (URL)</label><input id="crud-wiki" type="url" placeholder="https://..." value="' +
            esc(item?.wikiUrl || "") +
            '">') +
        '<div class="crud-actions"><button class="primary" type="submit">Übernehmen</button><button type="button" id="crud-cancel">Abbrechen</button></div>';
      if (isTeam) {
        const container = form.querySelector("#crud-memberships");
        const ids = item ? assigned(item, v3) : [];
        v3.products.forEach((p) => {
          const label = document.createElement("label");
          label.className = "crud-check";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.value = p.id;
          cb.checked = ids.includes(p.id);
          const occupied = owner(p.id, v2, v3, item?.id);
          cb.disabled = !!occupied;
          label.append(
            cb,
            document.createTextNode(
              p.name + (occupied ? " (zugeordnet: " + occupied.name + ")" : ""),
            ),
          );
          container.appendChild(label);
        });
        if (!v3.products.length)
          container.textContent = "Bitte zuerst ein Produkt erstellen.";
      }
      const drawer =
        app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
      drawer.className = "app-drawer";
      form.querySelector("h3").id = "crud-drawer-title";
      drawer.setAttribute("aria-labelledby", "crud-drawer-title");
      drawer.appendChild(form);
      document.body.appendChild(drawer);
      drawer.addEventListener("close", () => drawer.remove(), { once: true });
      form.querySelector("#crud-name").autofocus = true;
      drawer.showModal();
      form.querySelector("#crud-cancel").onclick = () => drawer.close();
      form.querySelector("#crud-name").focus();
      form.onsubmit = (e) => {
        e.preventDefault();
        try {
          const v2 = read(V2),
            v3 = read(V3),
            items = isTeam ? v2.teams : v3.products,
            item = id ? items.find((x) => x.id === id) : null;
          if (id && !item)
            throw Error("Dieser Eintrag wurde inzwischen entfernt.");
          const name = form.querySelector("#crud-name").value.trim();
          if (!name) return;
          if (
            items.some(
              (x) =>
                x.id !== id &&
                x.name.toLocaleLowerCase("de-CH") ===
                  name.toLocaleLowerCase("de-CH"),
            )
          )
            return alert("Dieser Name existiert bereits.");
          const record = item || {
            id:
              (isTeam ? "team-" : "product-") +
              Date.now() +
              "-" +
              Math.random().toString(36).slice(2, 7),
            name,
          };
          record.name = name;
          if (isTeam) {
            const previous = item ? assigned(item, v3) : [];
            const chosen = [
              ...form.querySelectorAll("#crud-memberships input:checked"),
            ].map((c) => c.value);
            if (!chosen.length && item && previous.length)
              return alert(
                "Das letzte Produkt eines Teams kann nicht entfernt werden.",
              );
            if (chosen.some((pid) => owner(pid, v2, v3, record.id)))
              return alert(
                "Ein Produkt ist bereits einem anderen Team zugeordnet.",
              );
            record.productIds = chosen;
            if (!item) {
              record.assignments = {};
              record.description = "";
              items.push(record);
            }
            /* Ein Team besitzt einen gemeinsamen Flow; Produktwechsel löscht keine Flow-Konfiguration. */ v2.selected =
              record.id;
            v3.team = record.id;
            v3.product = chosen[0] || "";
            app.UTGDesignCriteria.ensureTeams(v3, v2.teams, true);
            app.UTGStorage.commitPair(v2, v3);
            app.UTGFlowUX?.setTeam(record.id);
          } else {
            record.description = form
              .querySelector("#crud-description")
              .value.trim();
            record.wikiUrl = form.querySelector("#crud-wiki").value.trim();
            app.UTGStorage.validateWikiUrl(record.wikiUrl, record.name);
            if (!item) items.push(record);
            v3.product = record.id;
            app.UTGStorage.commitPair(v2, v3);
          }
          app.UTGEdits.closeSaved(drawer);
          app.UTGFeedback?.beforeReload();
          location.reload();
        } catch (error) {
          let message = form.querySelector(".app-save-error");
          if (!message) {
            message = document.createElement("p");
            message.className = "app-save-error app-open-value";
            message.setAttribute("role", "alert");
            form.append(message);
          }
          message.textContent = error.message;
        }
      };
      form.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
    function del(type, id) {
      try {
        const v2 = read(V2),
          v3 = read(V3);
        if (!v2 || !v3) return;
        const isTeam = type === "team",
          items = isTeam ? v2.teams : v3.products,
          item = items.find((x) => x.id === id);
        if (!item) return;
        const keys = Object.keys(v3.configs || {}).filter((k) =>
          isTeam
            ? k.startsWith(id + "::")
            : k.endsWith("::" + id) && !k.endsWith("::flow"),
        );
        if (!isTeam) {
          const owning = (v2.teams || []).find(
            (t) => assigned(t, v3).includes(id) && assigned(t, v3).length === 1,
          );
          if (owning)
            return alert(
              "Das Produkt ist das einzige Produkt von «" +
                owning.name +
                "». Bitte zuerst ein anderes Produkt zuordnen.",
            );
        }
        if (
          !confirm(
            (isTeam ? "Team" : "Produkt") +
              " «" +
              item.name +
              "» löschen? " +
              keys.length +
              " Matrix-Konfiguration(en) werden entfernt.",
          )
        )
          return;
        if (isTeam) {
          v2.teams = items.filter((x) => x.id !== id);
          if (v3.teamContracts) delete v3.teamContracts[id];
          if (v3.agreementConfirmations) delete v3.agreementConfirmations[id];
          if (v3.flowCriteria?.profiles) delete v3.flowCriteria.profiles[id];
          if (v3.flowCriteria?.teams) delete v3.flowCriteria.teams[id];
          if (v3.teamDesignAssessments) delete v3.teamDesignAssessments[id];
          if (v3.teamDesignCriteria) delete v3.teamDesignCriteria[id];
          if (v2.selected === id) v2.selected = v2.teams[0]?.id || null;
          if (v3.team === id) v3.team = v2.teams[0]?.id || "";
        } else {
          v3.products = items.filter((x) => x.id !== id);
          v2.teams.forEach((t) => {
            if (Array.isArray(t.productIds))
              t.productIds = t.productIds.filter((pid) => pid !== id);
          });
          if (v3.product === id) v3.product = v3.products[0]?.id || "";
        }
        keys.forEach((k) => delete v3.configs[k]);
        app.UTGStorage.commitPair(v2, v3);
        app.UTGFeedback?.beforeReload();
        location.reload();
      } catch (error) {
        let message = panel.querySelector(".app-save-error");
        if (!message) {
          message = document.createElement("p");
          message.className = "app-save-error app-open-value";
          message.setAttribute("role", "alert");
          panel.append(message);
        }
        message.textContent = error.message;
      }
    }
    document.getElementById("crud-add-team").onclick = () => form("team");
    document.getElementById("crud-add-product").onclick = () => form("product");
    app.addEventListener("gever-v3-updated", draw);
    draw();
  })();
}
