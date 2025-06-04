import { AccessTokenOrganization, AccessTokenUser } from "@tesseral/tesseral-vanilla-clientside/api";

import { getConfig } from "../common/config";
import { auth } from "./auth";

export async function getOrganization(): Promise<AccessTokenOrganization> {
  const { accessTokenClaims } = await auth({ or: "redirect" });
  return accessTokenClaims!.organization;
}

export async function getUser(): Promise<AccessTokenUser> {
  const { accessTokenClaims } = await auth({ or: "redirect" });
  return accessTokenClaims!.user;
}

export async function getOrganizationSettingsUrl(): Promise<string> {
  const { vaultDomain } = await getConfig();
  return `https://${vaultDomain}/organization-settings`;
}

export async function getUserSettingsUrl(): Promise<string> {
  const { vaultDomain } = await getConfig();
  return `https://${vaultDomain}/user-settings`;
}
