// Independent acceptance expectations. Genuine product gaps stay red.
// Sources and local policy choices: dokumentation/bekannte-einschraenkungen.md
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../.."),
  file = path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
  html = fs.readFileSync(file, "utf8"),
  out =
    process.env.OUTPUT_DIR ||
    path.join(root, ".test-output/unit-known-findings");
fs.mkdirSync(out, { recursive: true });
const stages = [
    "Funnel",
    "Analyzing",
    "Backlog",
    "Implementing",
    "Validating",
    "Deploying & Releasing",
    "Done",
  ],
  ctx = {
    window: { UTGFlow: { states: stages } },
    structuredClone,
    URL,
    console,
  };
vm.createContext(ctx);
for (const id of [
  "utg-flow-standard-3152",
  "utg-flow-criteria-data",
  "utg-design-criteria-data",
  "utg-storage-api",
  "utg-operating-model-review",
])
  vm.runInContext(
    html.match(
      new RegExp('<script id="' + id + '">([\\s\\S]*?)<\\/script>'),
    )[1],
    ctx,
  );
const api = ctx.window.UTGFlowCriteria,
  std = ctx.window.UTGFlowStandard,
  storage = ctx.window.UTGStorage,
  review = ctx.window.UTGOperatingModelReview,
  plain = (x) => JSON.parse(JSON.stringify(x)),
  checks = [];
function base() {
  const b = JSON.parse(
    html.match(/const snapshot=(\{"v2"[\s\S]*?);function baseline/)[1],
  );
  b.v2 = {
    teams: [
      {
        id: "alpha",
        name: "Team Alpha",
        productIds: ["pa", "pc"],
        assignments: {},
      },
      { id: "beta", name: "Team Beta", productIds: ["pb"], assignments: {} },
    ],
    selected: "alpha",
  };
  b.v3.products = ["a", "b", "c"].map((id) => ({
    id: "p" + id,
    name: "Produkt " + id,
    description: "Fachlicher Umfang " + id,
    wikiUrl: "https://example.invalid/" + id,
  }));
  b.v3.team = "alpha";
  b.v3.product = "pa";
  api.initialize(b.v3);
  for (const t of b.v2.teams) api.ensureTeam(b.v3, t.id);
  b.v3.configs = Object.fromEntries(
    b.v2.teams.map((t) => [
      t.id + "::flow",
      {
        status: "Entwurf",
        entries: Object.fromEntries(
          b.v3.activities.map((a) => [
            a.name,
            {
              org: "UTG-ART",
              orgSource: "explicit",
              embedding: "Im Team integriert",
              interaction: "Nicht erforderlich",
              business: "Product Owner",
              technical: "Team",
              operations: "Betrieb",
              service: "",
              note: "Teaminterne Ausführung",
            },
          ]),
        ),
      },
    ]),
  );
  b.v3.flowGovernance = {
    ...std.governance(),
    status: "Vereinbart",
    wip: "Maximal 2 Features je Team zwischen Implementing und Done; Blockaden zählen mit.",
    sle: "85% der Features in höchstens 10 Kalendertagen; gemessene Durchlaufzeiten als Grundlage.",
    decisionRole: "Product Management mit Teams",
    evidence: "Vereinbarung vom 6. November 2026",
  };
  return b;
}
function run(id, area, expectation, fn) {
  try {
    const observed = fn();
    checks.push({
      id,
      area,
      expectation,
      ok: true,
      ...(observed ? { observed } : {}),
    });
    console.log("PASS " + id);
  } catch (e) {
    checks.push({
      id,
      area,
      expectation,
      ok: false,
      error: e.message,
      ...(e.observed ? { observed: e.observed } : {}),
    });
    console.log("FAIL " + id + " " + e.message);
  }
}
function detection(b) {
  const before = JSON.stringify(b);
  let rejected = null;
  try {
    storage.validateBundle(b);
  } catch (e) {
    rejected = e.message;
  }
  let findings;
  try {
    findings = plain(review.validate(b.v2, b.v3, true));
  } catch (e) {
    throw Error("Plausibilitätsprüfung bricht ab: " + e.message);
  }
  assert.equal(
    JSON.stringify(b),
    before,
    "Prüfung darf keine Daten umschreiben",
  );
  return { rejected, findings };
}
function mustDetect(b) {
  const result = detection(b);
  if (!result.rejected && !result.findings.length) {
    const e = Error(
      "Widerspruch wird weder beim Validieren abgelehnt noch als Finding angezeigt.",
    );
    e.observed = result;
    throw e;
  }
  return result;
}
run(
  "M00-valid-complete-context",
  "positive",
  "Eine vollständige kontextspezifische Vereinbarung darf keine Fehlwarnung auslösen.",
  () => {
    const r = detection(base());
    assert.equal(r.rejected, null);
    assert.equal(r.findings.length, 0);
    return r;
  },
);
// Human-reviewed concept contracts: these are assertions about the shipped defaults,
// not a semantic certification engine for arbitrary free text.
const contract = {
  Funnel: [/Bedarf|Anliegen/, /Nutz/, /Analyse/, /Kapazität|kapazitiv/],
  Analyzing: [/Ziel/, /Umfang/, /AC/, /Risiken/, /Abhängigkeiten/, /Mess/],
  Backlog: [
    /priorisier/i,
    /Kapazität/,
    /ziehen|Pull/,
    /Lieferbeiträge|Zusagen/,
  ],
  Implementing: [/integriert/i, /Build/, /Reviews/, /Tests/],
  Validating: [/DoD/, /integriert/i, /blockierend/i, /Nachweis/i],
  "Deploying & Releasing": [
    /Bereitstellung|Deployment/,
    /Nutzungsfreigabe|Freigabe/,
    /Betriebsübernahme/,
    /Rückfall|Rollback/,
  ],
  Done: [
    /Abschluss/,
    /Nachweise/,
    /Messauftrag/,
    /Verantwortung|verantwort/,
    /Termin/,
    /Datenquelle/,
  ],
};
for (const stage of stages) {
  run(
    "M01-default-phase:" + stage,
    "standard",
    "Phasenregel enthält die unabhängig festgelegten Entscheid- und Nachweisaspekte.",
    () => {
      const b = base(),
        p = b.v3.policies.find((x) => x.name === stage),
        g = b.v3.flowCriteria.phaseGates[stage];
      assert(p.owner.trim() && p.evidence.trim());
      assert.equal(p.type, stage === "Done" ? "Abschluss" : "Übergang");
      const text = [
        p.exit,
        p.evidence,
        ...g.map((c) => c.description + " " + c.evidence),
      ].join(" ");
      for (const concept of contract[stage])
        assert(concept.test(text), "Fehlender Aspekt " + concept);
      const exit = g.find(
        (c) => c.type === (stage === "Done" ? "Abschluss" : "Übergang"),
      );
      assert.equal(p.exit, exit.description);
      assert.equal(p.owner, exit.owner);
    },
  );
  run(
    "M02-policy-kind:" + stage,
    "phase-kind",
    "ART-Regel: Abschluss nur für Done; davor Übergang oder eine explizit abweichend modellierte Regel.",
    () => {
      const b = base();
      b.v3.policies.find((x) => x.name === stage).type =
        stage === "Done" ? "Übergang" : "Abschluss";
      return mustDetect(b);
    },
  );
  for (const field of ["owner", "evidence"])
    run(
      "M03-policy-placeholder:" + stage + ":" + field,
      "placeholder",
      "Ein explizit offener Entscheid oder Nachweis muss sichtbar offen bleiben.",
      () => {
        const b = base();
        b.v3.policies.find((x) => x.name === stage)[field] =
          "Noch zu vereinbaren";
        return mustDetect(b);
      },
    );
  run(
    "M04-incomplete-criterion:" + stage,
    "criterion",
    "Fehlende Nachweisrolle eines Teamkriteriums muss als Finding erscheinen.",
    () => {
      const b = base();
      b.v3.flowCriteria.profiles.alpha.phaseGates[stage][0].owner =
        "Noch zu klären";
      return mustDetect(b);
    },
  );
  run(
    "M05-isolated-phase-edit:" + stage,
    "isolation",
    "Team-Phasenänderung verändert keine andere Phase, kein anderes Team und keine Standardvorlage.",
    () => {
      const b = base(),
        before = plain(b.v3),
        items = api.typed(b.v3, stage, "alpha", "Phase");
      items[0].description = "Konkreter Entscheid " + stage;
      items[0].owner = "Verantwortliche Rolle Alpha";
      items[0].evidence = "Referenz " + stage;
      const next = api.updateTyped(b.v3, stage, "alpha", "Phase", items);
      assert.deepEqual(
        plain(next.flowCriteria.profiles.beta),
        before.flowCriteria.profiles.beta,
      );
      for (const other of stages.filter((x) => x !== stage)) {
        assert.deepEqual(
          plain(next.flowCriteria.profiles.alpha.phaseGates[other]),
          before.flowCriteria.profiles.alpha.phaseGates[other],
        );
        assert.deepEqual(
          plain(next.flowCriteria.profiles.alpha.rules[other]),
          before.flowCriteria.profiles.alpha.rules[other],
        );
      }
      assert.deepEqual(plain(next.policies), before.policies);
      assert.deepEqual(
        plain(next.flowCriteria.commonDoD),
        before.flowCriteria.commonDoD,
      );
      assert.deepEqual(
        plain(next.flowCriteria.commonDoR),
        before.flowCriteria.commonDoR,
      );
      assert.equal(next.configs["alpha::flow"].status, "Entwurf");
      assert(!next.agreementConfirmations?.alpha);
    },
  );
}
const handoffs = [
  ["Funnel", "Analyzing", [/Analyse/, /Kapazität|kapazitiv/]],
  ["Analyzing", "Backlog", [/AC/, /Umfang/, /Risiken/, /Abhängigkeiten/]],
  [
    "Backlog",
    "Implementing",
    [/priorisier/i, /Kapazität/, /bereit/, /Lieferbeiträge/],
  ],
  [
    "Implementing",
    "Validating",
    [/integriert/i, /prüfbar|Prüfbar/, /Tests|Prüfungen/],
  ],
  [
    "Validating",
    "Deploying & Releasing",
    [/DoD/, /blockierend/, /Unterlagen|Informationen/i],
  ],
  [
    "Deploying & Releasing",
    "Done",
    [/Bereitstellung/, /Nutzungsfreigabe/, /Betriebsübernahme/],
  ],
];
for (const [from, to, concepts] of handoffs)
  run(
    "M20-handoff:" + from + ":" + to,
    "handoff",
    "Ausgangsvereinbarung und nächster Eintritt referenzieren denselben fachlichen Übergabezustand.",
    () => {
      const f = base().v3.flowCriteria,
        exit = f.phaseGates[from].find((c) => c.type === "Übergang"),
        entry = f.phaseGates[to].find((c) => c.type === "Eintritt");
      for (const concept of concepts) {
        assert(concept.test(exit.description), "Ausgang: " + concept);
        assert(concept.test(entry.description), "Eintritt: " + concept);
      }
    },
  );
run(
  "M06-dor-purpose",
  "standard",
  "DoR beschreibt die Bereitschaft des nächsten Schritts und verlangt keine fertige Lösung.",
  () => {
    const f = base().v3.flowCriteria,
      text = f.commonDoR.map((c) => c.description + " " + c.evidence).join(" ");
    for (const p of [
      /nächste/i,
      /AC/,
      /Lieferbeiträge|Beiträge/,
      /bedarf|Bedarf/,
    ])
      assert(p.test(text));
    assert(!/DoD (?:ist )?erfüllt|bereits ausgeliefert/i.test(text));
    assert(
      /keine vollständige Umsetzungsbereitschaft/i.test(
        std.context("Funnel", "DoR"),
      ),
    );
    assert(/keine neue Bereitschaftsprüfung/i.test(std.context("Done", "DoR")));
  },
);
run(
  "M07-dod-purpose",
  "standard",
  "DoD enthält überprüfbare Ergebnisqualität, Integration, Tests, Schutz und Migrationsfolgen.",
  () => {
    const text = base()
      .v3.flowCriteria.commonDoD.map((c) => c.description + " " + c.evidence)
      .join(" ");
    for (const p of [
      /AC/,
      /integriert/,
      /Tests|Testnachweise/,
      /Security/,
      /Datenschutz/,
      /Barrierefreiheit/,
      /Performance/,
      /Resilienz/,
      /Migration/,
      /Daten/,
    ])
      assert(p.test(text));
    assert(
      !/alle Fehler behoben|keinerlei Fehler|Wirkung nachgewiesen/.test(text),
    );
  },
);
run(
  "M08-release-is-not-dod",
  "standard",
  "Auslieferbarkeit, tatsächliche Nutzungsfreigabe und spätere Wirkung bleiben getrennt.",
  () => {
    const f = base().v3.flowCriteria,
      release = f.rules["Deploying & Releasing"].criteria
        .map((c) => c.description)
        .join(" ");
    assert(/entkoppeltem Release/.test(release));
    assert(/Deployment und Freigabe zur Nutzung getrennt/.test(release));
    assert(/Erforderlichkeit/.test(release));
    assert(/spätere Wirkung bleibt separat/.test(std.context("Done", "DoD")));
    assert(/vor.*ausgeliefert/i.test(std.context("Validating", "DoD")));
  },
);
run(
  "M09-product-minimum-quality",
  "standard",
  "Team-DoD konkretisiert ein gemeinsames Produktminimum statt es zu ersetzen.",
  () => {
    const text = std.governance().qualityMinimum;
    assert(/selben Produkt/.test(text));
    assert(/Team-Vereinbarungen konkretisieren/.test(text));
    assert(/Formale Abnahmen nur/.test(text));
  },
);
for (const [field] of std.fields)
  run(
    "M10-agreed-placeholder:" + field,
    "governance-placeholder",
    "Vereinbart mit explizitem Platzhalter muss abgelehnt oder als offener Punkt ausgewiesen werden.",
    () => {
      const b = base();
      b.v3.flowGovernance[field] = "Noch zu vereinbaren";
      return mustDetect(b);
    },
  );
for (const value of [
  "110% in 10 Tagen",
  "-5% in 10 Tagen",
  "85% in -3 Tagen",
  "85% in 0 Tagen",
  "100% garantiert, unabhängig von Kapazität",
])
  run(
    "M11-sle:" + value,
    "sle",
    "Eine offensichtlich unmögliche SLE darf nicht unbeanstandet als vereinbart gelten.",
    () => {
      const b = base();
      b.v3.flowGovernance.sle = value;
      return mustDetect(b);
    },
  );
for (const value of [
  "0 Features",
  "-2 Features",
  "unbegrenzt",
  "Keine WIP-Begrenzung",
])
  run(
    "M12-wip:" + value,
    "wip",
    "Eine offensichtlich fehlende oder nicht positive WIP-Begrenzung muss erkennbar offen sein.",
    () => {
      const b = base();
      b.v3.flowGovernance.wip = value;
      return mustDetect(b);
    },
  );
for (const [start, end] of [
  ["Eintritt in Done", "Eintritt in Implementing"],
  ["Eintritt in Implementing", "Eintritt in Implementing"],
])
  run(
    "M13-measurement:" + start + ":" + end,
    "measurement",
    "Identische Ereignisse oder umgekehrte Grenzen dürfen keine belastbare Durchlaufzeit behaupten.",
    () => {
      const b = base();
      b.v3.flowGovernance.measurementStart = start;
      b.v3.flowGovernance.measurementEnd = end;
      return mustDetect(b);
    },
  );
for (const placeholder of ["", "Noch zu klären", "Noch zu vereinbaren"])
  run(
    "M14-criterion-placeholder:" + placeholder,
    "positive-detection",
    "Fehlende Kriterienrolle wird unabhängig vom sichtbaren Platzhalter erkannt.",
    () => {
      const b = base();
      b.v3.flowCriteria.profiles.alpha.commonDoD[0].owner = placeholder;
      return mustDetect(b);
    },
  );
for (const [field, type] of [
  ["commonDoR", "DoD"],
  ["commonDoD", "DoR"],
])
  run(
    "M15-wrong-catalogue-kind:" + field,
    "criterion",
    "DoD und DoR dürfen nicht im jeweils anderen Katalog verschwinden.",
    () => {
      const b = base();
      b.v3.flowCriteria.profiles.alpha[field][0].type = type;
      return mustDetect(b);
    },
  );
for (const field of ["commonDoR", "commonDoD"])
  run(
    "M16-empty-quality-catalogue:" + field,
    "criterion",
    "Gelöschter Teamkatalog bleibt gelöscht, aber der fachliche Mangel muss sichtbar sein.",
    () => {
      const b = base();
      b.v3.flowCriteria.profiles.alpha[field] = [];
      const result = mustDetect(b);
      assert.equal(b.v3.flowCriteria.profiles.alpha[field].length, 0);
      return result;
    },
  );
for (const [id, mutate] of [
  [
    "unknown-activity-phase",
    (b) => {
      b.v3.activities[0].phase = "Freigabekomitee";
    },
  ],
  [
    "unknown-accompanying-phase",
    (b) => {
      b.v3.activities[0].additionalPhases = ["Unbekannt"];
    },
  ],
  [
    "unknown-matrix-activity",
    (b) => {
      b.v3.configs["alpha::flow"].entries["Nicht vorhandene Tätigkeit"] = plain(
        Object.values(b.v3.configs["alpha::flow"].entries)[0],
      );
    },
  ],
  [
    "orphan-team-flow",
    (b) => {
      b.v3.configs["ghost::flow"] = plain(b.v3.configs["alpha::flow"]);
    },
  ],
  [
    "unknown-matrix-status",
    (b) => {
      b.v3.configs["alpha::flow"].status = "Methodisch zertifiziert";
    },
  ],
  [
    "unknown-product-membership",
    (b) => {
      b.v2.teams[0].productIds.push("ghost");
    },
  ],
  [
    "duplicate-product-owner",
    (b) => {
      b.v2.teams[1].productIds.push("pa");
    },
  ],
  [
    "duplicate-activity-id",
    (b) => {
      b.v3.activities[1].id = b.v3.activities[0].id;
    },
  ],
  [
    "unsafe-product-url",
    (b) => {
      b.v3.products[0].wikiUrl = "javascript:alert(1)";
    },
  ],
])
  run(
    "M17-reference-integrity:" + id,
    "references",
    "Strukturell widersprüchliche Referenzen werden abgelehnt oder im fachlichen Review angezeigt.",
    () => {
      const b = base();
      mutate(b);
      return mustDetect(b);
    },
  );
run(
  "M18-draft-is-not-rejected",
  "positive",
  "Unvollständige Governance bleibt als Entwurf speicherbar und als Vorschlag sichtbar.",
  () => {
    const b = base();
    b.v3.flowGovernance = std.governance();
    const r = detection(b);
    assert.equal(r.rejected, null);
    assert(
      r.findings.some((f) => /noch nicht gemeinsam vereinbart/.test(f.message)),
    );
    assert.equal(b.v3.flowGovernance.status, "Vorschlag");
  },
);
run(
  "M19-reading-never-confirms",
  "non-interference",
  "Wiederholte Prüfung verändert weder Status noch Kriterien, Zeitstempel oder Bestätigung.",
  () => {
    const b = base(),
      before = JSON.stringify(b);
    for (let i = 0; i < 10; i++) detection(b);
    assert.equal(JSON.stringify(b), before);
    assert.equal(b.v3.configs["alpha::flow"].status, "Entwurf");
    assert(!b.v3.agreementConfirmations?.alpha);
  },
);
fs.writeFileSync(
  path.join(out, "checks.json"),
  JSON.stringify(checks, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(out, "manifest.json"),
  JSON.stringify(
    {
      sourceSha256: crypto.createHash("sha256").update(html).digest("hex"),
      testSha256: crypto
        .createHash("sha256")
        .update(fs.readFileSync(__filename))
        .digest("hex"),
      checks: checks.length,
      passed: checks.filter((c) => c.ok).length,
      failed: checks.filter((c) => !c.ok).length,
      byArea: Object.fromEntries(
        [...new Set(checks.map((c) => c.area))].map((area) => [
          area,
          {
            passed: checks.filter((c) => c.area === area && c.ok).length,
            failed: checks.filter((c) => c.area === area && !c.ok).length,
          },
        ]),
      ),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({
    checks: checks.length,
    passed: checks.filter((c) => c.ok).length,
    failed: checks.filter((c) => !c.ok).length,
  }),
);
if (checks.some((c) => !c.ok)) process.exitCode = 1;
