import { useState } from "react";

import { auth, getOrganization, getUser } from "../../../src/serverside";

export default async function Page() {
  const organization = await getOrganization();
  const user = await getUser();

  return (
    <div>
      <div>React Server Component: getOrganization()</div>
      <code>
        <pre>{JSON.stringify(organization, null, 2)}</pre>
      </code>

      <div>React Server Component: getUser()</div>
      <code>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </code>
    </div>
  );
}
