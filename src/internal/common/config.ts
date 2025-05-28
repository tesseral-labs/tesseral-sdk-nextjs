import { cache } from "react";

interface Config {
  projectId: string;
  vaultDomain: string;
  devMode: boolean;
  jwks: Record<string, CryptoKey>;
}

export const getConfig = cache(async (): Promise<Config> => {
  const configApiHostname = process.env.NEXT_PUBLIC_TESSERAL_CONFIG_API_HOSTNAME || `config.tesseral.com`;

  const publishableKey = process.env.NEXT_PUBLIC_TESSERAL_PUBLISHABLE_KEY;
  if (!publishableKey) {
    throw new Error(
      "To use @tesseral/tesseral-next, you must configure a NEXT_PUBLIC_TESSERAL_PUBLISHABLE_KEY environment variable.",
    );
  }

  const configResponse = await fetch(
    `https://${configApiHostname}/v1/config/${process.env.NEXT_PUBLIC_TESSERAL_PUBLISHABLE_KEY}`,
  );

  if (!configResponse.ok) {
    throw new Error(`Received non-200 response from Tesseral Config API, status: ${configResponse.status}`);
  }

  const configData = await configResponse.json();

  const jwks: Record<string, CryptoKey> = {};
  for (const key of configData.keys) {
    if (key.kty !== "EC" || key.crv !== "P-256") {
      throw new Error("internal error: jwks must contain P-256 elliptic public keys");
    }

    jwks[key.kid] = await globalThis.crypto.subtle.importKey(
      "jwk",
      key,
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      false,
      ["verify"],
    );
  }

  return {
    projectId: configData.projectId,
    vaultDomain: configData.vaultDomain,
    devMode: configData.devMode,
    jwks,
  };
});
