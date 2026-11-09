const fs = require("node:fs");
const { appRoot } = require("./paths.cjs");
const path = require("node:path");
const reference = JSON.parse(
  fs.readFileSync(
    path.join(appRoot, "tests/fixtures/import-compatibility.json"),
    "utf8",
  ),
);
function generate(teamCount, productCount, seed = 20261105) {
  const b = structuredClone(reference),
    templateId = b.v2.teams[0].id,
    profile = structuredClone(b.v3.flowCriteria.profiles[templateId]),
    criteria = structuredClone(b.v3.teamDesignCriteria[templateId]);
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed;
  };
  b.exported = "2026-11-05T00:00:00.000Z";
  b.appVersion = "3.14.9";
  b.v2 = { teams: [], selected: "load-team-001" };
  b.v3.products = [];
  b.v3.configs = {};
  b.v3.teamDesignCriteria = {};
  b.v3.teamDesignAssessments = {};
  b.v3.teamContracts = {};
  b.v3.agreementConfirmations = {};
  b.v3.flowCriteria.profiles = {};
  b.v3.flowCriteria.teams = {};
  delete b.v3.navigationEpoch;
  for (let i = 0; i < teamCount; i++) {
    const id = "load-team-" + String(i + 1).padStart(3, "0");
    b.v2.teams.push({
      id,
      name:
        "Lastteam " +
        String(i + 1).padStart(3, "0") +
        " · Geschäftsverwaltung Bund",
      description: "Reproduzierbare synthetische Testkonfiguration",
      assignments: {},
      productIds: [],
    });
    b.v3.teamDesignCriteria[id] = structuredClone(criteria);
    b.v3.flowCriteria.profiles[id] = structuredClone(profile);
    b.v3.teamContracts[id] = {
      business: "PO " + (i + 1),
      technical: "Tech Lead " + (i + 1),
      operations: "Betrieb " + (i + 1),
      release: "Release " + (i + 1),
      escalation: "ART Sync",
    };
    const entries = {};
    for (const a of b.v3.activities) {
      const providers = [
        "ART",
        "ISCeco",
        "BIT",
        "Noch zu klären",
        "Nicht erforderlich",
      ];
      entries[a.name] = {
        org: providers[rand() % providers.length],
        orgSource: "explicit",
        embedding: b.v3.embeddings[rand() % b.v3.embeddings.length],
        interaction: b.v3.interactions[rand() % b.v3.interactions.length],
        business: "PO " + (i + 1),
        technical: "Tech " + (i + 1),
        operations: "Ops " + (i + 1),
        service:
          rand() % 3 === 0
            ? b.v3.services[rand() % b.v3.services.length].id
            : "",
        note: "Seed 20261105 · " + a.id + " · " + (rand() % 100000),
      };
    }
    b.v3.configs[id + "::flow"] = { status: "Entwurf", entries };
  }
  for (let i = 0; i < productCount; i++) {
    const id = "load-product-" + String(i + 1).padStart(4, "0");
    b.v3.products.push({
      id,
      name:
        "Lastprodukt " +
        String(i + 1).padStart(4, "0") +
        " · Informationsführung",
      description: "Synthetisches Produkt für die Freigabeprüfung.",
      wikiUrl: "https://example.invalid/load/" + (i + 1),
    });
    b.v2.teams[i % teamCount].productIds.push(id);
  }
  b.v3.team = b.v2.selected;
  b.v3.product = b.v2.teams[0]?.productIds[0] || "";
  b.v3.operatingModelVersion = "3.14.9";
  return b;
}
module.exports = { generate };
