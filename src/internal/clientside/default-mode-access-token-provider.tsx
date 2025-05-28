import { TesseralError } from "@tesseral/tesseral-vanilla-clientside";
import { redirect } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { getCookie } from "./cookie";
import { InternalAccessTokenContext } from "./internal-access-token-context";
import { useProjectId, useVaultDomain } from "./publishable-key-config";
import { useAccessTokenLikelyValid } from "./use-access-token-likely-valid";
import { useFrontendApiClientInternal } from "./use-frontend-api-client-internal";

export function DefaultModeAccessTokenProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAccessToken();
  const frontendApiClient = useFrontendApiClientInternal();

  const contextValue = useMemo(() => {
    return {
      accessToken,
      frontendApiClient,
    };
  }, [accessToken, frontendApiClient]);

  return <InternalAccessTokenContext.Provider value={contextValue}>{children}</InternalAccessTokenContext.Provider>;
}

function useAccessToken(): string {
  const projectId = useProjectId();
  const vaultDomain = useVaultDomain();
  const frontendApiClient = useFrontendApiClientInternal();
  const [accessToken, setAccessToken] = useState<string>(() => {
    return getCookie(`tesseral_${projectId}_access_token`);
  });

  const [error, setError] = useState<unknown>();
  const accessTokenLikelyValid = useAccessTokenLikelyValid(accessToken ?? "");

  // whenever the access token is invalid or near-expired, refresh it
  useEffect(() => {
    if (accessTokenLikelyValid) {
      return;
    }

    (async () => {
      try {
        const { accessToken } = await frontendApiClient.refresh({});
        setAccessToken(accessToken);
      } catch (e) {
        if (e instanceof TesseralError && e.statusCode === 401) {
          // our refresh token is no good
          redirect(`/_tesseral_next/redirect-login`);
        }

        setError(e);
      }
    })();
  }, [accessTokenLikelyValid, frontendApiClient, projectId, vaultDomain]);

  if (error) {
    throw error;
  }

  return accessToken;
}
