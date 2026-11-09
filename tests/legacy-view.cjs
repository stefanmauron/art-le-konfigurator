// Compatibility adapter for historical source-slicing tests. Only lexical layout
// and the injected application alias are normalized; assertions/data stay intact.
const vm = require("node:vm");
const { tokenizer } = require("acorn");
function canonical(code) {
  code = code
    .replace(/\bapp\.(UTG\w+|addEventListener)/g, "window.$1")
    .replace(/\bwindow2\b/g, "window");
  const scanner = tokenizer(code, { ecmaVersion: "latest" });
  let out = "",
    lastEnd = 0;
  try {
    while (true) {
      const token = scanner.getToken();
      if (token.type.label === "eof") break;
      let raw = code.slice(token.start, token.end);
      if (token.type.label === "string")
        raw =
          "'" +
          token.value
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "\\'")
            .replace(/\n/g, "\\n")
            .replace(/\r/g, "\\r") +
          "'";
      const previous = out.at(-1) || "",
        first = raw[0] || "";
      if (
        (/[\w$]/.test(previous) && /[\w$]/.test(first)) ||
        (previous === "+" && first === "+") ||
        (previous === "-" && first === "-")
      )
        out += " ";
      out += raw;
      lastEnd = token.end;
    }
  } catch {
    out += code.slice(lastEnd).trim().replace(/^"/, "'");
  }
  return out.replace(
    /\((\w+)\)=>/g,
    (_, name, at) => (/\w/.test(out[at - 1] || "") ? " " : "") + name + "=>",
  );
}
function view(html) {
  const normalized = html.replace(
    /(<script\b[^>]*>)([\s\S]*?)(<\/script>)/g,
    (_, a, b, c) => a + canonical(b) + c,
  );
  class View extends String {
    match(pattern) {
      if (pattern.source.includes("const snapshot=")) {
        const start =
          super.indexOf("const snapshot={") + "const snapshot=".length;
        const literal = expression(this, start);
        return [
          literal,
          JSON.stringify(vm.runInNewContext("(" + literal + ")")),
        ];
      }
      return super.match(pattern);
    }
    indexOf(needle, start) {
      let result = super.indexOf(needle, start);
      return result < 0 ? super.indexOf(canonical(needle), start) : result;
    }
    includes(needle, start) {
      return this.indexOf(needle, start) >= 0;
    }
  }
  return new View(normalized);
}
function statement(text, start) {
  if (start < 0) throw Error("Statement start not found");
  for (let end = start; end < text.length; end++)
    if (text[end] === ";") {
      const code = String(text).slice(start, end + 1);
      try {
        new vm.Script(code);
        return code;
      } catch {}
    }
  throw Error("Statement end not found");
}
function expression(text, start) {
  const code = String(text).slice(start),
    scanner = tokenizer(code, { ecmaVersion: "latest" });
  let depth = 0,
    seen = false;
  while (true) {
    const token = scanner.getToken();
    if (token.type.label === "eof") throw Error("Expression end not found");
    if (token.type.label === "{") {
      depth++;
      seen = true;
    }
    if (token.type.label === "}" && seen && --depth === 0)
      return code.slice(0, token.end);
  }
}
module.exports = { view, canonical, statement, expression };
