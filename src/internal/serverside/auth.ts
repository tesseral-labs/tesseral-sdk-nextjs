import { TesseralClient, TesseralError } from "@tesseral/tesseral-node";
import { AuthenticateApiKeyResponse } from "@tesseral/tesseral-node/api";
import { AccessTokenClaims } from "@tesseral/tesseral-vanilla-clientside/api";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { getConfig } from "../common/config";
import { isAPIKeyFormat, isJWTFormat } from "./credentials";

/**
 * Parameters for {@link auth}.
 */
export interface AuthOptions {
  /**
   * What to do if the request is unauthenticated. Required.
   *
   * If "throw", then throw an instance of {@link AuthError}.
   *
   * If "redirect", then redirect to the login page.
   *
   * If "return_404", then respond with a 404 Not Found error.
   */
  or: "throw" | "redirect" | "return_404";
}

/**
 * The return type of {@link auth}.
 */
export interface Auth {
  /**
   * The ID of the Organization the requester belongs to.
   */
  organizationId: string;

  /**
   * "access_token" if the requester is a User Session, "api_key" if the
   * requester is an API Key.
   */
  credentialsType: "access_token" | "api_key";

  /**
   * If the request uses an Access Token, this is the set of authenticated
   * details about that request.
   */
  accessTokenClaims?: AccessTokenClaims;

  /**
   * The request's original credentials.
   */
  credentials: string;

  /**
   * Returns whether the requester has permission to carry out the given Action.
   *
   * @param action The name of the Action.
   */
  hasPermission: (action: string) => boolean;
}

/**
 * Thrown by {@link auth} when "or" is set to "throw".
 */
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Authenticates the current request and returns information about the
 * authenticated request. This function returns a Promise which you must await,
 * and only works from Next.js Server-Side code: Server Components, Route
 * Handlers, and Server Actions.
 *
 * This function is an authentication gate. Unauthenticated requests are always
 * rejected.
 *
 * You can control how to handle unauthenticated requests using the "or" option,
 * which is required. Your options are:
 *
 * * "throw": throw an instance of {@link AuthError}.
 * * "redirect": redirect to the login page.
 * * "return_404": respond with a 404 Not Found error.
 *
 * By default, this function only supports Access Tokens. To support API Keys,
 * configure the following environment variables:
 *
 * * TESSERAL_AUTH_ENABLE_API_KEYS must be set to 1
 * * TESSERAL_BACKEND_API_KEY must be your Tesseral Backend API Key
 *
 * @see https://tesseral.com/docs/sdks/serverside-sdks/tesseral-sdk-next
 */
export const auth = cache(async (options: AuthOptions): Promise<Auth> => {
  if (process.env.TESSERAL_AUTH_ENABLE_API_KEYS === "1" && !process.env.TESSERAL_BACKEND_API_KEY) {
    throw new Error(
      "If you set TESSERAL_AUTH_ENABLE_API_KEYS=1, you must also configure a TESSERAL_BACKEND_API_KEY. See https://tesseral.com/docs/sdks/serverside-sdks/tesseral-sdk-next.",
    );
  }

  const credentials = await extractCredentials();
  if (isJWTFormat(credentials)) {
    const { jwks } = await getConfig();

    let accessTokenClaims: AccessTokenClaims;
    try {
      accessTokenClaims = await authenticateAccessToken({
        jwks,
        accessToken: credentials,
        nowUnixSeconds: Date.now() / 1000,
      });
    } catch (e) {
      if (e instanceof AuthError) {
        authAbort(options);
      }
      throw e;
    }

    return {
      credentialsType: "access_token",
      organizationId: accessTokenClaims.organization.id,
      accessTokenClaims,
      credentials,
      hasPermission: (action: string): boolean => {
        return accessTokenClaims.actions?.includes(action) || false;
      },
    };
  } else if (process.env.TESSERAL_AUTH_ENABLE_API_KEYS === "1" && isAPIKeyFormat(credentials)) {
    const tesseralClient = new TesseralClient();

    let authenticateApiKeyResponse: AuthenticateApiKeyResponse;
    try {
      authenticateApiKeyResponse = await tesseralClient.apiKeys.authenticateApiKey({
        secretToken: credentials,
      });
    } catch (e) {
      if (e instanceof TesseralError && e.message === "unauthenticated_api_key") {
        authAbort(options);
      }
      throw e;
    }

    return {
      credentialsType: "api_key",
      organizationId: authenticateApiKeyResponse.organizationId!,
      credentials,
      hasPermission: (action: string): boolean => {
        return authenticateApiKeyResponse.actions?.includes(action) || false;
      },
    };
  } else {
    authAbort(options);
  }
});

function authAbort(options: AuthOptions): never {
  switch (options.or) {
    case "throw":
      throw new AuthError("Not authenticated");
    case "redirect":
      redirect(`/_tesseral_next/redirect-login`);
    // eslint-disable-next-line no-fallthrough
    case "return_404":
      notFound();
  }
}

const PREFIX_BEARER = "Bearer ";

async function extractCredentials(): Promise<string> {
  const { projectId } = await getConfig();
  const requestHeaders = await headers();

  if (requestHeaders.get("authorization")?.startsWith(PREFIX_BEARER)) {
    return requestHeaders.get("authorization")!.substring(PREFIX_BEARER.length);
  }

  const cookieStore = await cookies();
  const cookieName = `tesseral_${projectId}_access_token`;
  if (cookieStore.has(cookieName)) {
    return cookieStore.get(cookieName)!.value;
  }
  return "";
}

async function authenticateAccessToken({
  jwks,
  accessToken,
  nowUnixSeconds,
}: {
  jwks: Record<string, CryptoKey>;
  accessToken: string;
  nowUnixSeconds: number;
}): Promise<AccessTokenClaims> {
  const parts = accessToken.split(".");
  if (parts.length !== 3) {
    throw new AuthError("Not authenticated");
  }

  const [rawHeader, rawClaims, rawSignature] = parts;

  const parsedHeader = JSON.parse(base64URLDecode(parts[0]));
  if (!(parsedHeader.kid in jwks)) {
    throw new AuthError("Not authenticated");
  }

  const publicKey = jwks[parsedHeader.kid];

  const signature = Buffer.from(rawSignature.replace(/-/g, "+").replace(/_/g, "/"), "base64");

  const valid = await globalThis.crypto.subtle.verify(
    {
      name: "ECDSA",
      hash: "SHA-256",
    },
    publicKey,
    signature,
    new TextEncoder().encode(rawHeader + "." + rawClaims),
  );
  if (!valid) {
    throw new AuthError("Not authenticated");
  }

  const claims = JSON.parse(base64URLDecode(rawClaims)) as AccessTokenClaims;
  if (nowUnixSeconds < claims.nbf! || claims.exp! < nowUnixSeconds) {
    throw new AuthError("Not authenticated");
  }

  return claims;
}

function base64URLDecode(s: string): string {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString();
}
