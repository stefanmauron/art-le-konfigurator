import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import vm from "node:vm";
import { build, transform } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const release = JSON.parse(
  await fs.readFile(path.join(root, "release.json"), "utf8"),
);
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "src/manifest.json"), "utf8"),
);
const interpolate = (text) =>
  text.replace(/\{\{release\.(\w+)\}\}/g, (_, field) => {
    if (!(field in release)) throw Error("Unknown release field: " + field);
    return release[field];
  });
async function compile(source, invocation) {
  const result = await build({
    absWorkingDir: root,
    stdin: {
      contents: `import {initialize} from ${JSON.stringify("./" + source)}; ${invocation}`,
      resolveDir: root,
      sourcefile: "bundle-entry.js",
    },
    plugins: [
      {
        name: "release-metadata",
        setup(plugin) {
          plugin.onLoad({ filter: /\.js$/ }, async (args) => ({
            contents: interpolate(await fs.readFile(args.path, "utf8")),
            loader: "js",
          }));
        },
      },
    ],
    bundle: true,
    write: false,
    format: "iife",
    target: "es2022",
    legalComments: "none",
    charset: "utf8",
    minify: false,
  });
  const code = result.outputFiles[0].text;
  new vm.Script(code);
  if (/<\/script/i.test(code))
    throw Error("Unsafe inline script terminator: " + source);
  return code;
}
let html = interpolate(
  await fs.readFile(path.join(root, "src/shell.html"), "utf8"),
);
html = html.replace(
  "<!-- bundle:bootstrap -->",
  '<script id="utg-application-bootstrap">\n' +
    (await compile(
      "src/application/bootstrap.js",
      `initialize(window, ${JSON.stringify(release.storageNamespace)});`,
    )) +
    "</script>",
);
for (const entry of manifest) {
  const content =
    entry.kind === "script"
      ? await compile(
          entry.source,
          "initialize(window.UTGApplication || window, window);",
        )
      : (
          await transform(
            await fs.readFile(path.join(root, entry.source), "utf8"),
            { loader: "css", minifyWhitespace: true },
          )
        ).code;
  html = html.replace(
    `<!-- bundle:${entry.key} -->`,
    () => `<${entry.kind}${entry.attributes}>\n${content}\n</${entry.kind}>`,
  );
}
if (/<!-- bundle:|\{\{release\./.test(html))
  throw Error("Unresolved build placeholder");
if (/<script\b[^>]*\bsrc\s*=|<link\b[^>]*rel=["']stylesheet/i.test(html))
  throw Error("External runtime asset");
await fs.mkdir(path.join(root, "dist"), { recursive: true });
const filename = `UTG-LE_Operating_Model_v${release.version}_${release.stage}.html`;
await fs.writeFile(path.join(root, "dist", filename), html);
const sha256 = crypto.createHash("sha256").update(html).digest("hex");
await fs.writeFile(
  path.join(root, "dist/build-manifest.json"),
  JSON.stringify(
    {
      filename,
      sha256,
      release,
      scripts: manifest.filter((x) => x.kind === "script").length + 1,
      styles: manifest.filter((x) => x.kind === "style").length,
    },
    null,
    2,
  ) + "\n",
);
console.log(`${filename}: ${Buffer.byteLength(html)} bytes, SHA-256 ${sha256}`);
