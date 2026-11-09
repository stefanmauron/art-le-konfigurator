export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const entries = new Map();
    let panel, description, saveButton, discardButton;
    const read = () => app.UTGStorage.read("gever-art-v3-config") || {};
    function identity(activity, id) {
      const item = id
        ? (read().activities || []).find((a) => a.id === id)
        : (read().activities || []).find((a) => a.name === activity);
      return id || item?.id || null;
    }
    const key = (team, activity, field, id) =>
      JSON.stringify([team, (id ? "id:" : "name:") + (id || activity), field]);
    function resolve(entry) {
      const copy = structuredClone(entry),
        item = copy.activityId
          ? (read().activities || []).find((a) => a.id === copy.activityId)
          : null;
      if (item && item.name !== copy.activity) {
        if (
          copy.seed?.entries &&
          Object.hasOwn(copy.seed.entries, copy.activity)
        ) {
          copy.seed.entries[item.name] = copy.seed.entries[copy.activity];
          delete copy.seed.entries[copy.activity];
        }
        copy.activity = item.name;
      }
      return copy;
    }
    function list() {
      return [...entries.values()].map(resolve);
    }
    function get(team, activity, field) {
      const entry = entries.get(key(team, activity, field, identity(activity)));
      return entry ? resolve(entry) : null;
    }
    function paint() {
      if (!panel) return;
      panel.hidden = !entries.size;
      if (!entries.size) return;
      const teams =
          app.UTGStorage.read("gever-art-leistungsmatrix-v1")?.teams || [],
        counts = new Map();
      for (const entry of entries.values())
        counts.set(entry.team, (counts.get(entry.team) || 0) + 1);
      description.textContent =
        entries.size +
        " nicht gespeicherte " +
        (entries.size === 1 ? "Eingabe" : "Eingaben") +
        " · " +
        [...counts]
          .map(
            ([id, count]) =>
              (teams.find((t) => t.id === id)?.name || id) + " (" + count + ")",
          )
          .join(", ") +
        ". Die Eingaben bleiben beim Team- und Reiterwechsel erhalten.";
      saveButton.disabled = !entries.size;
      discardButton.disabled = !entries.size;
    }
    function record(entry) {
      const copy = structuredClone(entry);
      copy.activityId = identity(copy.activity, copy.activityId);
      entries.set(
        key(copy.team, copy.activity, copy.field, copy.activityId),
        copy,
      );
      app.UTGFeedback?.failure("Änderung nicht gespeichert: " + copy.error, {
        scope: "matrix",
      });
      paint();
    }
    function remove(team, activity, field) {
      const removed = entries.delete(
        key(team, activity, field, identity(activity)),
      );
      if (removed && !entries.size) app.UTGFeedback?.resolved("matrix");
      paint();
    }
    function apply(element, entry) {
      if (!entry) return;
      if (
        element.tagName === "SELECT" &&
        ![...element.options].some((o) => o.value === entry.value)
      ) {
        const option = document.createElement("option");
        option.value = entry.value;
        option.textContent = "Nicht gespeichert: " + entry.value;
        element.append(option);
      }
      element.value = entry.value;
      element.setAttribute("aria-invalid", "true");
      element.title = "Nicht gespeichert: " + entry.error;
    }
    function refresh() {
      paint();
      window.dispatchEvent(new Event("utg:pending-updated"));
    }
    function retry() {
      for (const entry of list()) {
        try {
          if (
            entry.activityId &&
            !(read().activities || []).some((a) => a.id === entry.activityId)
          )
            throw Error(
              "Diese Tätigkeit wurde entfernt. Die offene Eingabe bleibt erhalten.",
            );
          app.UTGMatrix.saveField(
            entry.team,
            entry.activity,
            entry.field,
            entry.value,
            entry.expected,
            entry.seed,
            entry.wasPresent,
          );
          remove(entry.team, entry.activity, entry.field);
        } catch (error) {
          record({ ...entry, error: error.message });
        }
      }
      refresh();
      const status = document.getElementById("status");
      if (status)
        status.textContent = entries.size
          ? "Nicht alle Eingaben konnten gespeichert werden. Die offenen Eingaben bleiben erhalten."
          : "Alle zuvor offenen Eingaben wurden gespeichert.";
      return entries.size === 0;
    }
    function discard() {
      if (!entries.size) return true;
      if (
        !window.confirm(
          entries.size +
            " nicht gespeicherte " +
            (entries.size === 1
              ? "Eingabe ausdrücklich verwerfen?"
              : "Eingaben ausdrücklich verwerfen?") +
            " Die gespeicherte Konfiguration bleibt erhalten.",
        )
      )
        return false;
      entries.clear();
      app.UTGFeedback?.resolved("matrix");
      refresh();
      return true;
    }
    function clearAfterImport() {
      entries.clear();
      app.UTGFeedback?.resolved("matrix");
      paint();
    }
    function init() {
      if (panel) return;
      const nav = document.getElementById("utg-nav");
      if (!nav) return;
      panel = document.createElement("section");
      panel.id = "utg-pending-inputs";
      panel.className = "utg-context-banner";
      panel.setAttribute("aria-label", "Nicht gespeicherte Matrixeingaben");
      panel.hidden = true;
      description = document.createElement("p");
      description.setAttribute("role", "status");
      const actions = document.createElement("div");
      actions.className = "actions";
      saveButton = document.createElement("button");
      saveButton.type = "button";
      saveButton.textContent = "Eingaben erneut speichern";
      saveButton.onclick = retry;
      discardButton = document.createElement("button");
      discardButton.type = "button";
      discardButton.textContent = "Eingaben verwerfen";
      discardButton.onclick = discard;
      actions.append(saveButton, discardButton);
      panel.append(description, actions);
      nav.after(panel);
      paint();
    }
    app.UTGPending = Object.freeze({
      record,
      remove,
      get,
      list,
      apply,
      retry,
      discard,
      clearAfterImport,
      init,
      has: () => entries.size > 0,
      count: () => entries.size,
    });
  })();
}
