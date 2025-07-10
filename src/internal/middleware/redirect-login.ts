import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "../common/config";
import { sha256 } from "./sha256";

export async function redirectLogin(req: NextRequest): Promise<NextResponse> {
  const { projectId, vaultDomain, devMode, trustedDomains } = await getConfig();
  // Support the `NEXT_PUBLIC_TESSERAL_REDIRECT_BASE_URL` environment variable to allow overriding the redirect base URL.
  // This is useful for non-Vercel deployment environments where Next.js may not parse the `Host` correctly.
  const tesseralRedirectBaseUrl =
    process.env.NEXT_PUBLIC_TESSERAL_REDIRECT_BASE_URL &&
    process.env.NEXT_PUBLIC_TESSERAL_REDIRECT_BASE_URL.trim() !== ""
      ? process.env.NEXT_PUBLIC_TESSERAL_REDIRECT_BASE_URL
      : req.nextUrl.origin;
  // Build a URL for the redirect that includes the path and search parameters from the original request, but uses the parsed base URL.
  const requestUrl = new URL(req.nextUrl.pathname + req.nextUrl.search, tesseralRedirectBaseUrl);

  if (
    !trustedDomains.includes(requestUrl.host) &&
    !trustedDomains.some((domain) => requestUrl.host.endsWith(`.${domain}`) || requestUrl.host.startsWith(`${domain}:`))
  ) {
    throw new Error(
      `Tesseral Project ${projectId} is not configured to be served from ${requestUrl.host}. Only the following domains are allowed:\n\n${trustedDomains.join("\n")}\n\nGo to https://console.tesseral.com/settings/vault/domains and add ${requestUrl.host} to your list of trusted domains.`,
    );
  }

  if (devMode) {
    const relayedSessionState = crypto.randomUUID();

    const params = new URLSearchParams();
    params.set("relayed-session-state", relayedSessionState);
    params.set(
      "redirect-uri",
      `${requestUrl.protocol}//${requestUrl.host}/_tesseral_next/dev-mode-callback${requestUrl.search}`,
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

  return NextResponse.redirect(`https://${vaultDomain}/login?${requestUrl.search}`);
}
