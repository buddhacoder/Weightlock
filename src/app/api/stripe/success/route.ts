import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const contractId = request.nextUrl.searchParams.get("contractId");

  if (!contractId) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Activation happens via webhook only. This route just redirects the
  // user back to their contract page after Stripe checkout completes.
  return NextResponse.redirect(new URL(`/contracts/${contractId}`, request.url));
}
