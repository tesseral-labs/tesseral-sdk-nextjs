import { TesseralClient } from "@tesseral/tesseral-vanilla-clientside";
import { AccessTokenOrganization, AccessTokenUser } from "@tesseral/tesseral-vanilla-clientside/api";
import { useCallback, useContext } from "react";

import { TesseralContext } from "./tesseral-context";

export interface UseTesseralResult {
  vaultDomain: string;
  frontendApiClient: TesseralClient;
  accessToken: string;
}

export function useTesseral(): UseTesseralResult {
  const context = useContext(TesseralContext);
  if (!context) {
    throw new Error("useTesseral() must be called from a child component of TesseralContext");
  }

  return {
    vaultDomain: context.vaultDomain,
    frontendApiClient: context.frontendApiClient,
    accessToken: context.accessToken,
  };
}

export function useOrganization(): AccessTokenOrganization {
  const context = useContext(TesseralContext);
  if (!context) {
    throw new Error("useOrganization() must be called from a child component of TesseralProvider");
  }
  return context.accessTokenClaims.organization;
}

export function useUser(): AccessTokenUser {
  const context = useContext(TesseralContext);
  if (!context) {
    throw new Error("useUser() must be called from a child component of TesseralProvider");
  }
  return context.accessTokenClaims.user;
}

export function useHasPermission(): (action: string) => boolean {
  const context = useContext(TesseralContext);
  if (!context) {
    throw new Error(`useHasPermission() must be called from a child component of TesseralContext`);
  }

  return useCallback(
    (action: string) => {
      return context.accessTokenClaims.actions?.includes(action) || false;
    },
    [context.accessTokenClaims.actions],
  );
}

export function useLogout(): () => void {
  // this code may call a variable number of hooks, but we're throwing in such
  // cases anyway
  if (!useContext(TesseralContext)) {
    throw new Error(`useLogout() must be called from a child component of TesseralContext`);
  }

  return () => {
    window.location.href = "/_tesseral_next/logout";
  };
}

export function useOrganizationSettingsUrl(): string {
  if (!useContext(TesseralContext)) {
    throw new Error(`useOrganizationSettingsUrl() must be called from a child component of TesseralContext`);
  }

  const { vaultDomain } = useTesseral();
  return `https://${vaultDomain}/organization-settings`;
}

export function useUserSettingsUrl(): string {
  if (!useContext(TesseralContext)) {
    throw new Error(`useUserSettingsUrl() must be called from a child component of TesseralContext`);
  }

  const { vaultDomain } = useTesseral();
  return `https://${vaultDomain}/user-settings`;
}
