export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const $ = (id) => document.getElementById(id);
    // Compact identity and honest storage feedback: the original detailed status stays available.
    const header = document.querySelector("body > header");
    header.querySelector("h1").innerHTML =
      '<span class="app-title">ART &amp; Leistungserbringer | Operating Model</span> <span class="app-version">{{release.label}}</span>';
    const toolbar = document.querySelector(".toolbar");
    const menu = document.createElement("details");
    menu.className = "app-file-menu";
    const summary = document.createElement("summary");
    summary.textContent = "Weitere Aktionen";
    menu.append(summary);
    const actions = document.createElement("div");
    actions.className = "app-file-actions";
    for (const id of ["import", "reset"]) {
      const el = $(id);
      if (el) actions.append(id === "import" ? el.closest("label") : el);
    }
    menu.append(actions);
    toolbar.insertBefore(menu, $("status"));
    menu.addEventListener("click", (e) => {
      if (e.target.closest("button,label")) menu.open = false;
    });
    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target)) menu.open = false;
    });
    menu.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        menu.open = false;
        summary.focus();
      }
    });
    const status = $("status");
    status.classList.add("app-save-status");
    status.setAttribute("role", "status");
    $("utg-storage-location")?.remove();
    status.textContent = "";
    const storageBadge = document.createElement("span");
    storageBadge.className = "app-storage-badge";
    function paintStorageStatus(ok) {
      if (app.UTGFeedback) {
        app.UTGFeedback.paintBadge(storageBadge, ok);
        return;
      }
      storageBadge.textContent =
        ok === true
          ? "Lokal gespeichert"
          : ok === false
            ? "Speichern fehlgeschlagen"
            : "Lokale Speicherung noch nicht bestätigt";
      storageBadge.dataset.state =
        ok === true ? "ok" : ok === false ? "error" : "unknown";
      storageBadge.classList.toggle("app-open-value", ok === false);
    }
    paintStorageStatus(app.UTGStorage.getStatus());
    toolbar.insertBefore(storageBadge, status);
    const nav = $("utg-nav");
    // Numbered navigation cards show the suggested working sequence.
    [...nav.children].forEach((button, i) => {
      const title = button.querySelector("span");
      title.textContent = title.textContent.replace(/^0\d · /, "");
      const number = document.createElement("span");
      number.className = "app-step-number";
      number.textContent = String(i + 1);
      number.setAttribute("aria-hidden", "true");
      button.setAttribute(
        "aria-label",
        "Schritt " +
          (i + 1) +
          " von 5: " +
          title.textContent +
          " – " +
          button.querySelector("small").textContent,
      );
      button.prepend(number);
    });
    // Local filters preserve the underlying catalog and all existing handlers.
    function searchable(host, selector, title) {
      if (!host) return;
      const bar = document.createElement("div");
      bar.className = "app-searchbar";
      const label = document.createElement("label");
      label.textContent = title + " durchsuchen";
      const input = document.createElement("input");
      input.type = "search";
      input.placeholder = title + " suchen …";
      label.append(input);
      const count = document.createElement("span");
      count.className = "app-result-count";
      count.setAttribute("role", "status");
      bar.append(label, count);
      host.before(bar);
      const empty = document.createElement("p");
      empty.className = "app-search-empty";
      empty.textContent =
        "Keine passenden Einträge. Suchbegriff ändern oder leeren.";
      empty.hidden = true;
      host.after(empty);
      function filter() {
        const q = input.value.trim().toLocaleLowerCase("de-CH");
        const rows = [...host.querySelectorAll(selector)];
        let visible = 0;
        for (const row of rows) {
          const content = [
            row.textContent,
            ...[
              ...row.querySelectorAll("input:not([type=checkbox]),select"),
            ].map((el) =>
              el.tagName === "SELECT"
                ? el.selectedOptions[0]?.textContent || ""
                : el.value,
            ),
          ]
            .join(" ")
            .toLocaleLowerCase("de-CH");
          const match = !q || content.includes(q);
          row.hidden = !match;
          if (match) visible++;
        }
        count.textContent = visible + " / " + rows.length;
        empty.hidden = visible > 0 || !q;
      }
      input.addEventListener("input", filter);
      new MutationObserver(filter).observe(host, {
        childList: true,
        subtree: true,
      });
      host.addEventListener("change", filter);
      filter();
    }
    searchable($("crud-teams"), ".crud-entry", "Teams");
    searchable($("crud-products"), ".crud-entry", "Produkte");
    for (const [list, action] of [
      ["crud-teams", "crud-add-team"],
      ["crud-products", "crud-add-product"],
    ]) {
      const bar = $(list)?.previousElementSibling,
        button = $(action);
      if (bar?.classList.contains("app-searchbar") && button)
        bar.append(button);
    }
    for (const [id, title] of [
      ["v3servicerows", "Services"],
      ["utg-activity-rows", "Tätigkeiten"],
    ]) {
      const body = $(id);
      if (body) {
        const container = body.closest(".scroll,.v3scroll");
        const anchor = document.createElement("div");
        container.before(anchor); // Place filter outside the table, while observing only its rows.
        const wrapper = document.createElement("div");
        wrapper.className = "app-catalog-table";
        container.before(wrapper);
        wrapper.append(container);
        searchable(body, "tr", title);
        const bar = body.previousElementSibling,
          empty = body.nextElementSibling;
        if (bar?.classList.contains("app-searchbar")) wrapper.prepend(bar);
        if (empty?.classList.contains("app-search-empty"))
          wrapper.append(empty);
        anchor.remove();
      }
    }
    // Service edits use the existing field handlers and their synchronization rules.
    const services = $("v3servicerows");
    function serviceRows() {
      for (const row of services?.rows || []) {
        let complete = true;
        for (const cell of row.querySelectorAll("td[data-f]")) {
          const field = cell.querySelector("input,select");
          if (!field) {
            complete = false;
            continue;
          }
          let text = cell.querySelector(".app-service-value");
          if (!text) {
            text = document.createElement("span");
            text.className = "app-service-value";
            cell.append(text);
          }
          const value =
            field.tagName === "SELECT"
              ? field.selectedOptions[0]?.textContent ||
                field.value ||
                "Noch zu klären"
              : field.value;
          if (text.textContent !== value) text.textContent = value;
        }
        let edit = row.querySelector(".app-edit-service");
        if (!edit) {
          edit = document.createElement("button");
          edit.type = "button";
          edit.className = "app-edit-service";
          edit.textContent = "Bearbeiten";
          row.lastElementChild.prepend(edit);
        }
        edit.onclick = () => editService(row.dataset.i);
        row.classList.toggle("app-service-ready", complete);
      }
    }
    function editService(index) {
      const row = services.querySelector('tr[data-i="' + index + '"]');
      if (!row) return;
      const serviceId = app.UTGStorage.read("gever-art-v3-config").services[
        +index
      ]?.id;
      const dialog =
        app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
      dialog.className = "app-drawer";
      dialog.setAttribute("aria-labelledby", "app-service-title");
      const form = document.createElement("form");
      form.innerHTML =
        '<div class="app-drawer-eyebrow">LE-SERVICE</div><h2 id="app-service-title">Service bearbeiten</h2><p class="hint">ART-weite Servicevorgabe · Änderungen wirken auf alle Teams, die diese Vorgabe verwenden.</p>';
      const fields = [];
      for (const [key, label] of [
        ["name", "Bezeichnung"],
        ["provider", "Anbieter"],
        ["embedding", "Organisatorische Einbindung"],
        ["interaction", "Zusammenarbeit"],
      ]) {
        const source = row.querySelector(
          '[data-f="' + key + '"] input,[data-f="' + key + '"] select',
        );
        const input = source.cloneNode(true);
        input.value = source.value;
        input.required = true;
        const group = document.createElement("label");
        group.textContent = label;
        group.append(input);
        form.append(group);
        fields.push({ key, input, previous: source.value });
      }
      const footer = document.createElement("div");
      footer.className = "crud-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Abbrechen";
      cancel.onclick = () => dialog.close();
      const save = document.createElement("button");
      save.type = "submit";
      save.className = "primary";
      save.textContent = "Änderungen übernehmen";
      footer.append(cancel, save);
      form.append(footer);
      const error = document.createElement("p");
      error.className = "app-open-value";
      error.setAttribute("role", "alert");
      error.hidden = true;
      footer.before(error);
      form.onsubmit = (e) => {
        e.preventDefault();
        try {
          const current = app.UTGStorage.read("gever-art-v3-config");
          const service = current.services[+index];
          if (!service || service.id !== serviceId)
            throw Error(
              "Dieser Service wurde inzwischen verändert. Bitte erneut öffnen.",
            );
          const patch = Object.fromEntries(
            fields.map(({ key, input }) => [key, input.value.trim()]),
          );
          app.UTGServiceData.commit(
            app.UTGServiceData.update(current, serviceId, patch),
          );
          app.UTGEdits.closeSaved(dialog);
        } catch (err) {
          error.textContent = err.message;
          error.hidden = false;
        }
      };
      dialog.append(form);
      document.body.append(dialog);
      dialog.addEventListener(
        "close",
        () => {
          dialog.remove();
          services
            .querySelector('tr[data-i="' + index + '"] .app-edit-service')
            ?.focus();
        },
        { once: true },
      );
      fields[0].input.autofocus = true;
      dialog.showModal();
    }
    app.UTGWorkspace = {
      openService(serviceId) {
        const data = app.UTGStorage.read("gever-art-v3-config");
        const index = (data?.services || []).findIndex(
          (service) => service.id === serviceId,
        );
        if (index >= 0) editService(index);
      },
    };
    if (services) {
      new MutationObserver(serviceRows).observe(services, { childList: true });
      serviceRows();
    }
    const notification = document.createElement("div");
    notification.className = "app-toast";
    notification.setAttribute("role", "status");
    notification.hidden = true;
    document.body.append(notification);
    let timer;
    function toast(message) {
      app.UTGFeedback?.notice(message);
    }
    // Explicit change events provide feedback without claiming that a JSON file was written.
    app.addEventListener("utg:storage-status", (event) =>
      paintStorageStatus(event.detail.ok),
    );
    nav.addEventListener("click", () => {
      document.querySelector(".utg-page:not([hidden])")?.animate?.(
        [
          { opacity: 0.55, transform: "translateY(5px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        {
          duration: matchMedia("(prefers-reduced-motion: reduce)").matches
            ? 0
            : 160,
        },
      );
    });
  })();
}
