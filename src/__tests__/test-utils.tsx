import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { AuthProvider } from '@/features/auth/AuthProvider';

// Minimal mock auth context values – can be overridden per test if needed
const mockAuth = {
  user: { id: 'test-user', name: 'টেস্ট ইউজার', role: 'MANAGER', shopId: 'test-shop' } as any,
  shopId: 'test-shop',
  branchId: 'test-branch',
  isAuthenticated: true,
  login: async () => {},
  logout: async () => {},
};

const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AuthProvider>{children}</AuthProvider>
);

export const render = (ui: React.ReactElement, options = {}) =>
  rtlRender(<Wrapper>{ui}</Wrapper>, options);

export * from '@testing-library/react';
