export function initializeEditDialogs(app, browser = globalThis) {
  const window = browser;
  app.UTGDialogs = {
    confirm(message) {
      return new Promise((resolve) => {
        const box =
          app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
        box.setAttribute("aria-label", "Import bestätigen");
        box.style.cssText =
          "max-width:520px;border:1px solid #bdccda;border-radius:12px;padding:24px";
        const text = document.createElement("p");
        text.textContent = message;
        const actions = document.createElement("div");
        actions.className = "actions";
        const cancel = document.createElement("button");
        cancel.textContent = "Abbrechen";
        const accept = document.createElement("button");
        accept.textContent = "Konfiguration importieren";
        accept.className = "primary";
        const finish = (value) => {
          box.close();
          box.remove();
          resolve(value);
        };
        cancel.onclick = () => finish(false);
        accept.onclick = () => finish(true);
        box.oncancel = (e) => {
          e.preventDefault();
          finish(false);
        };
        actions.append(cancel, accept);
        box.append(text, actions);
        document.body.append(box);
        box.showModal();
      });
    },
  };
  // Shared drawer for catalog and activity names; no record is written before submission.
  app.UTGDialogs.editName = function ({
    title,
    value = "",
    description,
    descriptionLabelText = "Beschreibung der Tätigkeit",
    extraField,
    submit,
    trigger = document.activeElement,
  }) {
    const drawer =
      app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
    drawer.className = "app-drawer";
    drawer.setAttribute("aria-labelledby", "utg-name-drawer-title");
    const form = document.createElement("form");
    form.className = "crud-form";
    const heading = document.createElement("h2");
    heading.id = "utg-name-drawer-title";
    heading.textContent = title;
    const label = document.createElement("label");
    label.htmlFor = "utg-name-drawer-input";
    label.textContent = "Name";
    const input = document.createElement("input");
    input.id = "utg-name-drawer-input";
    input.type = "text";
    input.required = true;
    input.maxLength = 160;
    input.value = value;
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
    actions.append(accept, cancel);
    form.append(heading, label, input);
    let descriptionInput;
    if (description !== undefined) {
      const descriptionLabel = document.createElement("label");
      descriptionLabel.htmlFor = "utg-activity-description";
      descriptionLabel.textContent = descriptionLabelText;
      descriptionInput = document.createElement("textarea");
      descriptionInput.id = "utg-activity-description";
      descriptionInput.rows = 6;
      descriptionInput.value = description;
      descriptionInput.placeholder =
        "Beschreibe, was du darunter verstehst, und ergänze bei Bedarf Beispiele und Abgrenzungen.";
      form.append(descriptionLabel, descriptionInput);
    }
    let extraInput;
    if (extraField) {
      const label = document.createElement("label");
      label.htmlFor = "utg-catalog-edit-kind";
      label.textContent = extraField.label;
      extraInput = document.createElement("select");
      extraInput.id = "utg-catalog-edit-kind";
      for (const [value, text] of extraField.options) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = text;
        extraInput.append(option);
      }
      extraInput.value = extraField.value;
      form.append(label, extraInput);
    }
    form.append(error, actions);
    drawer.append(form);
    input.addEventListener("input", () => {
      input.setCustomValidity("");
      error.hidden = true;
    });
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = input.value.trim();
      if (!name) {
        input.setCustomValidity("Bitte einen Namen eingeben.");
        input.reportValidity();
        return;
      }
      try {
        if (submit(name, descriptionInput?.value, extraInput?.value) === false)
          return;
        app.UTGEdits.closeSaved(drawer);
      } catch (err) {
        error.textContent =
          err.message || "Die Änderung konnte nicht gespeichert werden.";
        error.hidden = false;
        input.focus();
      }
    });
    drawer.addEventListener(
      "close",
      () => {
        drawer.remove();
        if (trigger?.isConnected) trigger.focus();
      },
      { once: true },
    );
    document.body.append(drawer);
    drawer.showModal();
    return drawer;
  };
}
