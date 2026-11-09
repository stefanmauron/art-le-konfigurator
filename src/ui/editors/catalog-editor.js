export function initialize(app, browser = globalThis) {
  const window = browser;

  (() => {
    "use strict";
    const key = "gever-art-v3-config",
      page = document.getElementById("utg-page-2");
    if (!page) return;
    const read = () => {
      try {
        return JSON.parse(app.UTGStorage.rawGet(key) || "{}");
      } catch {
        return {};
      }
    };
    const save = (d) => {
      app.UTGModels.normalizeProviders(d);
      app.UTGModels.normalizeEmbeddings(d);
      const bundle = app.UTGStorage.bundle();
      bundle.v3 = d;
      app.UTGStorage.validateBundle(bundle);
      app.UTGStorage.rawSet(key, JSON.stringify(d));
      window.dispatchEvent(new Event("utg-catalog-changed"));
      window.dispatchEvent(new Event("gever-v3-updated"));
    };
    const escape = (x) =>
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
    const defaults = {
      providers: ["UTG-ART", "ISCeco", "BIT", "Rubicon"],
      embeddings: app.UTGModels.embeddings,
      interactions: app.UTGModels.interactions,
    };
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "utg-masterdata";
    panel.innerHTML =
      '<h2>Leistungserbringer, Einbindung und Zusammenarbeit verwalten</h2><p class="hint">Hier definierte Werte stehen anschliessend in der Leistungsmatrix und bei den LE-Services zur Auswahl. Bestehende Zuordnungen bleiben bei einer Umbenennung erhalten.</p><div class="utg-catalog-grid"><section class="utg-catalog-card" aria-labelledby="utg-providers-title"><div class="utg-catalog-header"><div class="utg-catalog-title"><h3 id="utg-providers-title">Ausführende Einheit / Leistungserbringer</h3><span class="utg-catalog-help"><button type="button" class="app-section-info" aria-label="Info: Leistungserbringer" aria-describedby="utg-providers-help">i</button><span class="app-column-tooltip" role="tooltip" id="utg-providers-help">Welche Einheit führt die Tätigkeit aus? UTG-ART bezeichnet hier die Ausführung im ART, nicht automatisch das betrachtete Team. BIT und ISCeco sind lokale Beispiele; ihr Name legt die Einbindung nicht fest. Diese Anbieter stehen in der Leistungsmatrix und bei den LE-Services zur Auswahl. Umbenennungen werden in bestehenden Zuordnungen nachgeführt.</span></span></div><button type="button" id="utg-add-provider" aria-label="Leistungserbringer: Eintrag hinzufügen">+ Hinzufügen</button></div><div class="utg-catalog-list" id="utg-providers"></div></section><section class="utg-catalog-card" aria-labelledby="utg-embeddings-title"><div class="utg-catalog-header"><div class="utg-catalog-title"><h3 id="utg-embeddings-title">Einbindung</h3><span class="utg-catalog-help"><button type="button" class="app-section-info" aria-label="Info: Einbindung" aria-describedby="utg-embeddings-help">i</button><span class="app-column-tooltip" role="tooltip" id="utg-embeddings-help">Wie ist die Leistung relativ zum betrachteten Team und ART eingebunden? Arbeitgeber, organisatorische Einbindung und Zusammenarbeit sind getrennte Angaben. Die Auswahl wirkt in LE-Services, Leistungsmatrix und Operating Model. Einbindung und Zusammenarbeit werden unabhängig gepflegt.</span></span></div><button type="button" id="utg-add-embedding" aria-label="Einbindung: Eintrag hinzufügen">+ Hinzufügen</button></div><div class="utg-catalog-list" id="utg-embeddings"></div></section><section class="utg-catalog-card" aria-labelledby="utg-interactions-title"><div class="utg-catalog-header"><div class="utg-catalog-title"><h3 id="utg-interactions-title">Zusammenarbeit</h3><span class="utg-catalog-help"><button type="button" class="app-section-info" aria-label="Info: Zusammenarbeit" aria-describedby="utg-interactions-help">i</button><span class="app-column-tooltip" role="tooltip" id="utg-interactions-help">Wie arbeiten Team und Leistungserbringer zusammen? Die Auswahl wirkt als Servicevorgabe oder individuelle Vereinbarung in der Leistungsmatrix und im Operating Model.</span></span></div><button type="button" id="utg-add-interaction" aria-label="Zusammenarbeit: Eintrag hinzufügen">+ Hinzufügen</button></div><div class="utg-catalog-list" id="utg-interactions"></div></section></div>';
    const help = document.createElement("div");
    help.className = "utg-model-help";
    help.innerHTML =
      '<h3>Welche Frage beantwortet die Auswahl?</h3><p><strong>Einbindung:</strong> Im Team integriert = Planung und Leistungserbringung innerhalb des betrachteten Teams, unabhängig vom Arbeitgeber; Anderes Team im selben ART = eigenständiges anderes Team innerhalb desselben ART mit eigenem Backlog; Shared Services = geteilte Spezialkompetenz mit abgestimmter Verfügbarkeit und Lieferbeiträgen; nicht automatisch standardisierter Servicebezug; ausserhalb des ART = anderes ART, zentrale Organisationseinheit oder externer Anbieter; nicht zwingend ausserhalb der Organisation.</p><p><strong>Zusammenarbeit:</strong> Gemeinsame Erarbeitung = gemeinsames Ergebnis und Prüftermin; Servicebezug = vereinbarter Leistungs-, Bestell-, Liefer- und Supportweg; Befähigung = vereinbartes Lernziel und Prüftermin für die Selbstständigkeit; Beratung / punktuelle Unterstützung = zeitlich begrenzte fachliche Unterstützung zu einer konkreten Frage, ohne gemeinsamen Lieferauftrag oder umfassenden Kompetenzaufbau. Dieser vierte Eintrag ist eine lokale Ergänzung zu den drei Interaktionsformen aus Team Topologies. Bei teaminterner Arbeit kann «Nicht erforderlich» gewählt werden.</p><p><strong>Erfassungsregel bei Überschneidungen:</strong> Vollständig im betrachteten Team integriert hat Vorrang. Bei einem eigenständigen anderen Team im selben ART wähle diese Einbindung. Andernfalls verwende Shared Services für geteilte Spezialkompetenz mit vereinbarter Verfügbarkeit, auch ausserhalb des ART; die konkrete Einheit und ihre Lage hältst du in der Notiz fest. Für übrige externe Einheiten wähle ausserhalb des ART. Die Shared-Service-Zählung beschreibt geteilte Spezialkompetenz und ist keine separate Auswertung der ART-Zugehörigkeit. Beispiel: BIT kann im Team integriert arbeiten oder einen Service von ausserhalb liefern.</p><p>Erfasse die für diese Tätigkeit vereinbarte Einbindung relativ zum betrachteten Team und ART. Herkunft des Leistungserbringers und Form der Zusammenarbeit werden separat angegeben. Bei zeitweiser Einbettung entscheidet die tatsächlich vereinbarte Einbindung für die Tätigkeit. Einbindung und Zusammenarbeit sind unabhängig. Diese Ausgestaltung verbindet SAFe-orientierte Einbindung mit Interaktionsformen aus Team Topologies. Aus alten Modellen nicht eindeutig ableitbare Angaben bleiben «Noch zu klären».</p><p><a href="https://framework.scaledagile.com/shared-services" target="_blank" rel="noopener">SAFe: Shared Services</a> · <a href="https://teamtopologies.com/key-concepts-content/team-interaction-modeling-with-team-topologies" target="_blank" rel="noopener">Team Topologies: Interaktionsformen</a></p>';
    panel.appendChild(help);
    const service = document.getElementById("v3services");
    page.insertBefore(panel, service || null);
    const style = document.createElement("style");
    style.textContent =
      ".utg-catalog-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.utg-catalog-row{display:flex;align-items:center;gap:8px;border-bottom:1px solid #e3e9f0;padding:8px 0}.utg-catalog-row span{flex:1;overflow-wrap:anywhere}.utg-catalog-row button{padding:6px 9px}@media(max-width:800px){.utg-catalog-grid{grid-template-columns:1fr}}";
    document.head.appendChild(style);
    function list(type) {
      let d = read();
      return Array.isArray(d[type]) ? d[type] : defaults[type];
    }
    function draw() {
      for (const [type, id] of [
        ["providers", "utg-providers"],
        ["embeddings", "utg-embeddings"],
        ["interactions", "utg-interactions"],
      ]) {
        const host = document.getElementById(id);
        host.replaceChildren();
        if (!list(type).length) {
          const empty = document.createElement("p");
          empty.className = "utg-catalog-empty";
          empty.textContent = "Noch keine Einträge.";
          host.append(empty);
        }
        list(type).forEach((value, index) => {
          const row = document.createElement("div");
          row.className = "utg-catalog-row";
          const label = document.createElement("span");
          label.textContent = value;
          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "utg-catalog-icon-action";
          edit.innerHTML =
            '<svg class="ui-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m16 3 5 5L8 21H3v-5Z"/><path d="m14 5 5 5"/></svg><span class="utg-catalog-action-label">Bearbeiten</span>';
          edit.dataset.uiAction = "edit";
          edit.title = value + " bearbeiten";
          edit.setAttribute("aria-label", value + " bearbeiten");
          edit.onclick = () =>
            app.UTGDialogs.editName({
              title: {
                providers: "Leistungserbringer bearbeiten",
                embeddings: "Einbindung bearbeiten",
                interactions: "Form der Zusammenarbeit bearbeiten",
              }[type],
              value,
              extraField:
                type === "embeddings"
                  ? {
                      label: "Fachliche Kategorie",
                      value: app.UTGModels.embeddingKind(read(), value),
                      options: app.UTGModels.embeddingCategories,
                    }
                  : undefined,
              submit: (name, description, kind) => {
                const d = read();
                d[type] ??= defaults[type].slice();
                app.UTGModels.validateCatalogName(d, type, name, value);
                if (name === value && type !== "embeddings") return;
                if (
                  d[type].some(
                    (v, i) =>
                      v.toLocaleLowerCase("de-CH") ===
                        name.toLocaleLowerCase("de-CH") && i !== index,
                  )
                )
                  throw Error("Dieser Name ist bereits vorhanden.");
                if (type === "embeddings") {
                  app.UTGModels.renameEmbedding(d, value, name);
                  d.embeddingKinds[name] =
                    kind || app.UTGModels.embeddingKind(d, name);
                }
                if (type === "providers")
                  app.UTGModels.renameProvider(d, value, name);
                d[type][index] = name;
                for (const service of d.services || [])
                  if (
                    service[
                      type === "providers"
                        ? "provider"
                        : type === "embeddings"
                          ? "embedding"
                          : "interaction"
                    ] === value
                  )
                    service[
                      type === "providers"
                        ? "provider"
                        : type === "embeddings"
                          ? "embedding"
                          : "interaction"
                    ] = name;
                for (const cfg of Object.values(d.configs || {}))
                  for (const entry of Object.values(cfg.entries || {}))
                    if (
                      entry[
                        type === "providers"
                          ? "org"
                          : type === "embeddings"
                            ? "embedding"
                            : "interaction"
                      ] === value
                    )
                      entry[
                        type === "providers"
                          ? "org"
                          : type === "embeddings"
                            ? "embedding"
                            : "interaction"
                      ] = name;
                save(d);
                draw();
              },
            });
          const del = document.createElement("button");
          del.type = "button";
          del.className = "utg-catalog-icon-action";
          del.innerHTML =
            '<svg class="ui-action-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/></svg><span class="utg-catalog-action-label">Löschen</span>';
          del.dataset.uiAction = "delete";
          del.title = value + " löschen";
          del.setAttribute("aria-label", value + " löschen");
          del.onclick = () => {
            const d = read();
            d[type] ??= defaults[type].slice();
            const field =
              type === "providers"
                ? "org"
                : type === "embeddings"
                  ? "embedding"
                  : "interaction";
            const sf =
              type === "providers"
                ? "provider"
                : type === "embeddings"
                  ? "embedding"
                  : "interaction";
            const direct = Object.values(d.configs || {}).reduce(
                (n, c) =>
                  n +
                  Object.values(c.entries || {}).filter(
                    (e) => e[field] === value,
                  ).length,
                0,
              ),
              services = (d.services || []).filter(
                (s) => s[sf] === value,
              ).length;
            if (
              !confirm(
                "«" +
                  value +
                  "» löschen? " +
                  services +
                  " Servicevorgaben und " +
                  direct +
                  " direkte Matrixzuordnungen werden auf «Noch zu klären» gesetzt. Weitere Tätigkeiten können indirekt über Servicevorgaben betroffen sein.",
              )
            )
              return;
            if (type === "providers" && d.providerRecords)
              d.providerRecords = d.providerRecords.filter(
                (r) => r.name !== value,
              );
            if (type === "embeddings" && d.embeddingKinds)
              delete d.embeddingKinds[value];
            d[type].splice(index, 1);
            for (const service of d.services || [])
              if (service[sf] === value) service[sf] = "Noch zu klären";
            for (const cfg of Object.values(d.configs || {}))
              for (const entry of Object.values(cfg.entries || {}))
                if (entry[field] === value) entry[field] = "Noch zu klären";
            try {
              save(d);
              draw();
            } catch (error) {
              app.UTGFeedback?.failure(
                "Der Eintrag konnte nicht gelöscht werden. Bitte erneut versuchen. " +
                  error.message,
              );
            }
          };
          row.append(label, edit, del);
          host.append(row);
        });
      }
    }
    function createCatalogEntry(type, trigger) {
      const titles = {
        providers: "Leistungserbringer erstellen",
        embeddings: "Einbindung erstellen",
        interactions: "Form der Zusammenarbeit erstellen",
      };
      const drawer =
        app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
      drawer.className = "app-drawer";
      drawer.setAttribute("aria-labelledby", "utg-catalog-create-title");
      const form = document.createElement("form");
      form.className = "crud-form";
      const heading = document.createElement("h2");
      heading.id = "utg-catalog-create-title";
      heading.textContent = titles[type];
      const label = document.createElement("label");
      label.htmlFor = "utg-catalog-create-name";
      label.textContent = "Name";
      const input = document.createElement("input");
      input.id = "utg-catalog-create-name";
      input.type = "text";
      input.required = true;
      input.maxLength = 160;
      input.autofocus = true;
      const error = document.createElement("p");
      error.className = "app-open-value";
      error.setAttribute("role", "alert");
      error.hidden = true;
      const actions = document.createElement("div");
      actions.className = "crud-actions";
      const accept = document.createElement("button");
      accept.type = "submit";
      accept.className = "primary";
      accept.textContent = "Übernehmen";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Abbrechen";
      cancel.onclick = () => drawer.close();
      let category;
      if (type === "embeddings") {
        const categoryLabel = document.createElement("label");
        categoryLabel.htmlFor = "utg-catalog-create-kind";
        categoryLabel.textContent = "Fachliche Kategorie";
        category = document.createElement("select");
        category.id = "utg-catalog-create-kind";
        for (const [value, text] of app.UTGModels.embeddingCategories) {
          const option = document.createElement("option");
          option.value = value;
          option.textContent = text;
          category.append(option);
        }
        category.value = "custom";
        form.append(heading, label, input, categoryLabel, category);
      } else form.append(heading, label, input);
      actions.append(accept, cancel);
      form.append(error, actions);
      drawer.append(form);
      input.addEventListener("input", () => {
        input.setCustomValidity("");
        error.hidden = true;
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        let name = input.value.trim();
        const d = read();
        d[type] ??= defaults[type].slice();
        if (!name) {
          input.setCustomValidity("Bitte einen Namen eingeben.");
          input.reportValidity();
          return;
        }
        if (
          d[type].some(
            (value) =>
              value.trim().toLocaleLowerCase("de-CH") ===
              name.toLocaleLowerCase("de-CH"),
          )
        ) {
          input.setCustomValidity("Dieser Name ist bereits vorhanden.");
          input.reportValidity();
          return;
        }
        try {
          app.UTGModels.validateCatalogName(d, type, name);
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
          return;
        }
        const existingProvider =
          type === "providers"
            ? d.providerRecords?.find(
                (r) =>
                  r.name.trim().toLocaleLowerCase("de-CH") ===
                  name.toLocaleLowerCase("de-CH"),
              )
            : null;
        if (existingProvider) name = existingProvider.name;
        d[type].push(name);
        if (type === "embeddings") {
          d.embeddingKinds ??= {};
          d.embeddingKinds[name] = category.value;
        }
        if (type === "providers") {
          app.UTGModels.normalizeProviders(d);
          if (!existingProvider)
            d.providerRecords.find((r) => r.name === name).kind = "other";
        }
        try {
          save(d);
        } catch (err) {
          error.textContent =
            "Der Eintrag konnte nicht lokal gespeichert werden. Bitte erneut versuchen.";
          error.hidden = false;
          return;
        }
        draw();
        app.UTGEdits.closeSaved(drawer);
      });
      drawer.addEventListener(
        "close",
        () => {
          drawer.remove();
          trigger.focus();
        },
        { once: true },
      );
      document.body.append(drawer);
      drawer.showModal();
    }
    for (const [type, id] of [
      ["providers", "utg-add-provider"],
      ["embeddings", "utg-add-embedding"],
      ["interactions", "utg-add-interaction"],
    ]) {
      const button = document.getElementById(id);
      button.onclick = () => createCatalogEntry(type, button);
    }
    app.addEventListener("gever-v3-updated", draw);
    draw();
  })();
}
