import React, { createContext, useContext, ReactNode } from 'react';

// -----------------------
// Mock Auth Context
// -----------------------
export const AuthContext = createContext<any>(null);

// A full mock session object sufficient for all hooks/tests
export const mockAuth = {
  // Basic identifiers used throughout the app
  shopId: 'shop-1',
  branchId: 'branch-A', // default – matches most seed data
  userId: 'user-1',
  // Simulated session shape expected by real AuthProvider
  session: {
    user: {
      id: 'user-1',
      email: 'user1@example.com',
      name: 'Test User',
      role: 'ADMIN',
      shopId: 'shop-1',
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  },
  status: 'authenticated',
} as any;

// ------------------------------------------------
// Mock AuthProvider – simply provides the mock context
// ------------------------------------------------
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <AuthContext.Provider value={mockAuth}>{children}</AuthContext.Provider>;
};

// ------------------------------------------------
// useAuth – returns the mock auth object directly
// ------------------------------------------------
export const useAuth = () => {
  // Returning the mock object ensures all hooks receive a valid session
  return mockAuth as any;
};
