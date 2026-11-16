// AI-assisted: Codex (OpenAI). Locate visual bridges without filling missing values.
export function missingValueConnections(values: readonly (number | null)[]): [number, number][] {
  const connections: [number, number][] = [];
  let previous = -1;
  values.forEach((value, index) => {
    if (value === null || !Number.isFinite(value)) return;
    if (previous >= 0 && index > previous + 1) connections.push([previous, index]);
    previous = index;
  });
  return connections;
}
