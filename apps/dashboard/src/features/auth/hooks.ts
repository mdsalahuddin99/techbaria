import { useAuth } from "./AuthProvider";
import type { UserRole } from "./types";

/** True when the current session has any of the given roles. */
export function useHasRole(...roles: UserRole[]): boolean {
  const { session } = useAuth();
  if (!session) return false;
  return roles.includes(session.user.role);
}
