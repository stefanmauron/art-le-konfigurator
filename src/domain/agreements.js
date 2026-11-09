/** Pure agreement rules. Models are injected because they initialize later. */
export function createAgreementService(models) {
  const productIds = (team, data) =>
    Array.isArray(team?.productIds)
      ? team.productIds
      : (data.products || [])
          .filter((p) =>
            Object.hasOwn(data.configs || {}, team?.id + "::" + p.id),
          )
          .map((p) => p.id);
  const stable = (value) =>
    JSON.stringify(
      (function sort(v) {
        if (Array.isArray(v)) return v.map(sort);
        if (v && typeof v === "object")
          return Object.fromEntries(
            Object.keys(v)
              .sort()
              .map((k) => [k, sort(v[k])]),
          );
        return v;
      })(value),
    );
  function signature(data, teamId, teams) {
    const team = teams.find((t) => t.id === teamId),
      entries = data.configs?.[teamId + "::flow"]?.entries || {};
    const refs = new Set(
      Object.values(entries)
        .map((e) => e.service)
        .filter(Boolean),
    );
    return stable({
      products: productIds(team, data),
      entries,
      contract: data.teamContracts?.[teamId] || {},
      design: (data.teamDesignCriteria?.[teamId] || []).map(
        ({ assessedAt, ...c }) => c,
      ),
      services: (data.services || []).filter(
        (s) => refs.has(s.id) || refs.has(s.name),
      ),
      activities: data.activities || [],
      policies: data.policies || [],
      flow: data.flowCriteria
        ? data.flowCriteria.profiles?.[teamId] || {
            rules: data.flowCriteria.rules,
            phaseGates: data.flowCriteria.phaseGates,
            commonDoR: data.flowCriteria.commonDoR,
            commonDoD: data.flowCriteria.commonDoD,
          }
        : {},
      ...(data.flowGovernance ? { flowGovernance: data.flowGovernance } : {}),
    });
  }
  // Track only categories actually used by this team's effective assignments.
  function categorySignature(data, teamId) {
    const entries = Object.values(
        data.configs?.[teamId + "::flow"]?.entries || {},
      ),
      providers = new Set(),
      embeddings = new Set();
    for (const entry of entries) {
      const service = (data.services || []).find(
        (s) => s.id === entry.service || s.name === entry.service,
      );
      const provider =
        entry.orgSource === "service" ? service?.provider : entry.org;
      const embedding = entry.embedding || service?.embedding;
      if (
        provider &&
        !["Noch zu klären", "Nicht erforderlich"].includes(provider)
      )
        providers.add(provider);
      if (
        embedding &&
        !["Noch zu klären", "Nicht erforderlich"].includes(embedding)
      )
        embeddings.add(embedding);
    }
    return stable({
      providers: [...providers].sort().map((name) => ({
        name,
        kind:
          models()?.providerKind?.(data, name) ||
          data.providerRecords?.find((r) => r.name === name)?.kind ||
          null,
      })),
      embeddings: [...embeddings].sort().map((name) => ({
        name,
        kind:
          models()?.embeddingKind?.(data, name) ||
          data.embeddingKinds?.[name] ||
          null,
      })),
    });
  }
  // Preserve the original confirmation and time. Older records gain a one-time category baseline.
  function initializeCategories(data) {
    for (const [teamId, record] of Object.entries(
      data.agreementConfirmations || {},
    ))
      if (record && record.categorySignature === undefined)
        record.categorySignature = categorySignature(data, teamId);
    return data;
  }
  function agreementState(data, teamId, teams) {
    const status = data.configs?.[teamId + "::flow"]?.status || "Entwurf",
      record = data.agreementConfirmations?.[teamId];
    return {
      status,
      confirmedAt: record?.confirmedAt || null,
      changed:
        !!record &&
        record.status === status &&
        (record.signature !== signature(data, teamId, teams) ||
          record.categorySignature !== categorySignature(data, teamId)),
      unconfirmed:
        status !== "Entwurf" && (!record || record.status !== status),
    };
  }
  function confirmAgreement(data, teamId, status, teams) {
    if (!["Entwurf", "Abgestimmt", "Freigegeben"].includes(status))
      throw Error("Ungültiger Vereinbarungsstatus.");
    const next = structuredClone(data),
      flow = next.configs?.[teamId + "::flow"];
    if (!flow) throw Error("Bitte zuerst den Team-Flow zuordnen.");
    flow.status = status;
    next.agreementConfirmations ??= {};
    if (status === "Entwurf") delete next.agreementConfirmations[teamId];
    else
      next.agreementConfirmations[teamId] = {
        status,
        confirmedAt: new Date().toISOString(),
        signature: signature(next, teamId, teams),
        categorySignature: categorySignature(next, teamId),
      };
    return next;
  }
  return Object.freeze({
    signature,
    categorySignature,
    initializeCategories,
    state: agreementState,
    confirm: confirmAgreement,
  });
}
