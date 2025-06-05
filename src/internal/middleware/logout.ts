import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "../common/config";

export async function logoutMiddleware(req: NextRequest): Promise<NextResponse> {
  const { projectId, vaultDomain } = await getConfig();
  const accessToken = req.cookies.get(`tesseral_${projectId}_access_token`)?.value;

  // If there is no access token, we can just redirect to the home page.
  if (accessToken) {
    const res = await fetch(`https://${vaultDomain}/api/frontend/v1/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cookie": `tesseral_${projectId}_access_token=${accessToken}`,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      throw new Error(`Error calling vault logout endpoint: ${res.status} - ${await res.text()}`);
    }
  }

  const url = new URL("/", req.url);
  const response = NextResponse.redirect(url.toString());

  response.cookies.delete(`tesseral_${projectId}_access_token`);
  response.cookies.delete(`tesseral_${projectId}_refresh_token`);

  return response;
}
