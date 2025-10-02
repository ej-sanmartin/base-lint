export function isFeatureAvailable() {
  return true;
}

export async function restoreCache() {
  return undefined;
}

export async function saveCache() {
  return undefined;
}

export class ReserveCacheError extends Error {}

export class ValidationError extends Error {}
