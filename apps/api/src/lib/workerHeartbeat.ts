type HeartbeatEntry = {
  lastRunAt: string;
  lastError: string | null;
  runCount: number;
};

const beats = new Map<string, HeartbeatEntry>();

export function recordWorkerRun(name: string, error?: string | null): void {
  const prev = beats.get(name);
  beats.set(name, {
    lastRunAt: new Date().toISOString(),
    lastError: error ?? null,
    runCount: (prev?.runCount ?? 0) + 1
  });
}

export function getWorkerHeartbeats(): Record<
  string,
  HeartbeatEntry & { stale: boolean; ageSec: number }
> {
  const now = Date.now();
  const out: Record<string, HeartbeatEntry & { stale: boolean; ageSec: number }> = {};
  for (const [name, entry] of beats.entries()) {
    const ageSec = Math.floor((now - new Date(entry.lastRunAt).getTime()) / 1000);
    out[name] = {
      ...entry,
      ageSec,
      stale: ageSec > 300
    };
  }
  return out;
}
