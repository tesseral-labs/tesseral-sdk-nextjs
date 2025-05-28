import { TesseralClient, TesseralError } from "@tesseral/tesseral-vanilla-clientside";
import { fetcher } from "@tesseral/tesseral-vanilla-clientside/core";
import { redirect } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

import { getCookie, setCookie } from "./cookie";
import { InternalAccessTokenContext } from "./internal-access-token-context";
import { useProjectId, useVaultDomain } from "./publishable-key-config";
import { useAccessTokenLikelyValid } from "./use-access-token-likely-valid";
import { useFrontendApiClientInternal } from "./use-frontend-api-client-internal";

export function DevModeAccessTokenProvider({ children }: { children: React.ReactNode }) {
  const accessToken = useAccessToken();
  const frontendApiClient = useDevModeFrontendApiClient(accessToken);

  const contextValue = useMemo(() => {
    return {
      accessToken,
      frontendApiClient,
    };
  }, [accessToken, frontendApiClient]);

  return <InternalAccessTokenContext.Provider value={contextValue}>{children}</InternalAccessTokenContext.Provider>;
}

function useDevModeFrontendApiClient(accessToken: string) {
  const vaultDomain = useVaultDomain();

  return useMemo(() => {
    return new TesseralClient({
      environment: `https://${vaultDomain}/api`,
      fetcher: (options) => {
        return fetcher({
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${accessToken}`,
          },
        });
      },
    });
  }, [accessToken, vaultDomain]);
}

function useAccessToken(): string {
  const projectId = useProjectId();
  const vaultDomain = useVaultDomain();
  const frontendApiClient = useFrontendApiClientInternal();
  const [accessToken, setAccessToken] = useState<string>(() => {
    return getCookie(`tesseral_${projectId}_access_token`);
  });
  const refreshToken = useMemo(() => {
    return getCookie(`tesseral_${projectId}_refresh_token`);
  }, [projectId]);

  const [error, setError] = useState<unknown>();
  const accessTokenLikelyValid = useAccessTokenLikelyValid(accessToken ?? "");

  // whenever the access token is invalid or near-expired, refresh it
  useEffect(() => {
    if (accessTokenLikelyValid) {
      return;
    }

    (async () => {
      try {
        const { accessToken } = await frontendApiClient.refresh({
          refreshToken,
        });
        setAccessToken(accessToken!);
      } catch (e) {
        if (e instanceof TesseralError && e.statusCode === 401) {
          // our refresh token is no good
          redirect(`/_tesseral_next/redirect-login`);
        }

        setError(e);
      }
    })();
  }, [accessTokenLikelyValid, frontendApiClient, projectId, vaultDomain, refreshToken]);

  // manually set a local cookie when the access token is valid
  useEffect(() => {
    if (!accessTokenLikelyValid) {
      return;
    }
    setCookie(`tesseral_${projectId}_access_token`, accessToken!);
  }, [accessToken, accessTokenLikelyValid, projectId]);

  if (error) {
    throw error;
  }

  return accessToken;
}
