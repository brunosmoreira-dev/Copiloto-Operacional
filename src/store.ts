import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

export type PersistenceState<TRequest, TDecision, TExportAttempt> = {
  requests: TRequest[];
  decisions: TDecision[];
  exportAttempts: TExportAttempt[];
};

export function createJsonStore<TRequest, TDecision, TExportAttempt>(filePath: string) {
  function load(): PersistenceState<TRequest, TDecision, TExportAttempt> {
    if (!existsSync(filePath)) {
      return {
        requests: [],
        decisions: [],
        exportAttempts: []
      };
    }

    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as Partial<PersistenceState<TRequest, TDecision, TExportAttempt>>;

      return {
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
        exportAttempts: Array.isArray(parsed.exportAttempts) ? parsed.exportAttempts : []
      };
    } catch {
      return {
        requests: [],
        decisions: [],
        exportAttempts: []
      };
    }
  }

  function save(state: PersistenceState<TRequest, TDecision, TExportAttempt>) {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8");
  }

  return {
    load,
    save
  };
}
