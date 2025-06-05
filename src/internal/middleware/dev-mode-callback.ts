import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "../common/config";
import { sha256 } from "./sha256";

export async function devModeCallback(req: NextRequest): Promise<NextResponse> {
  const { projectId, vaultDomain } = await getConfig();

  const relayedSessionToken = req.nextUrl.searchParams.get(`__tesseral_${projectId}_relayed_session_token`);
  if (!relayedSessionToken) {
    throw new Error(`No __tesseral_${projectId}_relayed_session_token found`);
  }

  const redirectUrl = req.nextUrl.searchParams.get(`__tesseral_${projectId}_redirect_uri`);
  if (!redirectUrl) {
    throw new Error(`No __tesseral_${projectId}_redirect_uri found`);
  }

  const { refreshToken, accessToken, relayedSessionState } = await exchangeRelayedSessionToken({
    vaultDomain,
    relayedSessionToken,
  });

  const cookieStore = await cookies();
  const relayedSessionStateSha256 = cookieStore.get(`tesseral_${projectId}_relayed_session_state_sha256`);

  if ((await sha256(relayedSessionState)) !== relayedSessionStateSha256?.value) {
    throw new Error("Relayed session state does not match expected value");
  }

  // To better handle localhost development, we only want to use the pathname of the redirect URL.
  const preferredRedirectUrl = new URL(redirectUrl);
  const actualRedirectUrl = new URL(preferredRedirectUrl.pathname, req.nextUrl);

  const response = NextResponse.redirect(actualRedirectUrl);

  response.cookies.set(`tesseral_${projectId}_refresh_token`, refreshToken, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
  response.cookies.set(`tesseral_${projectId}_access_token`, accessToken, {
    httpOnly: false,
    maxAge: 60 * 5, // 5 minutes
    path: "/",
  });

  // Remove relayed session state cookie
  response.cookies.delete(`tesseral_${projectId}_relayed_session_state_sha256`);

  return response;
}

async function exchangeRelayedSessionToken({
  vaultDomain,
  relayedSessionToken,
}: {
  vaultDomain: string;
  relayedSessionToken: string;
}): Promise<{
  refreshToken: string;
  accessToken: string;
  relayedSessionState: string;
}> {
  const response = await fetch(
    `https://${vaultDomain}/api/intermediate/v1/exchange-relayed-session-token-for-session`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        relayedSessionToken: relayedSessionToken!,
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to exchange relayed session token for session: ${response.statusText}`);
  }

  const { refreshToken, accessToken, relayedSessionState } = await response.json();
  return { refreshToken, accessToken, relayedSessionState };
}
