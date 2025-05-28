import { TesseralClient } from "@tesseral/tesseral-vanilla-clientside";
import { AccessTokenClaims } from "@tesseral/tesseral-vanilla-clientside/api";
import { createContext } from "react";

export interface TesseralContextData {
  vaultDomain: string;
  accessToken: string;
  accessTokenClaims: AccessTokenClaims;
  frontendApiClient: TesseralClient;
}

export const TesseralContext = createContext<TesseralContextData | undefined>(undefined);
