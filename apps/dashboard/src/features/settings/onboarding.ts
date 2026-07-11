const KEY = "settings:onboarded";

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function isShopOnboarded(): boolean {
  const ls = safeStorage();
  if (!ls) return false;
  try {
    return ls.getItem(KEY) === "true";
  } catch {
    return false;
  }
}

export function markShopOnboarded() {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(KEY, "true");
  } catch {
    /* noop */
  }
}

export function resetShopOnboarded() {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.removeItem(KEY);
  } catch {
    /* noop */
  }
}
