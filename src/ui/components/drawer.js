export function initializeDrawers(app, browser, stable) {
  const window = browser;
  // All form drawers use the same discard protection. Successful submissions bypass it explicitly.
  const snapshots = new WeakMap();
  function formState(dialog) {
    return stable(
      [...dialog.querySelectorAll("input,select,textarea")].map((e) => ({
        type: e.type,
        value: e.value,
        checked: e.checked,
      })),
    );
  }
  function dirty(dialog) {
    return snapshots.has(dialog) && snapshots.get(dialog) !== formState(dialog);
  }
  function discard(dialog) {
    return (
      !dirty(dialog) ||
      window.confirm(
        "Ungespeicherte Änderungen verwerfen? Mit «Abbrechen» bleibst du im Editor.",
      )
    );
  }
  function closeSaved(dialog) {
    snapshots.set(dialog, formState(dialog));
    dialog.close("save");
  }
  app.UTGEdits = {
    dirty,
    closeSaved,
    canNavigate() {
      for (const dialog of document.querySelectorAll(
        "dialog.app-drawer[open]",
      )) {
        if (!discard(dialog)) return false;
        snapshots.set(dialog, formState(dialog));
        dialog.close("cancel");
      }
      return true;
    },
  };
  if (typeof HTMLDialogElement !== "undefined") {
    // Only dialogs created by this application are managed. Native prototypes stay intact.
    app.UTGEdits.createDialog = () => {
      const dialog = document.createElement("dialog");
      const originalShow = dialog.showModal.bind(dialog),
        originalClose = dialog.close.bind(dialog);
      dialog.showModal = function () {
        originalShow();
        if (this.classList.contains("app-drawer"))
          snapshots.set(this, formState(this));
      };
      dialog.close = function (value) {
        if (
          this.classList.contains("app-drawer") &&
          value !== "save" &&
          !discard(this)
        )
          return;
        originalClose(value);
      };
      return dialog;
    };
    document.addEventListener(
      "cancel",
      (event) => {
        if (event.target.matches("dialog.app-drawer")) {
          event.preventDefault();
          event.target.close("cancel");
        }
      },
      true,
    );
    app.addEventListener("beforeunload", (event) => {
      if (
        app.UTGPending?.has() ||
        [...document.querySelectorAll("dialog.app-drawer[open]")].some(dirty)
      ) {
        event.preventDefault();
        event.returnValue = "";
      }
    });
  }
}
