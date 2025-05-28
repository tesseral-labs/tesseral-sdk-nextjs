import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "../common/config";
import { devModeCallback } from "./dev-mode-callback";
import { redirectLogin } from "./redirect-login";

export async function authMiddleware(request: NextRequest): Promise<NextResponse> {
  // These paths are specially handled by the middleware.
  switch (request.nextUrl.pathname) {
    case "/_tesseral_next/redirect-login":
      return redirectLogin(request);
    case "/_tesseral_next/dev-mode-callback":
      return devModeCallback(request);
  }

  // If the request has an Authorization header, then presume this is some sort
  // of API call. Do nothing.
  if (request.headers.has("authorization")) {
    return NextResponse.next();
  }

  const { projectId } = await getConfig();
  const accessToken = request.cookies.get(`tesseral_${projectId}_access_token`);
  const refreshToken = request.cookies.get(`tesseral_${projectId}_refresh_token`);

  // If the access token is likely valid, then do nothing.
  if (accessToken && accessTokenLikelyValid(accessToken.value)) {
    return NextResponse.next();
  }

  // If there is no refresh token, then there is no optimistic work we can do
  // here. This is an unauthenticated request.
  if (!refreshToken) {
    return NextResponse.next();
  }

  // Optimistically exchange refresh token for access token.

  let exchangedAccessToken: string;
  try {
    exchangedAccessToken = await exchangeRefreshToken(refreshToken.value);
  } catch (e) {
    if (e instanceof InvalidRefreshTokenError) {
      // The refresh token is invalid. This is an unauthenticated request.
      return NextResponse.next();
    }

    throw e;
  }

  // We now have a new, optimistically-acquired access token. Attach it to the
  // upstream request and the downstream response.

  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.append("Cookie", `tesseral_${projectId}_access_token=${exchangedAccessToken}`);

  const response = NextResponse.next({
    headers: forwardedHeaders,
  });

  response.cookies.set(`tesseral_${projectId}_access_token`, exchangedAccessToken, {
    httpOnly: false,
  });

  return response;
}

// Does not do actual authentication. Naively parses a JWT and checks that exp
// is in the future.
//
// This is not a replacement for actual authentication. It is only appropriate
// to use in the context of a Next.js middleware, which can only carry out
// optimistic work.
function accessTokenLikelyValid(accessToken: string): boolean {
  if (!accessToken) {
    return false;
  }

  const claims = parseAccessToken(accessToken);
  return !!claims?.exp && claims.exp > Date.now() / 1000;
}

function parseAccessToken(accessToken: string): { exp?: number } {
  const claimsPart = accessToken.split(".")[1];
  const decodedClaims = new TextDecoder().decode(Uint8Array.from(atob(claimsPart), (c) => c.charCodeAt(0)));
  return JSON.parse(decodedClaims);
}

class InvalidRefreshTokenError extends Error {}

async function exchangeRefreshToken(refreshToken: string): Promise<string> {
  const { vaultDomain } = await getConfig();
  const response = await fetch(`https://${vaultDomain}/api/frontend/v1/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (response.status === 401) {
    throw new InvalidRefreshTokenError();
  }

  if (!response.ok) {
    throw new Error(`Unexpected non-200 response exchanging refresh token, status: ${response.status}`);
  }

  const { accessToken } = await response.json();
  return accessToken;
}
