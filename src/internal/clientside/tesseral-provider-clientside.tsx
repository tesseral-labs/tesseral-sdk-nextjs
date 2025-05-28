"use client";

import React, { useContext, useMemo } from "react";

import { DefaultModeAccessTokenProvider } from "./default-mode-access-token-provider";
import { DevModeAccessTokenProvider } from "./dev-mode-access-token-provider";
import { InternalAccessTokenContext } from "./internal-access-token-context";
import { parseAccessToken } from "./parse-access-token";
import { PublishableKeyConfigProvider, useDevMode, useVaultDomain } from "./publishable-key-config";
import { TesseralContext, TesseralContextData } from "./tesseral-context";

export function TesseralProviderClientside({ children }: { children?: React.ReactNode }) {
  return (
    <PublishableKeyConfigProvider>
      <TesseralProviderWithConfig>
        <TesseralProviderWithAccessToken>{children}</TesseralProviderWithAccessToken>
      </TesseralProviderWithConfig>
    </PublishableKeyConfigProvider>
  );
}

function TesseralProviderWithConfig({ children }: { children?: React.ReactNode }) {
  const devMode = useDevMode();

  if (devMode) {
    return <DevModeAccessTokenProvider>{children}</DevModeAccessTokenProvider>;
  } else {
    return <DefaultModeAccessTokenProvider>{children}</DefaultModeAccessTokenProvider>;
  }
}

function TesseralProviderWithAccessToken({ children }: { children?: React.ReactNode }) {
  const vaultDomain = useVaultDomain();
  const { accessToken, frontendApiClient } = useContext(InternalAccessTokenContext)!;

  const accessTokenClaims = useMemo(() => {
    return parseAccessToken(accessToken);
  }, [accessToken]);

  const contextValue = useMemo(() => {
    return {
      vaultDomain,
      accessToken,
      frontendApiClient,
      accessTokenClaims,
    } as TesseralContextData;
  }, [vaultDomain, accessToken, frontendApiClient, accessTokenClaims]);

  return <TesseralContext.Provider value={contextValue}>{children}</TesseralContext.Provider>;
}
