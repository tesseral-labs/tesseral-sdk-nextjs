"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface PublishableKeyConfig {
  projectId: string;
  vaultDomain: string;
  devMode: boolean;
  trustedDomains: string[];
}

const PublishableKeyConfigContext = createContext<PublishableKeyConfig | undefined>(undefined);

export function PublishableKeyConfigProvider({ children }: { children?: React.ReactNode }) {
  const [publishableKeyConfig, setPublishableKeyConfig] = useState<PublishableKeyConfig | undefined>();
  const [validatedPublishableKeyConfig, setValidatedPublishableKeyConfig] = useState<
    PublishableKeyConfig | undefined
  >();
  const [error, setError] = useState<unknown>();

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(
          `https://${process.env.NEXT_PUBLIC_TESSERAL_CONFIG_API_HOSTNAME}/v1/config/${process.env.NEXT_PUBLIC_TESSERAL_PUBLISHABLE_KEY}`,
        );
        if (response.status === 400 || response.status === 404) {
          throw new Error(
            `Tesseral Publishable Key ${process.env.NEXT_PUBLIC_TESSERAL_PUBLISHABLE_KEY} not found. Go to https://console.tesseral.com/project-settings/publishable-keys to see your list of Publishable Keys, and then update your <TesseralProvider publishableKey={...} /> call to use one of those keys.`,
          );
        }
        if (!response.ok) {
          throw new Error(
            `Failed to fetch Tesseral Publishable Key ${process.env.NEXT_PUBLIC_TESSERAL_PUBLISHABLE_KEY}`,
          );
        }

        const config = await response.json();
        setPublishableKeyConfig(config);
      } catch (e) {
        setError(e);
      }
    })();
  }, []);

  useEffect(() => {
    if (!publishableKeyConfig) {
      return;
    }

    if (location.host !== "" && !publishableKeyConfig.trustedDomains.includes(location.host)) {
      setError(
        new Error(
          `Tesseral Project ${publishableKeyConfig.projectId} is not configured to be served from ${location.host}. Only the following domains are allowed:\n\n${publishableKeyConfig.trustedDomains.join("\n")}\n\nGo to https://console.tesseral.com/project-settings and add ${location.host} to your list of trusted domains.`,
        ),
      );
    }

    setValidatedPublishableKeyConfig(publishableKeyConfig);
  }, [publishableKeyConfig]);

  if (error) {
    throw error;
  }

  if (!validatedPublishableKeyConfig) {
    return null;
  }

  return (
    <PublishableKeyConfigContext.Provider value={validatedPublishableKeyConfig}>
      {children}
    </PublishableKeyConfigContext.Provider>
  );
}

export function useProjectId(): string {
  const config = useContext(PublishableKeyConfigContext);
  if (!config) {
    throw new Error("useProjectId() must be called from a child component of PublishableKeyConfigContext");
  }
  return config.projectId;
}

export function useVaultDomain(): string {
  const config = useContext(PublishableKeyConfigContext);
  if (!config) {
    throw new Error("useVaultDomain() must be called from a child component of PublishableKeyConfigContext");
  }
  return config.vaultDomain;
}

export function useDevMode(): boolean {
  const config = useContext(PublishableKeyConfigContext);
  if (!config) {
    throw new Error("useDevMode() must be called from a child component of PublishableKeyConfigContext");
  }
  return config.devMode;
}
