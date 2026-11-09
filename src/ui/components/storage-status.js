export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const header = document.querySelector("body > header"),
      title = header.querySelector("h1"),
      subtitle = header.querySelector(":scope > p"),
      meta = header.querySelector(".app-header-meta"),
      badge = document.querySelector(".app-storage-badge");
    if (!meta || !badge) return;
    // Keep title and subtitle together; version and storage status must not create a gap between them.
    const heading = document.createElement("div");
    heading.className = "app-heading";
    header.insertBefore(heading, title);
    heading.append(title, subtitle);
    header.append(meta);
    badge.setAttribute("role", "status");
    badge.setAttribute("aria-live", "polite");
    meta.append(badge);
  })();
}
