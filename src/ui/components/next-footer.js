export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    for (const page of document.querySelectorAll(".utg-page")) {
      const next = page.querySelector(":scope > .utg-next");
      if (!next) continue;
      function place() {
        if (page.lastElementChild !== next) page.append(next);
      }
      place();
      new MutationObserver(place).observe(page, { childList: true });
    }
  })();
}
