import { AccessTokenOrganization, AccessTokenUser } from "@tesseral/tesseral-vanilla-clientside/api";

import { getConfig } from "../common/config";
import { AuthError, auth } from "./auth";

export async function getOrganization(): Promise<AccessTokenOrganization> {
  try {
    const { accessTokenClaims } = await auth({ or: "throw" });
    return accessTokenClaims!.organization;
  } catch (e) {
    if (e instanceof AuthError) {
      throw new Error("getOrganization() must be called from a child component of TesseralProvider");
    }
    throw e;
  }
}

export async function getUser(): Promise<AccessTokenUser> {
  try {
    const { accessTokenClaims } = await auth({ or: "throw" });
    return accessTokenClaims!.user;
  } catch (e) {
    if (e instanceof AuthError) {
      throw new Error("getUser() must be called from a child component of TesseralProvider");
    }
    throw e;
  }
}

export async function getOrganizationSettingsUrl(): Promise<string> {
  const { vaultDomain } = await getConfig();
  return `https://${vaultDomain}/organization-settings`;
}

export async function getUserSettingsUrl(): Promise<string> {
  const { vaultDomain } = await getConfig();
  return `https://${vaultDomain}/user-settings`;
}
