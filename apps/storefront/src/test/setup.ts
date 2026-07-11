import "@testing-library/jest-dom";
import { vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({
  NextRequest: vi.fn(),
  NextResponse: {
    json: vi.fn(),
    redirect: vi.fn(),
  },
}));

vi.mock("@/features/auth/AuthProvider", () => {
  return {
    useAuth: () => ({
      session: {
        user: {
          id: "user-1",
          email: "test@example.com",
          name: "Test User",
          role: "ADMIN",
          shopId: "shop-1",
        },
        expires: new Date(Date.now() + 3600000).toISOString(),
      },
      status: "authenticated",
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      refresh: vi.fn(),
      signInGoogle: vi.fn(),
    }),
    AuthProvider: ({ children }: any) => children,
  };
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
