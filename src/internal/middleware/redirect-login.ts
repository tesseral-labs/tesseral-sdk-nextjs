import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "../common/config";
import { sha256 } from "./sha256";

export async function redirectLogin(req: NextRequest): Promise<NextResponse> {
  const { projectId, vaultDomain, devMode, trustedDomains } = await getConfig();

  if (!trustedDomains.includes(req.nextUrl.origin.replace(/^https?:\/\//, ""))) {
    throw new Error(`Tesseral running on untrusted domain: ${req.nextUrl.origin}`);
  }

  if (devMode) {
    const relayedSessionState = crypto.randomUUID();

    const params = new URLSearchParams();
    params.set("relayed-session-state", relayedSessionState);
    params.set("redirect-uri", `${req.nextUrl.protocol}//${req.nextUrl.host}/_tesseral_next/dev-mode-callback`);
    params.set("return-relayed-session-token-as-query-param", "1");

    const redirectUrl = new URL(`https://${vaultDomain}/login`);
    redirectUrl.search = params.toString();

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set({
      name: `tesseral_${projectId}_relayed_session_state_sha256`,
      value: await sha256(relayedSessionState),
      httpOnly: true,
      path: "/",
      secure: req.nextUrl.protocol === "https:",
    });

    return response;
  }

  return NextResponse.redirect(`https://${vaultDomain}/login`);
}
