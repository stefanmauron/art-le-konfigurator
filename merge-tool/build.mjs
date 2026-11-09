import fs from "node:fs/promises";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
const root = new URL("./", import.meta.url);
const code = (
  await build({
    absWorkingDir: fileURLToPath(new URL("../", root)),
    entryPoints: [fileURLToPath(new URL("src/ui.js", root))],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2022",
    charset: "utf8",
    legalComments: "none",
  })
).outputFiles[0].text;
new vm.Script(code);
if (/<\/script/i.test(code)) throw Error("Unsicherer Script-Abschluss");
const shell = await fs.readFile(new URL("src/shell.html", root), "utf8");
await fs.writeFile(
  new URL("../dist/UTG-LE_Konfiguration_zusammenfuehren_v1.0.1.html", root),
  shell.replace("/* bundle */", () => code),
);
console.log("Offline-HTML gebaut.");
