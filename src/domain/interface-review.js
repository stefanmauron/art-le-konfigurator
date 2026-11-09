/** Pure interface completeness rules; no DOM or persistence. */
export function createInterfaceReview() {
  const valid = (value) =>
    !!String(value ?? "").trim() &&
    !/^(Noch zu klären|Noch zu vereinbaren|Nicht definiert)$/i.test(
      String(value).trim(),
    );
  function entries(data, team) {
    const configs = data.configs || {};
    return (
      configs[team.id + "::flow"]?.entries ||
      Object.entries(configs).find(
        ([key]) => key.startsWith(team.id + "::") && !key.endsWith("::flow"),
      )?.[1]?.entries ||
      {}
    );
  }
  function evaluate(service, entry) {
    return {
      provider: valid(service?.provider),
      embedding: valid(entry?.embedding || service?.embedding),
      interaction: valid(entry?.interaction || service?.interaction),
    };
  }
  return { valid, entries, evaluate };
}
