/** Composition root. The public aliases preserve existing integration/test contracts.
 * Feature modules receive the application explicitly; they do not find each other
 * through browser globals. Storage isolation is implemented without native patches.
 */
export function initialize(browser, namespace) {
  const application = Object.create(null);
  const namespaceStorage = (storage) => ({
    getItem: (key) => storage.getItem(namespace + key),
    setItem: (key, value) => storage.setItem(namespace + key, value),
    removeItem: (key) => storage.removeItem(namespace + key),
  });
  // Access can itself fail in restrictive browser modes. Defer it until the caller
  // reads/writes, so existing UI error handling remains responsible for the failure.
  const deferredStorage = (name) => ({
    getItem: (key) => namespaceStorage(browser[name]).getItem(key),
    setItem: (key, value) =>
      namespaceStorage(browser[name]).setItem(key, value),
    removeItem: (key) => namespaceStorage(browser[name]).removeItem(key),
  });
  application.localStorage = deferredStorage("localStorage");
  application.sessionStorage = deferredStorage("sessionStorage");
  application.addEventListener = (type, listener, options) => {
    if (type !== "storage")
      return browser.addEventListener(type, listener, options);
    return browser.addEventListener(
      "storage",
      (event) => {
        if (event.key !== null && !event.key.startsWith(namespace)) return;
        const translated = new browser.StorageEvent("storage", {
          key: event.key === null ? null : event.key.slice(namespace.length),
          oldValue: event.oldValue,
          newValue: event.newValue,
          url: event.url,
          storageArea: event.storageArea,
        });
        if (typeof listener === "function") listener.call(browser, translated);
        else listener.handleEvent(translated);
      },
      options,
    );
  };
  browser.UTGApplication = application;
  const publicNames = [
    "UTGAgreement",
    "UTGDefaults",
    "UTGDesignCriteria",
    "UTGDialogs",
    "UTGEdits",
    "UTGFeedback",
    "UTGFiles",
    "UTGFlow",
    "UTGFlow7",
    "UTGFlowCriteria",
    "UTGFlowCriteriaUI",
    "UTGFlowStandard",
    "UTGFlowStandardAdoption",
    "UTGFlowStandardUI",
    "UTGFlowUX",
    "UTGInterfaceReview",
    "UTGMatrix",
    "UTGMethodValidation",
    "UTGModels",
    "UTGOpenAssignments",
    "UTGOperatingModelReview",
    "UTGPending",
    "UTGPolicyEditor",
    "UTGReleaseStage",
    "UTGRenderChecks",
    "UTGReviewNavigation",
    "UTGRuleDetails",
    "UTGServiceData",
    "UTGShowPanel",
    "UTGStorage",
    "UTGStorageStatus",
    "UTGVersion",
    "UTGWorkspace",
  ];
  for (const name of publicNames)
    Object.defineProperty(browser, name, {
      configurable: true,
      enumerable: false,
      get: () => application[name],
      set: (value) => {
        application[name] = value;
      },
    });
  return application;
}
