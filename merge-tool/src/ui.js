import { analyze, validate, stable } from "./merge.js";
const $ = (id) => document.getElementById(id);
let files = [null, null],
  choices = {},
  result = null,
  revision = [0, 0];
const el = (tag, text) => {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  return n;
};
function download(name, value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2) + "\n"], {
      type: "application/json",
    }),
  );
  const a = el("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function hash(text) {
  if (!globalThis.crypto?.subtle) return null;
  const value = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(value)]
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("");
}
for (const [i, id] of ["file-a", "file-b"].entries())
  $(id).addEventListener("change", async (e) => {
    const token = ++revision[i];
    files[i] = null;
    choices = {};
    result = null;
    render();
    const file = e.target.files[0];
    if (!file) {
      $("state-" + i).textContent = "Noch keine Datei ausgewählt.";
      return;
    }
    $("state-" + i).textContent = "Datei wird geprüft …";
    try {
      if (file.size > 30 * 1024 * 1024)
        throw Error("Datei ist grösser als 30 MB.");
      const raw = await file.text(),
        bundle = JSON.parse(raw);
      validate(bundle);
      const sha256 = await hash(raw);
      if (token !== revision[i]) return;
      files[i] = { name: file.name, raw, bundle, sha256 };
      $("state-" + i).textContent =
        file.name +
        " · " +
        bundle.v2.teams.length +
        " Teams · " +
        bundle.v3.products.length +
        " Produkte · v" +
        bundle.appVersion +
        " " +
        bundle.releaseStage;
      $("error").hidden = true;
      run();
    } catch (err) {
      if (token !== revision[i]) return;
      $("state-" + i).textContent = "Datei abgelehnt: " + err.message;
      showError(err.message);
      render();
    }
  });
function showError(message) {
  $("error").hidden = false;
  $("error").textContent = message;
}
function run() {
  result = null;
  if (files.every(Boolean))
    try {
      result = analyze(files[0].bundle, files[1].bundle, choices);
      $("error").hidden = true;
    } catch (err) {
      showError(err.message);
    }
  render();
}
function differences(a, b, path = "") {
  if (stable(a) === stable(b)) return [];
  if (
    a &&
    b &&
    typeof a === "object" &&
    typeof b === "object" &&
    !Array.isArray(a) &&
    !Array.isArray(b)
  )
    return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) =>
      differences(a[k], b[k], path ? path + "." + k : k),
    );
  return [{ path: path || "Wert", a, b }];
}
function detail(label, value) {
  const d = el("details"),
    s = el("summary", label);
  d.append(s, el("pre", JSON.stringify(value, null, 2)));
  return d;
}
function render() {
  $("download").disabled = !result?.ready;
  $("report").disabled = !result;
  $("conflicts").replaceChildren();
  $("warnings").replaceChildren();
  $("preview").replaceChildren();
  $("summary").textContent = !result
    ? "Zwei vollständige Exporte auswählen."
    : result.ready
      ? "Bereit: " +
        result.bundle.v2.teams.length +
        " Teams und " +
        result.bundle.v3.products.length +
        " Produkte."
      : result.unresolved +
        " Entscheidungen offen" +
        (result.errors.length ? " · Ergebnis noch nicht importierbar." : ".");
  if (!result) return;
  for (const message of [...result.warnings, ...result.errors])
    $("warnings").append(el("p", message));
  for (const c of result.conflicts) {
    const card = el("article");
    card.className = "conflict" + (c.resolved ? " resolved" : "");
    card.append(
      el("h3", c.label),
      el(
        "p",
        c.kind === "name"
          ? "Beide Objekte bleiben getrennt. Für den Import in RC3 braucht das Objekt aus B einen eindeutigen Namen."
          : c.kind === "teams"
            ? "Die Auswahl umfasst das gesamte Team mit Leistungsmatrix, Kriterien und Vereinbarungen."
            : "Die gewählte Fassung gilt auch für bestehende Verwendungen dieses Inhalts.",
      ),
    );
    const label = el(
      "label",
      c.kind === "name" ? "Neuer Name für B" : "Übernehmen",
    );
    let control;
    if (c.kind === "name") {
      control = el("input");
      control.type = "text";
      control.value = c.choice?.name || "";
      control.placeholder = c.b.name + " (Laptop 2)";
      control.addEventListener("change", () => {
        choices[c.key] = { name: control.value };
        run();
      });
    } else {
      control = el("select");
      for (const [v, t] of [
        ["", "Bitte auswählen"],
        ["A", "Stand A behalten"],
        ["B", "Stand B übernehmen"],
        ...(c.options.includes("both")
          ? [["both", "Beide behalten (B erhält neue ID)"]]
          : []),
      ]) {
        const o = el("option", t);
        o.value = v;
        control.append(o);
      }
      if (c.kind === "ownership") {
        control.replaceChildren();
        for (const [v, t] of [
          ["", "Bitte auswählen"],
          ...c.owners.map((o) => [o.id, "Verantwortlich: " + o.name]),
          ["duplicate", "Getrennte Produktkopien je Team erzeugen"],
        ]) {
          const o = el("option", t);
          o.value = v;
          control.append(o);
        }
      }
      control.value = c.choice?.take || "";
      control.addEventListener("change", () => {
        choices[c.key] = { take: control.value };
        run();
      });
    }
    control.setAttribute(
      "aria-label",
      c.kind === "name" ? "Neuer Name: " + c.label : "Entscheidung: " + c.label,
    );
    control.dataset.key = c.key;
    label.append(control);
    card.append(label);
    const diffs = differences(c.a, c.b),
      table = el("table"),
      thead = el("thead"),
      hr = el("tr");
    for (const t of ["Unterschied", "Datei A", "Datei B"])
      hr.append(el("th", t));
    thead.append(hr);
    table.append(thead);
    const body = el("tbody");
    for (const d of diffs) {
      const row = el("tr");
      for (const v of [
        d.path,
        d.a === undefined ? "Nicht vorhanden" : JSON.stringify(d.a),
        d.b === undefined ? "Nicht vorhanden" : JSON.stringify(d.b),
      ])
        row.append(el("td", v));
      body.append(row);
    }
    table.append(body);
    const scroll = el("div");
    scroll.className = "table-scroll";
    scroll.append(table);
    card.append(scroll);
    for (const [label, affected] of [
      ["Betroffene Verwendungen in A", c.affectedA],
      ["Betroffene Verwendungen in B", c.affectedB],
    ])
      if (affected?.length) card.append(detail(label, affected));
    card.append(
      detail("Vollständiger Stand A", c.a),
      detail("Vollständiger Stand B", c.b),
    );
    $("conflicts").append(card);
  }
  for (const action of [
    "Hinzugefügt",
    "Erhalten",
    "Identisch",
    "Konflikt entschieden",
    "Beide behalten",
    "Umbenannt",
    "Tätigkeitsverweis angepasst",
  ]) {
    const list = result.changes.filter((c) => c.action === action);
    if (list.length)
      $("preview").append(detail(action + " · " + list.length, list));
  }
  $("preview").append(detail("Ergebnis als JSON prüfen", result.bundle));
}
function checked() {
  if (!files.every(Boolean)) return false;
  run();
  return result?.ready;
}
$("download").addEventListener("click", () => {
  if (checked())
    download("UTG-LE_Konfiguration_zusammengefuehrt.json", result.bundle);
});
$("report").addEventListener("click", () => {
  run();
  if (!result) return;
  download("UTG-LE_Zusammenfuehrungsbericht.json", {
    toolVersion: "1.0.1",
    created: new Date().toISOString(),
    ready: result.ready,
    inputs: files.map((f) => ({
      name: f.name,
      sha256: f.sha256,
      appVersion: f.bundle.appVersion,
      releaseStage: f.bundle.releaseStage,
    })),
    decisions: cloneChoices(),
    changes: result.changes,
    renames: result.renames,
    warnings: result.warnings,
    errors: result.errors,
    unresolved: result.unresolved,
    metadataPolicy:
      "Export-Metadaten und Navigation aus A; fachliche Konflikte nur nach expliziter Entscheidung.",
  });
});
function cloneChoices() {
  return structuredClone(choices);
}
render();
