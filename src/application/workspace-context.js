import { createAgreementService } from "../domain/agreements.js";
import { initializeDrawers } from "../ui/components/drawer.js";
export function initialize(app, browser = globalThis) {
  const window = browser;
  const sessionStorage = app.sessionStorage ?? globalThis.sessionStorage;
  (() => {
    "use strict";
    const V3 = "gever-art-v3-config",
      V2 = "gever-art-leistungsmatrix-v1";
    const read = (k) => app.UTGStorage.read(k) || {};
    const productIds = (team, data) =>
      Array.isArray(team?.productIds)
        ? team.productIds
        : (data.products || [])
            .filter((p) =>
              Object.hasOwn(data.configs || {}, team?.id + "::" + p.id),
            )
            .map((p) => p.id);
    const stable = (value) =>
      JSON.stringify(
        (function sort(v) {
          if (Array.isArray(v)) return v.map(sort);
          if (v && typeof v === "object")
            return Object.fromEntries(
              Object.keys(v)
                .sort()
                .map((k) => [k, sort(v[k])]),
            );
          return v;
        })(value),
      );
    app.UTGAgreement = createAgreementService(() => app.UTGModels);
    initializeDrawers(app, browser, stable);
    let activeTeam = "",
      contextNotice = "",
      mode = "team",
      syncing = false,
      started = false,
      pageIndex = 0,
      origin = null,
      correction = null;
    const teams = () => read(V2).teams || [];
    function saveTeam() {
      putSession("utg-active-team", activeTeam);
      putSession(
        "utg-active-team-config",
        read(V3).navigationEpoch || "legacy",
      );
    }
    function setTeam(id) {
      if (!teams().some((t) => t.id === id)) return;
      activeTeam = id;
      contextNotice = "";
      mode = "team";
      saveTeam();
      sync();
    }
    function sync() {
      if (syncing || !started) return;
      syncing = true;
      try {
        const list = teams();
        if (!list.some((t) => t.id === activeTeam)) {
          activeTeam = list[0]?.id || "";
          saveTeam();
        }
        for (const id of ["utg-design-team", "utg-contract-team", "v3team"]) {
          const select = document.getElementById(id);
          if (
            select &&
            [...select.options].some((o) => o.value === activeTeam) &&
            select.value !== activeTeam
          ) {
            select.value = activeTeam;
            select.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
        const select = document.getElementById("model-view"),
          value = mode === "team" ? "team:" + activeTeam : mode;
        if (
          select &&
          [...select.options].some((o) => o.value === value) &&
          select.value !== value
        ) {
          select.value = value;
          select.dispatchEvent(new Event("change", { bubbles: true }));
        }
        const shownMode = ["reference", "all"].includes(select?.value)
          ? select.value
          : "team";
        const badge = document.getElementById("utg-active-team-context");
        if (badge) {
          badge.hidden = pageIndex === 0 || pageIndex === 4;
          badge.textContent =
            shownMode !== "team" && pageIndex === 3
              ? shownMode === "reference"
                ? "SAFe-Referenz · Standardvorlage für neue Teams"
                : "ART-Gesamtsicht · alle Teams"
              : "Team: " +
                (list.find((t) => t.id === activeTeam)?.name ||
                  "Noch kein Team") +
                " · gemeinsamer Team-Flow";
          if (contextNotice) badge.textContent += " · " + contextNotice;
        }
        updateProducts();
        renderAgreements();
      } finally {
        syncing = false;
      }
    }
    function onPage(i) {
      pageIndex = i;
      sync();
      const banner = document.getElementById("utg-review-return");
      if (banner) banner.hidden = !origin || i === 4;
      markMatrix();
    }
    function updateProducts() {
      const team = teams().find((t) => t.id === activeTeam),
        data = read(V3),
        ids = productIds(team, data),
        names = (data.products || [])
          .filter((p) => ids.includes(p.id))
          .map((p) => p.name);
      for (const id of ["v3status", "utg-agreement-confirm"]) {
        const control = document.getElementById(id);
        if (control) control.disabled = !activeTeam || !names.length;
      }
      const draft = document.getElementById("utg-matrix-draft");
      if (draft) {
        const configured =
          data.configs?.[activeTeam + "::flow"] ||
          ids.some((pid) => data.configs?.[activeTeam + "::" + pid]);
        draft.hidden = !!configured || !activeTeam;
        draft.textContent =
          "Vorschlagswerte · noch nicht gespeichert. Erst eine Feldänderung oder eine ausdrückliche Statusbestätigung übernimmt den Team-Flow.";
      }
      const products = document.getElementById("utg-flow-products");
      if (products)
        products.textContent =
          "Verantwortete Produkte: " +
          (names.join(", ") || "Noch keine zugeordnet");
      const view = document.getElementById("model-view")?.value;
      const note = document.querySelector("#utg33interfaces p.utg33-muted");
      if (note && view?.startsWith("team:")) {
        const selected = teams().find((t) => t.id === view.slice(5));
        note.textContent =
          "Team: " +
          (selected?.name || "") +
          " · gemeinsamer Flow für " +
          ((data.products || [])
            .filter((p) => productIds(selected, data).includes(p.id))
            .map((p) => p.name)
            .join(", ") || "noch keine zugeordneten Produkte");
      }
    }
    function renderAgreements() {
      const host = document.getElementById("utg-agreement-rows");
      if (!host) return;
      const data = read(V3),
        list = teams();
      host.replaceChildren();
      for (const t of list) {
        const state = app.UTGAgreement.state(data, t.id, list),
          tr = document.createElement("tr");
        let gaps = 0;
        for (const a of data.activities || []) {
          const e = app.UTGModels?.effective(
            data,
            data.configs?.[t.id + "::flow"]?.entries?.[a.name] || {},
          );
          if (!e?.org || e.org === "Noch zu klären") gaps++;
        }
        for (const text of [
          t.name,
          state.status,
          state.changed
            ? "Seit Bestätigung geändert"
            : state.unconfirmed
              ? "Bestätigung noch nicht dokumentiert"
              : state.confirmedAt
                ? "Bestätigt am " +
                  new Date(state.confirmedAt).toLocaleDateString("de-CH")
                : "Noch nicht bestätigt",
          gaps + " offene Ausführungszuordnungen",
        ]) {
          const td = document.createElement("td");
          td.textContent = text;
          tr.append(td);
        }
        const td = document.createElement("td"),
          b = document.createElement("button");
        b.type = "button";
        b.textContent = "Vereinbarung öffnen";
        b.className = "utg-fix-link";
        b.dataset.reviewKey = "agreement:" + t.id;
        b.onclick = () => {
          rememberOrigin(b);
          setTeam(t.id);
          document.querySelectorAll("#utg-nav button")[2].click();
          document.getElementById("v3status")?.focus();
        };
        td.append(b);
        tr.append(td);
        host.append(tr);
      }
      if (!list.length) {
        const tr = document.createElement("tr"),
          td = document.createElement("td");
        td.colSpan = 5;
        td.textContent = "Noch keine Teams vorhanden.";
        tr.append(td);
        host.append(tr);
      }
      const state = app.UTGAgreement.state(data, activeTeam, list),
        note = document.getElementById("utg-agreement-current");
      if (note)
        note.textContent =
          state.status +
          (state.changed
            ? " · seit Bestätigung geändert"
            : state.unconfirmed
              ? " · Bestätigung noch nicht dokumentiert"
              : "");
    }
    function putSession(key, value) {
      try {
        if (value === null) sessionStorage.removeItem(key);
        else sessionStorage.setItem(key, value);
      } catch {}
    }
    function saveOrigin() {
      putSession(
        "utg-review-origin",
        origin ? JSON.stringify({ ...origin, correction }) : null,
      );
    }
    function readOrigin() {
      try {
        const value = JSON.parse(
          sessionStorage.getItem("utg-review-origin") || "null",
        );
        if (
          value &&
          typeof value.section === "string" &&
          typeof value.key === "string" &&
          value.epoch === (read(V3).navigationEpoch || "legacy") &&
          Array.isArray(value.details) &&
          Number.isFinite(value.y)
        ) {
          origin = value;
          correction = value.correction || null;
        }
      } catch {}
    }
    function actionKey(button) {
      if (button.dataset?.reviewKey) return button.dataset.reviewKey;
      const section = button.closest(".utg-overview-card")?.id || "";
      const row = button.closest("tr");
      if (button.dataset?.reviewTeam)
        return (
          section +
          ":team:" +
          button.dataset.reviewTeam +
          ":service:" +
          button.dataset.reviewServiceId +
          ":" +
          button.textContent
        );
      const message = button
        .closest("li,.utg-check")
        ?.querySelector(":scope > span")?.textContent;
      if (message) return section + ":finding:" + message;
      return (
        section +
        ":row:" +
        (row
          ? [...row.cells]
              .slice(0, -1)
              .map((c) => c.textContent.trim())
              .join("|")
          : "") +
        ":" +
        button.textContent
      );
    }
    function detailsKey(details) {
      if (details.id) return "id:" + details.id;
      const row = details.closest("tr"),
        cell = details.closest("td");
      return (
        (row
          ? row.dataset?.teamId ||
            [...row.cells]
              .slice(0, 1)
              .map((c) => c.textContent.trim())
              .join("|")
          : "section") +
        ":" +
        (cell?.cellIndex ?? "") +
        ":" +
        (details.closest("[id]")?.id || "")
      );
    }
    function rememberOrigin(button) {
      if (!button.closest("#utg-page-5")) return;
      const section = button.closest(".utg-overview-card"),
        key = actionKey(button);
      if (!origin || origin.key !== key) correction = null;
      origin = {
        epoch: read(V3).navigationEpoch || "legacy",
        section: section?.id || "utg-art-summary",
        key,
        y: window.scrollY,
        details: [
          ...document.querySelectorAll("#utg-page-5 .utg-overview-card"),
        ].flatMap((s) =>
          [...s.querySelectorAll("details")].map((d) => ({
            section: s.id,
            key: detailsKey(d),
            open: d.open,
          })),
        ),
      };
      saveOrigin();
      const banner = document.getElementById("utg-review-return");
      if (banner) banner.hidden = false;
    }
    function returnToReview() {
      if (!origin || !app.UTGEdits.canNavigate()) return;
      const saved = origin;
      document.querySelectorAll("#utg-nav button")[4].click();
      for (const item of saved.details) {
        const d = [
          ...(document
            .getElementById(item.section)
            ?.querySelectorAll("details") || []),
        ].find((d) => detailsKey(d) === item.key);
        if (d) d.open = item.open;
      }
      const section = document.getElementById(saved.section);
      section?.scrollIntoView({ block: "start" });
      const button = [...(section?.querySelectorAll("button") || [])].find(
        (b) => actionKey(b) === saved.key,
      );
      if (button) {
        button.focus({ preventScroll: true });
        window.scrollTo({ top: saved.y, behavior: "instant" });
      } else if (section) {
        const notice = document.createElement("p");
        notice.className = "utg-return-result";
        notice.setAttribute("role", "status");
        notice.setAttribute("tabindex", "-1");
        notice.textContent =
          "Prüfung aktualisiert · der ursprüngliche Eintrag ist nicht mehr vorhanden.";
        section.querySelector(".utg-return-result")?.remove();
        section.prepend(notice);
        notice.focus();
      }
      origin = null;
      correction = null;
      saveOrigin();
      document.getElementById("utg-review-return").hidden = true;
      markMatrix();
    }
    function forExport(bundle) {
      const next = structuredClone(bundle),
        team = next.v2.teams.find((t) => t.id === activeTeam);
      if (team) {
        next.v3.team = team.id;
        next.v2.selected = team.id;
        next.v3.product = productIds(team, next.v3)[0] || "";
      }
      return next;
    }
    function prepareImport(bundle) {
      const next = structuredClone(bundle);
      next.v3.navigationEpoch =
        Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
      return next;
    }
    function afterImport() {
      app.UTGPending?.clearAfterImport();
      origin = null;
      correction = null;
      putSession("utg-review-origin", null);
      putSession("utg-active-team", null);
      putSession("utg-active-team-config", null);
    }
    function markMatrix() {
      const rows = document.querySelectorAll("#v3rows tr");
      let first;
      for (const row of rows) {
        const yes =
          !!correction &&
          correction.team === activeTeam &&
          row.cells[1] &&
          correction.names.includes(row.cells[1].textContent.trim());
        row.classList.toggle("utg-correction-target", yes);
        if (yes && !first) first = row;
      }
      const note = document.getElementById("utg-matrix-correction");
      if (note) {
        note.hidden = !correction || correction.team !== activeTeam;
        note.textContent =
          correction && correction.team === activeTeam
            ? "Markierte Tätigkeiten aus der ART-Prüfung: " +
              correction.names.length
            : "";
      }
      return first;
    }
    function init() {
      if (started) return;
      started = true;
      readOrigin();
      let stored;
      const data = read(V3);
      try {
        if (
          (sessionStorage.getItem("utg-active-team-config") || "legacy") ===
          (data.navigationEpoch || "legacy")
        )
          stored = sessionStorage.getItem("utg-active-team");
      } catch {}
      activeTeam = teams().some((t) => t.id === stored)
        ? stored
        : teams().some((t) => t.id === data.team)
          ? data.team
          : teams()[0]?.id || "";
      if (
        !stored &&
        data.navigationEpoch &&
        data.team &&
        !teams().some((t) => t.id === data.team)
      )
        contextNotice =
          "Importiertes Team nicht vorhanden; Ersatzteam wurde ausgewählt";
      saveTeam();
      const nav = document.getElementById("utg-nav");
      const badge = document.createElement("p");
      badge.id = "utg-active-team-context";
      badge.className = "utg-context-banner";
      nav.after(badge);
      const banner = document.createElement("div");
      banner.id = "utg-review-return";
      banner.className = "utg-context-banner";
      banner.hidden = true;
      const back = document.createElement("button");
      back.type = "button";
      back.textContent = "Zurück zur ART-Prüfung";
      back.onclick = returnToReview;
      banner.append(back);
      badge.after(banner);
      const product = document.getElementById("v3product");
      if (product) {
        product.closest("label").hidden = true;
        const text = document.createElement("p");
        text.id = "utg-flow-products";
        text.className = "utg-flow-context";
        product.closest(".v3bar").after(text);
      }
      const status = document.getElementById("v3status");
      if (status) {
        status.closest("label").firstChild.textContent =
          "Vereinbarungsstatus des Team-Flows";
        const confirm = document.createElement("button");
        confirm.type = "button";
        confirm.id = "utg-agreement-confirm";
        confirm.textContent = "Status bestätigen";
        confirm.onclick = () => {
          status.dispatchEvent(new Event("change", { bubbles: true }));
        };
        status.closest(".v3bar").append(confirm);
        const note = document.createElement("p");
        note.id = "utg-agreement-current";
        status.closest(".v3bar").after(note);
      }
      const matrix = document.getElementById("v3matrix"),
        hint = document.createElement("p");
      hint.textContent =
        "Gemeinsamer Team-Flow · Feldänderungen werden beim Verlassen des Felds direkt lokal gespeichert.";
      hint.className = "utg-flow-context";
      matrix.querySelector("h2").after(hint);
      const draft = document.createElement("p");
      draft.id = "utg-matrix-draft";
      draft.className = "utg-flow-context";
      draft.hidden = true;
      hint.after(draft);
      const filter = document.createElement("p");
      filter.id = "utg-matrix-correction";
      filter.hidden = true;
      matrix.querySelector("h2").after(filter);
      const summary = document.getElementById("utg-art-summary"),
        report = document.createElement("section");
      report.id = "utg-agreement-overview";
      report.className = "panel utg-overview-card";
      report.innerHTML =
        '<h2>Vereinbarungsstatus und aktueller Prüfstand</h2><p>Manuell bestätigter Status des Team-Flows. Offene Angaben verhindern keine Bestätigung; spätere Änderungen bleiben sichtbar.</p><div class="v3scroll"><table><thead><tr><th>Team</th><th>Vereinbarungsstatus</th><th>Änderungsstand</th><th>Prüfstand</th><th>Aktionen</th></tr></thead><tbody id="utg-agreement-rows"></tbody></table></div>';
      summary.after(report);
      new MutationObserver(() => {
        markMatrix();
        updateProducts();
      }).observe(document.getElementById("v3rows"), { childList: true });
      document.addEventListener("change", (event) => {
        if (syncing) return;
        const id = event.target.id;
        if (["utg-design-team", "utg-contract-team", "v3team"].includes(id))
          setTeam(event.target.value);
        else if (id === "model-view") {
          const value = event.target.value;
          if (value.startsWith("team:")) setTeam(value.slice(5));
          else {
            mode = value;
            sync();
          }
        }
      });
      document.addEventListener(
        "click",
        (event) => {
          const button = event.target.closest("button");
          if (!button || !button.closest("#utg-page-5")) return;
          if (
            button.matches(
              ".utg-fix-link,[data-review-service],[data-review-team]",
            )
          ) {
            rememberOrigin(button);
            if (button.dataset.reviewTeam && button.dataset.reviewServiceId) {
              const data = read(V3),
                entries =
                  data.configs?.[button.dataset.reviewTeam + "::flow"]
                    ?.entries || {};
              correction = {
                team: button.dataset.reviewTeam,
                names: Object.entries(entries)
                  .filter(
                    ([, e]) =>
                      (app.UTGModels.resolveService(data, e.service)?.id ||
                        e.service) === button.dataset.reviewServiceId,
                  )
                  .map(([name]) => name),
              };
              saveOrigin();
              queueMicrotask(() =>
                markMatrix()?.scrollIntoView({ block: "center" }),
              );
            }
          }
        },
        true,
      );
      for (const type of [
        "gever-v3-updated",
        "utg:teams-changed",
        "utg-catalog-changed",
        "storage",
      ])
        app.addEventListener(type, () => queueMicrotask(sync));
      const active = [...nav.children].findIndex((b) =>
        b.classList.contains("active"),
      );
      onPage(active < 0 ? 0 : active);
    }
    app.UTGFlowUX = {
      init,
      onPage,
      setTeam,
      getTeam: () => activeTeam,
      rememberOrigin,
      returnToReview,
      renderAgreements,
      forExport,
      prepareImport,
      afterImport,
    };
  })();
}
