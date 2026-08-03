import { createContext } from 'react';
import type { User } from '@/types';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);
