import { useAuth } from '../context/AuthContext';

/**
 * Returns the current user's profile ID, or null if not yet loaded.
 * Hooks that use this should set `enabled: !!profileId` on their queries.
 */
export function useProfileId(): string | null {
  const { profileId } = useAuth();
  return profileId;
}
