export function initialize(app, browser = globalThis) {
  app.UTGFlow = Object.freeze({
    states: Object.freeze([
      "Funnel",
      "Analyzing",
      "Backlog",
      "Implementing",
      "Validating",
      "Deploying & Releasing",
      "Done",
    ]),
  });
}
