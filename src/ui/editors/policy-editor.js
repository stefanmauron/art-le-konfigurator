export function initialize(app, browser = globalThis) {
  const window = browser;

  (() => {
    "use strict";
    app.UTGPolicyEditor = {
      open(name) {
        const key = "gever-art-v3-config",
          data = app.UTGStorage.read(key);
        if (!data || data.schema !== 3)
          throw Error(
            "Die Konfiguration ist nicht verfügbar. Bitte neu laden.",
          );
        const stage = app.UTGFlow.states.indexOf(name);
        if (stage < 0) throw Error("Unbekannte Flow-Phase.");
        if (data.policies !== undefined && !Array.isArray(data.policies))
          throw Error("Die Flow-Regeln sind ungültig.");
        const matches = (data.policies || []).filter((p) => p.name === name);
        if (matches.length > 1)
          throw Error(
            "Diese Flow-Regel ist mehrfach vorhanden. Bitte die Konfiguration bereinigen.",
          );
        const creating = !matches.length,
          policy = matches[0] || {
            name,
            type: stage === 6 ? "Abschluss" : "Übergang",
            owner: "",
            contributors: "",
            evidence: "",
            exit: "",
            wip: "",
            scope: "ART",
            interface: "",
          },
          initial = creating ? null : JSON.stringify(policy),
          dialog =
            app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
        dialog.className = "app-drawer";
        dialog.setAttribute("aria-labelledby", "utg-art-policy-title");
        const form = document.createElement("form"),
          title = document.createElement("h2");
        title.id = "utg-art-policy-title";
        title.textContent =
          (creating
            ? "ART-weite Regel erfassen · "
            : "ART-weite Regel bearbeiten · ") + name;
        const hint = document.createElement("p");
        hint.className = "utg-scope-banner";
        hint.textContent = creating
          ? "Diese ART-Regel fehlt. Sie wird erst nach erfolgreichem Speichern angelegt und gilt dann für alle Teams. Bestehende Team-Kriterien bleiben erhalten."
          : "Diese Änderung gilt für alle bestehenden Teams. Sie ändert keine individuellen Team-Kriterien.";
        form.append(title, hint);
        const inputs = [];
        for (const [field, label] of [
          ["type", "Policy-Typ"],
          ["owner", "Verantwortliche Entscheidrolle"],
          ["contributors", "Beteiligte Rollen"],
          ["evidence", "Erwarteter Nachweis / Referenz"],
          ["exit", "ART-weiter Mindestvertrag"],
          ["wip", "WIP-Limit (optional)"],
          ["interface", "LE-Übergabe / Schnittstelle"],
        ]) {
          const wrap = document.createElement("label");
          wrap.textContent = label;
          const input = document.createElement(
            field === "type"
              ? "select"
              : ["exit", "interface", "evidence"].includes(field)
                ? "textarea"
                : "input",
          );
          if (field === "type")
            for (const value of [
              "Übergang",
              "Ausführung",
              "Schnittstelle",
              "Abschluss",
            ]) {
              const option = document.createElement("option");
              option.value = value;
              option.textContent = value;
              input.append(option);
            }
          if (field === "wip") {
            input.type = "number";
            input.min = "1";
          }
          input.value = policy[field] || "";
          input.required = ["owner", "exit", "evidence"].includes(field);
          wrap.append(input);
          form.append(wrap);
          inputs.push({ key: field, input });
        }
        const error = document.createElement("p");
        error.className = "app-save-error";
        error.setAttribute("role", "alert");
        const actions = document.createElement("div");
        actions.className = "actions";
        const cancel = document.createElement("button");
        cancel.type = "button";
        cancel.textContent = "Abbrechen";
        cancel.onclick = () => dialog.close();
        const save = document.createElement("button");
        save.type = "submit";
        save.textContent = creating
          ? "ART-weite Regel erstellen"
          : "ART-weite Regel speichern";
        save.className = "primary";
        actions.append(cancel, save);
        form.append(error, actions);
        form.onsubmit = (event) => {
          event.preventDefault();
          try {
            const next = app.UTGStorage.read(key);
            if (
              !next ||
              next.schema !== 3 ||
              (next.policies !== undefined && !Array.isArray(next.policies))
            )
              throw Error(
                "Die Konfiguration wurde inzwischen verändert. Bitte neu öffnen.",
              );
            const current = (next.policies || []).filter(
              (p) => p.name === name,
            );
            if (
              creating
                ? current.length > 0
                : current.length !== 1 || JSON.stringify(current[0]) !== initial
            )
              throw Error(
                creating
                  ? "Die Regel wurde inzwischen angelegt. Bitte neu öffnen."
                  : "Die Regel wurde inzwischen geändert oder entfernt. Bitte neu öffnen.",
              );
            const values = Object.fromEntries(
              inputs.map(({ key, input }) => [key, input.value]),
            );
            if (
              creating &&
              ["owner", "exit", "evidence"].some(
                (field) => !values[field].trim(),
              )
            )
              throw Error(
                "Entscheidrolle, Mindestvertrag und erwarteten Nachweis ausfüllen.",
              );
            app.UTGStorage.validatePolicyWip(values.wip);
            if (creating) {
              let id = "FP-" + (stage + 1);
              if ((next.policies || []).some((p) => p.id === id))
                id +=
                  "-" +
                  Date.now().toString(36) +
                  "-" +
                  Math.random().toString(36).slice(2, 7);
              next.policies ??= [];
              next.policies.push({ id, name, ...values, scope: "ART" });
            } else Object.assign(current[0], values, { scope: "ART" });
            app.UTGStorage.write(key, next);
            window.dispatchEvent(new Event("gever-v3-updated"));
            app.UTGEdits.closeSaved(dialog);
          } catch (e) {
            error.textContent = "Nicht gespeichert: " + e.message;
          }
        };
        dialog.append(form);
        document.body.append(dialog);
        const trigger = document.activeElement;
        dialog.addEventListener(
          "close",
          () => {
            dialog.remove();
            if (trigger?.isConnected) trigger.focus();
            else document.querySelector("#utg33detail button")?.focus();
          },
          { once: true },
        );
        dialog.showModal();
        inputs[0].input.focus();
        return dialog;
      },
    };
  })();
}
