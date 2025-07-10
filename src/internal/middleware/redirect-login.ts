import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "../common/config";
import { sha256 } from "./sha256";

export async function redirectLogin(req: NextRequest): Promise<NextResponse> {
  const { projectId, vaultDomain, devMode, trustedDomains } = await getConfig();

  if (
    !trustedDomains.includes(req.nextUrl.host) &&
    !trustedDomains.some(
      (domain) => req.nextUrl.host.endsWith(`.${domain}`) || req.nextUrl.host.startsWith(`${domain}:`),
    )
  ) {
    throw new Error(
      `Tesseral Project ${projectId} is not configured to be served from ${req.nextUrl.host}. Only the following domains are allowed:\n\n${trustedDomains.join("\n")}\n\nGo to https://console.tesseral.com/settings/vault/domains and add ${req.nextUrl.host} to your list of trusted domains.`,
    );
  }

  if (devMode) {
    const relayedSessionState = crypto.randomUUID();

    const params = new URLSearchParams();
    params.set("relayed-session-state", relayedSessionState);
    params.set(
      "redirect-uri",
      `${req.nextUrl.protocol}//${req.nextUrl.host}/_tesseral_next/dev-mode-callback${req.nextUrl.search}`,
    );
    params.set("return-relayed-session-token-as-query-param", "1");

    const redirectUrl = new URL(`https://${vaultDomain}/login`);
    redirectUrl.search = params.toString();

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set({
      name: `tesseral_${projectId}_relayed_session_state_sha256`,
      value: await sha256(relayedSessionState),
      httpOnly: true,
      path: "/",
    });

    return response;
  }

  return NextResponse.redirect(`https://${vaultDomain}/login?${req.nextUrl.search}`);
}
