export function initialize(app, browser = globalThis) {
  const sessionStorage = app.sessionStorage ?? globalThis.sessionStorage;
  (() => {
    "use strict";
    const dataKeys = new Set([
      "gever-art-v3-config",
      "gever-art-leistungsmatrix-v1",
      "gever-art-v34-decisions",
    ]);
    let ready = false,
      scheduled = false,
      queued = null,
      batchFailed = false,
      error = null,
      timer = null,
      toast = null,
      alert = null,
      alertText = null,
      sequence = 0;
    const owners = new WeakMap();
    let ownerSequence = 0;
    function scope(element = document.activeElement) {
      const dialog = element?.closest?.("dialog");
      if (dialog) {
        if (!owners.has(dialog))
          owners.set(dialog, "dialog-" + ++ownerSequence);
        return owners.get(dialog);
      }
      if (element?.closest?.("#v3matrix,#utg-pending-inputs")) return "matrix";
      return element?.closest?.("section[id]")?.id || "configuration";
    }
    function pending() {
      return !!app.UTGPending?.has();
    }
    function content(key, text) {
      try {
        const value = JSON.parse(text);
        if (value && typeof value === "object") {
          delete value.updated;
          if (key === "gever-art-v3-config") {
            delete value.team;
            delete value.product;
            delete value.navigationEpoch;
          }
          if (key === "gever-art-leistungsmatrix-v1") delete value.selected;
        }
        return JSON.stringify(
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
      } catch {
        return text;
      }
    }
    function paintBadge(
      badge = document.querySelector(".app-storage-badge"),
      ok = app.UTGStorage?.getStatus(),
    ) {
      if (!badge) return;
      const incomplete = pending(),
        failed = !!error?.local || ok === false;
      badge.textContent = incomplete
        ? "Nicht alle Änderungen gespeichert"
        : failed
          ? "Speichern fehlgeschlagen"
          : ok === true
            ? "Lokal gespeichert"
            : "Lokale Speicherung noch nicht bestätigt";
      badge.dataset.state =
        incomplete || failed ? "error" : ok === true ? "ok" : "unknown";
      badge.classList.toggle("app-open-value", incomplete || failed);
    }
    function paint() {
      if (alert) {
        alert.hidden = !error;
        if (error) alertText.textContent = error.message;
      }
      paintBadge();
    }
    function flush() {
      scheduled = false;
      const success = queued;
      queued = null;
      const failed = batchFailed;
      batchFailed = false;
      if (success && !failed && error?.scope === success.scope && !pending())
        error = null;
      if (ready) {
        paint();
        if (success && !failed) {
          clearTimeout(timer);
          toast.textContent =
            success.message ||
            (pending()
              ? "Änderung gespeichert · weitere Eingaben sind noch offen."
              : "Änderung gespeichert");
          toast.dataset.sequence = String(++sequence);
          toast.hidden = false;
          timer = setTimeout(() => (toast.hidden = true), 1500);
        }
      }
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(flush);
    }
    function written(key, before, after) {
      if (
        !ready ||
        !dataKeys.has(key) ||
        content(key, before) === content(key, after)
      )
        return;
      queued = { scope: scope() };
      schedule();
    }
    function failure(message, options = {}) {
      clearTimeout(timer);
      if (toast) toast.hidden = true;
      error = {
        message:
          message ||
          "Speichern fehlgeschlagen – die Änderung wurde nicht gespeichert.",
        scope: options.scope || scope(options.element),
        local: options.local !== false,
      };
      batchFailed = true;
      queued = null;
      schedule();
    }
    function resolved(owner) {
      if (error?.scope === owner && !pending()) error = null;
      schedule();
    }
    function notice(message, owner = "file") {
      if (!ready) return;
      queued = { message, scope: owner };
      schedule();
    }
    function dismiss() {
      error = null;
      paint();
    }
    function beforeReload(message) {
      if (!ready || batchFailed) return;
      if (message || queued) {
        try {
          sessionStorage.setItem(
            "utg-save-notice",
            JSON.stringify({
              message: message || "Änderung gespeichert",
              time: Date.now(),
            }),
          );
        } catch {}
      }
    }
    function init() {
      if (ready) return;
      toast = document.querySelector(".app-toast");
      if (!toast) {
        toast = document.createElement("div");
        toast.className = "app-toast";
        document.body.append(toast);
      }
      toast.id = "utg-save-feedback";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      toast.hidden = true;
      alert = document.createElement("section");
      alert.id = "utg-save-error";
      alert.hidden = true;
      alertText = document.createElement("p");
      alertText.setAttribute("role", "alert");
      const close = document.createElement("button");
      close.type = "button";
      close.textContent = "Meldung schliessen";
      close.onclick = dismiss;
      alert.append(alertText, close);
      const toolbar = document.querySelector(".toolbar");
      if (toolbar) toolbar.before(alert);
      else document.body.append(alert);
      ready = true;
      paint();
      try {
        const previous = JSON.parse(
          sessionStorage.getItem("utg-save-notice") || "null",
        );
        sessionStorage.removeItem("utg-save-notice");
        if (
          previous &&
          typeof previous.message === "string" &&
          Date.now() - previous.time >= 0 &&
          Date.now() - previous.time < 15000
        )
          notice(previous.message, "reload");
      } catch {}
    }
    // Read the submitted form after its own handler has either committed or displayed an error.
    document.addEventListener(
      "submit",
      (event) => {
        const form = event.target;
        queueMicrotask(() => {
          if (!ready || !form.isConnected) return;
          const message = [
            ...form.querySelectorAll('[role="alert"],.app-save-error'),
          ].find((node) => !node.hidden && node.textContent.trim());
          if (message)
            failure(message.textContent.trim(), { scope: scope(form) });
        });
      },
      true,
    );
    app.UTGFeedback = Object.freeze({
      init,
      written,
      failure,
      resolved,
      notice,
      beforeReload,
      paintBadge,
      dismiss,
      scope,
      state: () => ({
        ready,
        error: error ? { ...error } : null,
        successVisible: !!toast && !toast.hidden,
        successMessage: toast?.textContent || "",
        sequence,
      }),
    });
  })();
}
