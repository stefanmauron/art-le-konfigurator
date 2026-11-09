// Catch extraction/integration mistakes while preserving existing application behaviour.
const browserGlobals = [
  "window",
  "document",
  "console",
  "globalThis",
  "structuredClone",
  "URL",
  "Blob",
  "HTMLDialogElement",
  "CustomEvent",
  "Event",
  "MutationObserver",
  "ResizeObserver",
  "requestAnimationFrame",
  "queueMicrotask",
  "location",
  "sessionStorage",
  "localStorage",
  "alert",
  "confirm",
  "matchMedia",
  "setTimeout",
  "clearTimeout",
  "performance",
  "Storage",
];
export default [
  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: Object.fromEntries(
        browserGlobals.map((name) => [name, "readonly"]),
      ),
    },
    rules: {
      "no-undef": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
    },
  },
];
