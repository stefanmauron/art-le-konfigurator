export function initialize(app, browser = globalThis) {
  // Render after all configuration modules have initialized, including a restored overview tab.
  app.UTGRenderChecks?.();
  document.getElementById("utg-checks")?.setAttribute("role", "status");
}
