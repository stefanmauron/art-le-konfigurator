export function initialize(app, browser = globalThis) {
  const window = browser;
  const localStorage = app.localStorage ?? globalThis.localStorage;
  app.UTGVersion = "{{release.version}}";
  app.UTGReleaseStage = "{{release.stage}}";
  app.UTGStorageStatus = { ok: null };
  app.UTGStorage = Object.freeze({
    getStatus() {
      return app.UTGStorageStatus.ok;
    },
    rawGet(key) {
      return localStorage.getItem(key);
    },
    rawSet(key, value) {
      let before = null;
      try {
        before = localStorage.getItem(key);
      } catch {}
      try {
        localStorage.setItem(key, value);
        app.UTGFeedback?.written(key, before, value);
        app.UTGStorageStatus.ok = true;
        if (
          [
            "gever-art-v3-config",
            "gever-art-leistungsmatrix-v1",
            "gever-art-v34-decisions",
          ].includes(key)
        )
          window.dispatchEvent(
            new CustomEvent("utg:storage-status", { detail: { ok: true } }),
          );
      } catch (error) {
        app.UTGStorageStatus.ok = false;
        app.UTGFeedback?.failure(
          "Speichern fehlgeschlagen – die Änderung wurde nicht gespeichert. " +
            error.message,
        );
        const node = document.getElementById("status");
        if (node)
          node.textContent =
            "Speichern fehlgeschlagen – Änderungen sind nicht gesichert.";
        window.dispatchEvent(
          new CustomEvent("utg:storage-status", { detail: { ok: false } }),
        );
        throw error;
      }
    },
    rawRemove(key) {
      return localStorage.removeItem(key);
    },
    keys: Object.freeze({
      teams: "gever-art-leistungsmatrix-v1",
      config: "gever-art-v3-config",
      organisations: "gever-art-v34-decisions",
    }),
    read(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw === null ? fallback : JSON.parse(raw);
      } catch (e) {
        console.warn("Storage read:", key, e);
        return fallback;
      }
    },
    write(key, value) {
      this.rawSet(key, JSON.stringify(value));
      return value;
    },
    snapshot() {
      return {
        v2: this.read(this.keys.teams),
        v3: this.read(this.keys.config),
        organisations: this.read(this.keys.organisations, {}),
      };
    },
    bundle() {
      return {
        format: "utg-le-complete",
        version: 4,
        appVersion: app.UTGVersion,
        releaseStage: app.UTGReleaseStage,
        exported: new Date().toISOString(),
        ...this.snapshot(),
      };
    },
    validatePolicyWip(value) {
      if (value === undefined || (typeof value === "string" && !value.trim()))
        return true;
      if (
        (typeof value !== "number" && typeof value !== "string") ||
        (typeof value === "string" &&
          !/^\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i.test(value.trim())) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) < 1
      )
        throw Error(
          "Ungültiges WIP-Limit: eine positive ganze Zahl oder ein leeres Feld angeben.",
        );
      return true;
    },
    validateWikiUrl(value, productName) {
      if (value === undefined || value === "") return true;
      try {
        if (typeof value !== "string") throw Error();
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw Error();
        return true;
      } catch {
        throw Error(
          "Produkt «" +
            productName +
            "»: Der Wiki-Link muss eine gültige HTTP- oder HTTPS-Adresse sein.",
        );
      }
    },
    validateBundle(b) {
      const object = (v) => !!v && typeof v === "object" && !Array.isArray(v),
        fail = (message) => {
          throw Error(message);
        };
      if (
        !object(b) ||
        !object(b.v2) ||
        !object(b.v3) ||
        !Array.isArray(b.v2.teams) ||
        b.v3.schema !== 3
      )
        fail("Ungültige oder unvollständige Konfiguration");
      if (
        b.format !== undefined &&
        !["utg-le-complete", "gever-art-v3"].includes(b.format)
      )
        fail("Unbekanntes Konfigurationsformat");
      if (
        b.format === "utg-le-complete" &&
        b.version !== undefined &&
        b.version !== 4
      )
        fail("Nicht unterstützte Konfigurationsversion");
      function safe(value) {
        if (!value || typeof value !== "object") return;
        for (const key of Object.keys(value)) {
          if (key === "__proto__")
            fail("Unzulässiger Schlüssel in der Konfiguration");
          safe(value[key]);
        }
      }
      safe(b);
      function catalog(items, label) {
        if (
          !Array.isArray(items) ||
          items.some(
            (x) =>
              !object(x) ||
              typeof x.id !== "string" ||
              !x.id ||
              typeof x.name !== "string" ||
              !x.name.trim(),
          )
        )
          fail("Ungültiger Katalog: " + label);
        if (new Set(items.map((x) => x.id)).size !== items.length)
          fail("Doppelte IDs: " + label);
        if (
          new Set(items.map((x) => x.name.trim().toLocaleLowerCase("de-CH")))
            .size !== items.length
        )
          fail("Doppelte Namen: " + label);
      }
      catalog(b.v2.teams, "Teams");
      catalog(b.v3.products, "Produkte");
      catalog(b.v3.services, "LE-Services");
      catalog(b.v3.activities, "Tätigkeiten");
      const strings = (record, fields) => {
        for (const field of fields)
          if (record[field] !== undefined && typeof record[field] !== "string")
            fail("Ungültiges Textfeld: " + field);
      };
      for (const a of b.v3.activities) {
        strings(a, ["phase", "type", "description", "service"]);
        if (
          a.additionalPhases !== undefined &&
          (!Array.isArray(a.additionalPhases) ||
            a.additionalPhases.some((p) => typeof p !== "string"))
        )
          fail("Ungültige begleitende Phasen");
      }
      for (const service of b.v3.services)
        strings(service, ["provider", "embedding", "interaction", "model"]);
      for (const product of b.v3.products) {
        strings(product, ["description", "wikiUrl"]);
        this.validateWikiUrl(product.wikiUrl, product.name);
      }
      if (b.v3.flowCriteria !== undefined)
        app.UTGFlowCriteria.validate(b.v3.flowCriteria);
      app.UTGFlowStandard.validateGovernance(b.v3.flowGovernance);
      const assigned = new Set(),
        productIds = new Set(b.v3.products.map((p) => p.id));
      for (const team of b.v2.teams) {
        if (team.assignments !== undefined && !object(team.assignments))
          fail("Ungültige Team-Zuordnungen");
        if (team.productIds !== undefined) {
          if (!Array.isArray(team.productIds))
            fail("Ungültige Produktzuordnung");
          for (const id of team.productIds) {
            if (!productIds.has(id) || assigned.has(id))
              fail("Unbekanntes oder mehrfach zugeordnetes Produkt");
            assigned.add(id);
          }
        }
      }
      if (!object(b.v3.configs)) fail("Ungültige Leistungsmatrix");
      for (const config of Object.values(b.v3.configs)) {
        if (!object(config) || !object(config.entries))
          fail("Ungültige Flow-Zuordnungen");
        strings(config, ["status"]);
        for (const entry of Object.values(config.entries)) {
          if (!object(entry))
            fail("Ungültige Tätigkeit in der Leistungsmatrix");
          if (
            entry.orgSource !== undefined &&
            !["explicit", "service"].includes(entry.orgSource)
          )
            fail("Ungültige Herkunft der Ausführung");
          strings(entry, [
            "org",
            "embedding",
            "interaction",
            "business",
            "technical",
            "operations",
            "service",
            "note",
            "model",
          ]);
        }
      }
      if (b.v3.embeddingKinds !== undefined) {
        if (
          !object(b.v3.embeddingKinds) ||
          Object.values(b.v3.embeddingKinds).some(
            (kind) =>
              !["embedded", "art-team", "shared", "outside", "custom"].includes(
                kind,
              ),
          )
        )
          fail("Ungültige Kennungen der Einbindung");
      }
      for (const field of ["providers", "embeddings", "interactions"])
        if (b.v3[field] !== undefined) {
          if (
            !Array.isArray(b.v3[field]) ||
            b.v3[field].some((v) => typeof v !== "string" || !v.trim())
          )
            fail("Ungültiger Auswahlkatalog: " + field);
          const names = b.v3[field].map((v) =>
            v.trim().toLocaleLowerCase("de-CH"),
          );
          if (
            names.some((v) =>
              ["noch zu klären", "nicht erforderlich", "__proto__"].includes(v),
            )
          )
            fail("Reservierter Systembegriff im Auswahlkatalog: " + field);
          if (new Set(names).size !== names.length)
            fail("Doppelte Namen im Auswahlkatalog: " + field);
        }
      if (b.v3.providerRecords !== undefined) {
        catalog(b.v3.providerRecords, "Anbieterkennungen");
        if (
          b.v3.providerRecords.some(
            (r) =>
              !["art", "isceco", "joint", "shared", "other"].includes(r.kind) ||
              ["noch zu klären", "nicht erforderlich", "__proto__"].includes(
                r.name.trim().toLocaleLowerCase("de-CH"),
              ),
          )
        )
          fail("Ungültige Anbieterkennungen");
      }
      if (b.v3.policies !== undefined) {
        if (
          !Array.isArray(b.v3.policies) ||
          b.v3.policies.some((p) => !object(p) || typeof p.name !== "string")
        )
          fail("Ungültige Flow Policies");
        for (const p of b.v3.policies) {
          strings(p, [
            "exit",
            "owner",
            "contributors",
            "evidence",
            "scope",
            "type",
            "interface",
          ]);
          this.validatePolicyWip(p.wip);
        }
      }
      if (b.v3.teamContracts !== undefined) {
        if (!object(b.v3.teamContracts))
          fail("Ungültige Team-Verantwortlichkeiten");
        for (const c of Object.values(b.v3.teamContracts)) {
          if (!object(c)) fail("Ungültige Team-Verantwortlichkeiten");
          strings(c, [
            "business",
            "technical",
            "operations",
            "release",
            "escalation",
          ]);
        }
      }
      if (
        b.v3.navigationEpoch !== undefined &&
        typeof b.v3.navigationEpoch !== "string"
      )
        fail("Ungültiger Konfigurationskontext");
      if (b.v3.agreementConfirmations !== undefined) {
        if (!object(b.v3.agreementConfirmations))
          fail("Ungültige Statusbestätigungen");
        for (const record of Object.values(b.v3.agreementConfirmations)) {
          if (
            !object(record) ||
            !["Abgestimmt", "Freigegeben"].includes(record.status) ||
            typeof record.signature !== "string" ||
            (record.categorySignature !== undefined &&
              typeof record.categorySignature !== "string") ||
            typeof record.confirmedAt !== "string" ||
            !Number.isFinite(Date.parse(record.confirmedAt))
          )
            fail("Ungültige Statusbestätigung");
        }
      }
      if (b.organisations !== undefined && !object(b.organisations))
        fail("Ungültige Organisationsdaten");
      app.UTGDesignCriteria.validate(b.v3);
      return true;
    },
    commitPair(v2, v3) {
      this.restore({
        v2,
        v3,
        organisations: this.read(this.keys.organisations, {}),
      });
    },
    restore(b) {
      this.validateBundle(b);
      const data = structuredClone(b);
      app.UTGModels?.normalizeServiceReferences(data.v3);
      for (const team of data.v2.teams) team.assignments ??= {};
      const changes = [
          [this.keys.config, JSON.stringify(data.v3)],
          [this.keys.teams, JSON.stringify(data.v2)],
          [this.keys.organisations, JSON.stringify(data.organisations || {})],
        ],
        written = [];
      try {
        for (const [key, value] of changes) {
          const before = this.rawGet(key);
          if (before === value) continue;
          this.rawSet(key, value);
          written.push([key, before]);
        }
      } catch (error) {
        const failed = [];
        for (const [key, before] of written.reverse()) {
          try {
            if (before === null) localStorage.removeItem(key);
            else localStorage.setItem(key, before);
          } catch (rollback) {
            failed.push(key);
          }
        }
        app.UTGStorageStatus.ok = false;
        app.UTGFeedback?.failure(
          failed.length
            ? "Speichern fehlgeschlagen; der bisherige Stand konnte nicht vollständig wiederhergestellt werden."
            : "Speichern fehlgeschlagen. Die bisherige Konfiguration wurde wiederhergestellt.",
        );
        window.dispatchEvent(
          new CustomEvent("utg:storage-status", { detail: { ok: false } }),
        );
        if (failed.length)
          throw Error(
            "Speichern fehlgeschlagen; Wiederherstellung des bisherigen Speichers nicht vollständig möglich: " +
              failed.join(", "),
          );
        throw Error(
          "Speichern fehlgeschlagen. Die bisherige Konfiguration wurde wiederhergestellt. " +
            error.message,
        );
      }
    },
  });
}
