export function initialize(app, browser = globalThis) {
  const window = browser;
  app.UTGFiles = {
    async save(downloadOnly = false) {
      const status = document.getElementById("status");
      try {
        if (
          app.UTGPending?.has() ||
          document.querySelector('[aria-invalid="true"]')
        )
          throw Error(
            "Es gibt nicht gespeicherte Änderungen. Bitte diese zuerst erneut übernehmen.",
          );
        const snapshot = app.UTGStorage.bundle(),
          bundle = app.UTGFlowUX?.forExport(snapshot) || snapshot;
        app.UTGStorage.validateBundle(bundle);
        const body = JSON.stringify(bundle, null, 2),
          name = "{{release.exportFilename}}";
        if (!downloadOnly && typeof window.showSaveFilePicker === "function") {
          const handle = await window.showSaveFilePicker({
            suggestedName: name,
            types: [
              {
                description: "Konfigurationsdatei",
                accept: { "application/json": [".json"] },
              },
            ],
          });
          const stream = await handle.createWritable();
          try {
            await stream.write(body);
            await stream.close();
          } catch (error) {
            try {
              await stream.abort?.();
            } catch {}
            throw error;
          }
          app.UTGFeedback?.notice(
            "Konfiguration als Datei gespeichert",
            "file",
          );
          if (status)
            status.textContent =
              "Konfiguration als Datei gespeichert · " + handle.name;
          return "saved";
        }
        const url = URL.createObjectURL(
          new Blob([body], { type: "application/json" }),
        );
        try {
          const link = document.createElement("a");
          link.href = url;
          link.download = name;
          document.body.append(link);
          link.click();
          link.remove();
        } finally {
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        }
        app.UTGFeedback?.notice(
          "Download gestartet · Abschluss im Browser prüfen",
          "file",
        );
        if (status)
          status.textContent =
            "Download gestartet · Konfiguration · Abschluss im Browser prüfen";
        return "download";
      } catch (error) {
        if (error.name === "AbortError") {
          if (status)
            status.textContent =
              "Dateispeicherung abgebrochen · lokale Konfiguration bleibt erhalten";
          return "cancelled";
        }
        app.UTGFeedback?.failure(
          "Datei konnte nicht gespeichert werden: " + error.message,
          { scope: "file", local: false },
        );
        if (status)
          status.textContent =
            "Datei konnte nicht gespeichert werden: " + error.message;
        return "failed";
      }
    },
  };
}
