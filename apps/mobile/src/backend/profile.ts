import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useBackend } from './BackendProvider';
import { useSession } from './session';
import type { PasswordChange, Profile } from './types';

const profileKey = (userId: string | undefined) => ['profile', userId] as const;

/** The signed-in user's name and bio. */
export function useProfile() {
  const { userData } = useBackend();
  const { data: session } = useSession();
  return useQuery({
    queryKey: profileKey(session?.userId),
    queryFn: () => userData.getProfile(),
    enabled: session?.userId !== undefined,
    staleTime: Infinity,
  });
}

/**
 * Saves Edit profile: the name and bio, which Profile shows straight away, then, when `password`
 * is given, the new password. The profile goes first because saving it again is harmless, so
 * after a failed password change the user can fix the password and simply save again.
 */
export function useSaveProfile() {
  const { auth, userData } = useBackend();
  const queryClient = useQueryClient();
  const { data: session } = useSession();

  return useMutation({
    mutationFn: async ({ profile, password }: { profile: Profile; password?: PasswordChange }) => {
      const saved = await userData.updateProfile(profile);
      queryClient.setQueryData(profileKey(session?.userId), saved);
      if (password) await auth.changePassword(password);
    },
  });
}
