import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/authOptions";

const PROTECTED = [
  "/dashboard",
  "/entry",
  "/history",
  "/digest",
  "/settings",
  "/onboarding",
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  if (!needsAuth) return NextResponse.next();
  if (req.auth?.user?.id) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)",
  ],
};
