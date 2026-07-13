import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const sessionCookies = [
    "next-auth.session-token",
    "authjs.session-token",
    "__Secure-next-auth.session-token",
    "__Secure-authjs.session-token",
  ];

  for (const name of sessionCookies) {
    cookieStore.delete(name);
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
