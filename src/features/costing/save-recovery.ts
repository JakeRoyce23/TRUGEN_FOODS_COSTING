import type { CostingInput } from "./costing-repository";

type Recovery = { input: CostingInput; recordId: string; requestId: string; version: number | null };
// Only a failed in-flight save is retained, in this tab's memory, for the same
// owner/route. No browser-storage draft persistence or cross-account exposure.
const failedSaves = new Map<string, Recovery>();
const key = (owner: string, route: string) => `${owner}:${route}`;
export function rememberFailedSave(owner: string, route: string, recovery: Recovery) {
  failedSaves.set(key(owner, route), recovery);
}
export function readFailedSave(owner: string | undefined, route: string) {
  return owner ? failedSaves.get(key(owner, route)) : undefined;
}
export function clearFailedSave(owner: string, route: string) { failedSaves.delete(key(owner, route)); }
export function clearSaveRecovery() { failedSaves.clear(); }
