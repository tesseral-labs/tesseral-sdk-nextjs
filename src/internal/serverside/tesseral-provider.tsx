import { redirect } from "next/navigation";
import React from "react";

import { PublishableKeyConfigProvider } from "../clientside/publishable-key-config";
import { TesseralProviderClientside } from "../clientside/tesseral-provider-clientside";
import { auth } from "./auth";

export async function TesseralProvider({ children }: { children?: React.ReactNode }) {
  const { accessTokenClaims } = await auth({ or: "redirect" });
  if (!accessTokenClaims) {
    // If auth() is happy but there are no claims, then this is a request coming
    // from an API key. But TesseralProvider is only useful for browsers.
    // Redirect this request away.
    const queryParams = new URLSearchParams({
      "redirect-uri": window.location.href,
    });
    redirect(`/_tesseral_next/redirect-login?${queryParams.toString()}`);
  }

  return (
    <PublishableKeyConfigProvider>
      <TesseralProviderClientside>{children}</TesseralProviderClientside>
    </PublishableKeyConfigProvider>
  );
}
