export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const $ = (x) => document.getElementById(x),
      K = "gever-art-v3-config";
    const S = app.UTGFlow.states;
    let A = [];
    const E = [
      "Bedarf, Nutzen und Zuständigkeit für Analyse geklärt",
      "Akzeptanzkriterien, Lösungsansatz und LE-Abhängigkeiten geklärt",
      "Priorisiert und zur Umsetzung bereit; erforderliche Zusagen liegen vor",
      "Build und frühe Testnachweise vorhanden",
      "Integration, Security und E2E nachgewiesen",
      "Freigabe, Rollback und Betriebsbereitschaft geklärt",
      "Done-Kriterien erfüllt; Wirkungsmessung separat",
    ];
    const esc = (x) =>
      String(x ?? "").replace(
        /[&<>"']/g,
        (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
      );
    const id = () => Math.random().toString(36).slice(2);
    const newService = (name) => ({
      id: id(),
      name,
      provider: "ISCeco",
      embedding: "Noch zu klären",
      interaction: "Noch zu klären",
    });
    const fresh = () => app.UTGDefaults.baseline().v3;
    let d;
    try {
      d = JSON.parse(app.UTGStorage.rawGet(K));
      if (d?.schema !== 3 || !Array.isArray(d.products) || !d.configs)
        throw Error();
    } catch {
      d = fresh();
    }
    function refreshActivities() {
      d.activities ??= app.UTGDefaults.baseline().v3.activities;
      A = d.activities.map((a) => [a.phase, a.name]);
    }
    refreshActivities();
    function teams() {
      try {
        return (
          JSON.parse(app.UTGStorage.rawGet("gever-art-leistungsmatrix-v1"))
            ?.teams || []
        );
      } catch {
        return [];
      }
    }
    function assignedProducts(team) {
      if (!team) return [];
      return d.products.filter((p) =>
        Array.isArray(team.productIds)
          ? team.productIds.includes(p.id)
          : Object.hasOwn(d.configs || {}, team.id + "::" + p.id),
      );
    }
    function ensure() {
      let t = teams();
      if (!t.some((x) => x.id === d.team)) d.team = t[0]?.id || "";
      let available = assignedProducts(t.find((x) => x.id === d.team));
      if (!available.some((x) => x.id === d.product))
        d.product = available[0]?.id || "";
    }
    function old(v) {
      let m = {
        ART: ["ART", "Embedded"],
        "ART + ISCeco": ["ART + ISCeco", "Kooperation"],
        ISCeco: ["ISCeco", "Service Interface"],
        "Shared Team ISCeco": ["ISCeco", "Shared Service"],
        Linienorganisation: ["Linienorganisation", "Service Interface"],
        "BIT / anderer LE": ["BIT / anderer LE", "Service Interface"],
        "ART + anderer LE": ["ART + anderer LE", "Kooperation"],
        "Nicht erforderlich": ["Nicht erforderlich", "Nicht erforderlich"],
      };
      let a = m[v] || ["Noch zu klären", "Noch zu klären"];
      return app.UTGModels.migrateItem({
        org: a[0],
        model: a[1],
        business: "",
        technical: "",
        operations: "",
        service: "",
        note: "",
      });
    }
    function serviceProvider(serviceName) {
      const service = app.UTGModels.resolveService(d, serviceName);
      const provider = String(service?.provider || "").trim();
      return provider &&
        !["Noch zu klären", "Nicht erforderlich"].includes(provider)
        ? provider
        : "";
    }
    function proposedService(name) {
      const activity = (d.activities || []).find((a) => a.name === name);
      const reference = activity?.service;
      const service = app.UTGModels.resolveService(d, reference);
      return service?.id || "";
    }
    function proposedEntry(name, base) {
      const service = proposedService(name);
      return {
        ...base,
        embedding: "",
        interaction: "",
        service,
        orgSource: service ? "service" : "explicit",
        org: service ? "" : base.org,
      };
    }
    function seedProposals(config) {
      config.entries ??= {};
      for (const [, name] of A) {
        if (!Object.prototype.hasOwnProperty.call(config.entries, name)) {
          config.entries[name] = proposedEntry(name, old());
        }
      }
      return config;
    }
    function cfg(t, p) {
      let k = t + "::flow";
      if (!d.configs[k]) {
        const team = teams().find((z) => z.id === t);
        const ids = Array.isArray(team?.productIds)
          ? team.productIds
          : (d.products || [])
              .filter((product) =>
                Object.hasOwn(d.configs, t + "::" + product.id),
              )
              .map((product) => product.id);
        const legacy = [ids.includes(p) ? p : null, ...ids]
          .filter(Boolean)
          .map((pid) => d.configs[t + "::" + pid])
          .find(Boolean);
        d.configs[k] = legacy
          ? JSON.parse(JSON.stringify(legacy))
          : { status: "Entwurf", entries: {} };
        if (!legacy) {
          Object.entries(team?.assignments || {}).forEach(
            ([n, a]) =>
              (d.configs[k].entries[n] = {
                ...proposedEntry(n, old(a.owner)),
                orgSource: "explicit",
                org: old(a.owner).org,
                business: a.accountable || "",
                note: a.note || "",
              }),
          );
          seedProposals(d.configs[k]);
        }
      }
      return d.configs[k];
    }
    function options(arr, v) {
      return arr
        .map(
          (x) =>
            "<option " +
            (x === v ? "selected" : "") +
            ' value="' +
            esc(x) +
            '">' +
            esc(x) +
            "</option>",
        )
        .join("");
    }
    const defaultProviders = ["UTG-ART", "ISCeco", "BIT", "Rubicon"];
    const defaultEmbeddings = app.UTGModels.embeddings,
      defaultInteractions = app.UTGModels.interactions;
    const catalogs = () => {
      d.providers ??= defaultProviders.slice();
      d.embeddings ??= defaultEmbeddings.slice();
      d.interactions ??= defaultInteractions.slice();
      return d;
    };
    const orgOptions = () => [
      "Noch zu klären",
      "Nicht erforderlich",
      ...catalogs().providers.filter(
        (x) => !["Noch zu klären", "Nicht erforderlich"].includes(x),
      ),
    ];
    const dimensionOptions = (field) => [
      "Noch zu klären",
      ...catalogs()[field === "embedding" ? "embeddings" : "interactions"],
      "Nicht erforderlich",
    ];
    function renderMatrix(requestedTeam) {
      const contextTeam = requestedTeam || app.UTGFlowUX?.getTeam() || d.team;
      try {
        const latest = JSON.parse(app.UTGStorage.rawGet(K) || "null");
        if (latest?.schema === 3 && Array.isArray(latest.services)) {
          Object.assign(d, latest);
        }
      } catch (e) {
        console.warn("LE-Service-Synchronisation:", e);
      }
      d.team = contextTeam;
      refreshActivities();
      ensure();
      $("v3team").innerHTML = teams()
        .map(
          (t) =>
            '<option value="' +
            esc(t.id) +
            '" ' +
            (t.id === d.team ? "selected" : "") +
            ">" +
            esc(t.name) +
            "</option>",
        )
        .join("");
      $("v3product").innerHTML = assignedProducts(
        teams().find((t) => t.id === d.team),
      )
        .map(
          (p) =>
            '<option value="' +
            esc(p.id) +
            '" ' +
            (p.id === d.product ? "selected" : "") +
            ">" +
            esc(p.name) +
            "</option>",
        )
        .join("");
      if (!d.team || !d.product) {
        $("v3rows").innerHTML =
          '<tr><td colspan="10">Bitte hier über «Produkte zuordnen» mindestens ein Produkt dem Team zuweisen.</td></tr>';
        return;
      }
      let c = cfg(d.team, d.product);
      const renderedTeam = d.team,
        renderedFlow = structuredClone(c);
      $("v3status").value = c.status;
      $("v3status").dataset.team = renderedTeam;
      $("v3status").dataset.previous = c.status;
      $("v3status").dataset.basis =
        app.UTGAgreement?.signature(d, renderedTeam, teams()) || "";
      $("v3rows").innerHTML = A.map(([phase, name], i) => {
        let e = c.entries[name] || proposedEntry(name, old());
        const effective = app.UTGModels.effective(d, {
          ...e,
          embedding: "",
          interaction: "",
        });
        return (
          '<tr data-i="' +
          i +
          '"><td>' +
          esc(phase) +
          "</td><td>" +
          esc(name) +
          '</td><td data-f="org"><select aria-label="Ausführung · ' +
          esc(name) +
          '"><option value="" ' +
          (e.orgSource === "service" ? "selected" : "") +
          ">Servicevorgabe: " +
          esc(app.UTGModels.effective(d, { ...e, orgSource: "service" }).org) +
          "</option>" +
          options(
            [...new Set([...orgOptions(), e.org].filter(Boolean))],
            e.orgSource === "service" ? "" : e.org || "Noch zu klären",
          ) +
          "</select></td>" +
          ["embedding", "interaction"]
            .map(
              (f) =>
                '<td data-f="' +
                f +
                '"><select aria-label="' +
                esc(
                  (f === "embedding" ? "Einbindung" : "Zusammenarbeit") +
                    " · " +
                    name,
                ) +
                '"><option value="" ' +
                (!e[f] ? "selected" : "") +
                ">Servicevorgabe: " +
                esc(effective[f]) +
                "</option>" +
                options(
                  [...new Set([...dimensionOptions(f), e[f]].filter(Boolean))],
                  e[f],
                ) +
                "</select></td>",
            )
            .join("") +
          ["business", "technical", "operations"]
            .map(
              (f) =>
                '<td data-f="' +
                f +
                '"><input value="' +
                esc(e[f]) +
                '" placeholder="Rolle / Stelle"></td>',
            )
            .join("") +
          '<td data-f="service"><select>' +
          app.UTGModels.serviceOptions(d, e.service)
            .map(
              (o) =>
                '<option value="' +
                esc(o.value) +
                '" ' +
                (o.value === e.service ? "selected" : "") +
                ">" +
                esc(o.label) +
                "</option>",
            )
            .join("") +
          '</select></td><td data-f="note"><input value="' +
          esc(e.note) +
          '"></td></tr>'
        );
      }).join("");
      $("v3rows")
        .querySelectorAll("tr")
        .forEach((tr) => {
          const name = A[+tr.dataset.i][1],
            expected = structuredClone(
              c.entries[name] || proposedEntry(name, old()),
            );
          tr.querySelectorAll("[data-f] input,[data-f] select").forEach(
            (el) => {
              const field = el.closest("[data-f]").dataset.f;
              app.UTGPending?.apply(
                el,
                app.UTGPending.get(renderedTeam, name, field),
              );
              el.onchange = () => {
                const pending = app.UTGPending?.get(renderedTeam, name, field),
                  baseline = pending?.expected || expected,
                  seed = pending?.seed || renderedFlow,
                  wasPresent =
                    pending?.wasPresent ??
                    Object.hasOwn(renderedFlow.entries, name);
                try {
                  if ($("v3team").value !== renderedTeam)
                    throw Error(
                      "Das angezeigte Team wurde gewechselt. Bitte die aktuelle Zeile bearbeiten.",
                    );
                  app.UTGMatrix.saveField(
                    renderedTeam,
                    name,
                    field,
                    el.value,
                    baseline,
                    seed,
                    wasPresent,
                  );
                  app.UTGPending?.remove(renderedTeam, name, field);
                  renderMatrix(renderedTeam);
                  window.dispatchEvent(new CustomEvent("utg:change-saved"));
                } catch (error) {
                  app.UTGPending?.record({
                    team: renderedTeam,
                    activity: name,
                    field,
                    value: el.value,
                    expected: baseline,
                    seed,
                    wasPresent,
                    error: error.message,
                  });
                  el.setAttribute("aria-invalid", "true");
                  el.title = "Nicht gespeichert: " + error.message;
                  $("status").textContent = el.title;
                }
              };
            },
          );
        });
    }
    app.addEventListener("utg:pending-updated", () => renderMatrix());
    app.addEventListener("utg-catalog-changed", () => {
      try {
        Object.assign(d, JSON.parse(app.UTGStorage.rawGet(K) || "{}"));
      } catch (e) {
        console.warn(e);
      }
      refreshActivities();
      renderMatrix();
      renderServices();
    });
    function renderServices() {
      $("v3servicerows").innerHTML = d.services
        .map(
          (s, i) =>
            '<tr data-i="' +
            i +
            '">' +
            ["name", "provider", "embedding", "interaction"]
              .map(
                (f) =>
                  '<td data-f="' +
                  f +
                  '">' +
                  (["provider", "embedding", "interaction"].includes(f)
                    ? '<select aria-label="' +
                      esc(
                        {
                          provider: "Anbieter",
                          embedding: "Einbindung",
                          interaction: "Zusammenarbeit",
                        }[f] +
                          " · " +
                          s.name,
                      ) +
                      '">' +
                      options(
                        [
                          ...new Set([
                            ...(f === "provider"
                              ? catalogs().providers
                              : dimensionOptions(f)),
                            s[f],
                          ]),
                        ],
                        s[f],
                      ) +
                      "</select>"
                    : '<input value="' + esc(s[f]) + '">') +
                  "</td>",
              )
              .join("") +
            '<td><button data-delete="' +
            i +
            '">Löschen</button></td></tr>',
        )
        .join("");
      $("v3servicerows")
        .querySelectorAll("input,select")
        .forEach(
          (el) =>
            (el.onchange = () => {
              const row = el.closest("tr"),
                service = d.services[+row.dataset.i],
                field = el.closest("td").dataset.f;
              try {
                app.UTGServiceData.commit(
                  app.UTGServiceData.update(d, service.id, {
                    [field]: el.value,
                  }),
                );
              } catch (error) {
                el.setAttribute("aria-invalid", "true");
                el.title = error.message;
                throw error;
              }
            }),
        );
      $("v3servicerows")
        .querySelectorAll("[data-delete]")
        .forEach(
          (button) =>
            (button.onclick = () => {
              const service = d.services[+button.dataset.delete],
                refs = app.UTGServiceData.references(d, service);
              if (
                !confirm(
                  "LE-Service «" +
                    service.name +
                    "» löschen? " +
                    refs.flows.length +
                    " Leistungszuordnungen und " +
                    refs.activities.length +
                    " Tätigkeitsvorschläge werden geleert.",
                )
              )
                return;
              try {
                app.UTGServiceData.commit(
                  app.UTGServiceData.remove(d, service.id),
                );
              } catch (error) {
                $("status").textContent =
                  "Service konnte nicht gelöscht werden: " + error.message;
              }
            }),
        );
    }
    function renderEvents() {
      let ev = [
        ["PI Planning", "Pro PI: ART, BO und LE mit Lieferbeiträgen"],
        [
          "ART Sync / PO Sync / Coach Sync",
          "Regelmässig: Abhängigkeiten und Blockaden",
        ],
        ["System Demo", "Je Iteration: integrierte Ergebnisse"],
        ["Inspect & Adapt", "Ende PI: systemische Verbesserungen"],
        [
          "Team Planning, Daily, Review, Retro",
          "Team-Cadence: Lieferung und Lernen",
        ],
        [
          "Portfolio Board / POM Board",
          "Strategische Priorisierung, kein operatives Feature-Gate",
        ],
        [
          "Pre-PI Planning, Architecture Sync, Flow Review",
          "Ergänzende Koordination",
        ],
        [
          "Release Readiness",
          "Anlassbezogene Freigabe und Betriebsbereitschaft",
        ],
      ];
      $("v3events").innerHTML = ev
        .map(
          (x) =>
            '<div class="v3card"><b>' +
            x[0] +
            '</b><p class="v3hint">' +
            x[1] +
            "</p></div>",
        )
        .join("");
    }
    function renderOverview() {
      try {
        const latest = JSON.parse(app.UTGStorage.rawGet(K) || "null");
        if (latest?.schema === 3) Object.assign(d, latest);
      } catch {}
      refreshActivities();
      let counts = A.map(([phase, n]) => {
        let z = [0, 0, 0, 0, 0, 0];
        teams().forEach((t) => {
          if (!assignedProducts(t).length) return;
          const result = app.UTGOpenAssignments.evaluate(d, t, n);
          z[result.bucket]++;
          if (result.isShared) z[2]++;
        });
        return [n, ...z];
      });
      $("v3overviewrows").innerHTML = counts
        .map(
          (a) =>
            "<tr>" + a.map((x) => "<td>" + esc(x) + "</td>").join("") + "</tr>",
        )
        .join("");
      $("v3stats").innerHTML = [
        ["Teams", teams().length],
        [
          "Verantwortete Produkte",
          teams().reduce((sum, t) => sum + assignedProducts(t).length, 0),
        ],
        ["LE-Services", d.services.length],
        ["Offene Zuordnungen", counts.reduce((a, r) => a + r[5], 0)],
      ]
        .map(
          (x) =>
            "<div><b>" +
            x[0] +
            '</b><div class="app-metric">' +
            x[1] +
            "</div></div>",
        )
        .join("");
    }
    app.addEventListener("gever-v3-updated", () => {
      try {
        const latest = JSON.parse(app.UTGStorage.rawGet(K) || "null");
        if (latest) Object.assign(d, latest);
      } catch (e) {
        console.warn("Konfigurationsabgleich:", e);
      }
    });
    function show(v) {
      ["matrix", "services", "policies", "overview"].forEach((x) => {
        $("v3" + x).hidden = x !== v;
      });
      document
        .querySelectorAll("[data-v3]")
        .forEach((b) => b.classList.toggle("active", b.dataset.v3 === v));
      if (v === "matrix") renderMatrix();
      if (v === "services") renderServices();
      if (v === "policies") renderEvents();
      if (v === "overview") renderOverview();
    }
    app.UTGShowPanel = show;
    $("v3team").onchange = (e) => {
      renderMatrix(e.target.value);
    };
    $("v3product").onchange = (e) => {
      d.product = e.target.value;
      renderMatrix($("v3team").value);
    };
    $("v3status").onchange = (e) => {
      const team = e.target.dataset.team,
        previous = e.target.dataset.previous,
        chosen = e.target.value;
      if (
        chosen !== "Entwurf" &&
        !window.confirm(
          "Vereinbarungsstatus «" +
            chosen +
            "» für den gemeinsamen Flow dieses Teams bestätigen? Dies ist eine manuelle Bestätigung; offene Prüfbefunde bleiben sichtbar.",
        )
      ) {
        e.target.value = previous;
        return;
      }
      try {
        const seed = structuredClone(cfg(team, $("v3product")?.value));
        app.UTGMatrix.saveStatus(
          team,
          chosen,
          previous,
          seed,
          e.target.dataset.basis,
        );
        renderMatrix(team);
        app.UTGFlowUX.renderAgreements();
      } catch (error) {
        e.target.value = previous;
        $("status").textContent = "Status nicht gespeichert: " + error.message;
      }
    };
    $("v3newproduct").onclick = () =>
      document.getElementById("crud-add-product")?.click();
    $("v3newservice").onclick = () =>
      app.UTGDialogs.editName({
        title: "LE-Service erstellen",
        submit: (name) => {
          if (
            d.services.some(
              (s) =>
                s.name.toLocaleLowerCase("de-CH") ===
                name.toLocaleLowerCase("de-CH"),
            )
          )
            throw Error("Dieser Name ist bereits vorhanden.");
          const next = structuredClone(app.UTGStorage.read(K));
          next.services.push(newService(name));
          app.UTGServiceData.commit(next);
        },
      });
    // Separate v3 file handling: includes the original v2 team data for portability.
    async function saveFile(downloadOnly = false) {
      return app.UTGFiles.save(downloadOnly);
    }
    let saveButton = $("save");
    if (saveButton) {
      saveButton.addEventListener(
        "click",
        (e) => {
          e.stopImmediatePropagation();
          saveFile();
        },
        true,
      );
    }
    let exportButton = $("export");
    if (exportButton) {
      exportButton.addEventListener(
        "click",
        (e) => {
          e.stopImmediatePropagation();
          saveFile(true);
        },
        true,
      );
    }
    let imp = $("import");
    if (imp) {
      imp.addEventListener(
        "change",
        async (e) => {
          e.stopImmediatePropagation();
          let file = e.target.files?.[0];
          if (!file) return;
          try {
            let obj = JSON.parse(await file.text());
            if (
              obj.format !== "utg-le-complete" &&
              obj.format !== "gever-art-v3"
            )
              throw Error("Unbekanntes Konfigurationsformat");
            app.UTGStorage.validateBundle(obj);
            if (
              !(await app.UTGDialogs.confirm(
                "Aktuelle Konfiguration durch die importierte Datei ersetzen? " +
                  obj.v2?.teams?.length +
                  " Teams · " +
                  obj.v3.products.length +
                  " Produkte · " +
                  obj.v3.services.length +
                  " LE-Services." +
                  (app.UTGPending?.has()
                    ? " " +
                      app.UTGPending.count() +
                      " nicht gespeicherte Eingaben werden nur bei erfolgreichem Import verworfen."
                    : ""),
              ))
            ) {
              e.target.value = "";
              return;
            }
            const incoming = app.UTGFlowUX.prepareImport(obj);
            app.UTGStorage.restore(incoming);
            app.UTGFlowUX.afterImport();
            app.UTGFeedback?.beforeReload("Konfiguration importiert");
            location.reload();
          } catch (err) {
            app.UTGFeedback?.failure("Import fehlgeschlagen: " + err.message, {
              scope: "import",
              local: false,
            });
            $("status").textContent = "Import fehlgeschlagen: " + err.message;
            alert("Import fehlgeschlagen: " + err.message);
          } finally {
            e.target.value = "";
          }
        },
        true,
      );
    }
    show("matrix");
    window.dispatchEvent(new Event("gever-v3-updated"));
  })();
}
