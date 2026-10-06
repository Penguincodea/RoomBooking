import type { User } from 'firebase/auth';

export type UserRole = 'guest' | 'manager';

export type UserProfile = {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
};

export type AuthContextValue = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileError: string;
};
