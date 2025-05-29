"use client";

import { useState } from "react";
import useSWR from "swr";

import { useOrganization, useUser } from "../../src/clientside";
import {action} from "./actions";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export function ClientComponent() {
  const organization = useOrganization();
  const user = useUser();

  const { data: whoami } = useSWR("/api/whoami", fetcher);
  const [actionData, setActionData] = useState(null);

  return (
    <div>
      <div>React Client Component: useOrganization()</div>
      <code>
        <pre>{JSON.stringify(organization, null, 2)}</pre>
      </code>

      <div>React Client Component: useUser()</div>
      <code>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </code>

      <div>Route Handler: auth()</div>
      <code>
        <pre>{JSON.stringify(whoami, null, 2)}</pre>
      </code>

      <div>Server Action: auth()</div>
      <code>
        <pre>{JSON.stringify(actionData, null, 2)}</pre>
      </code>

      <button
        onClick={async () => {
          setActionData(await action())
        }}
      >
        Call Server Action
      </button>
    </div>
  );
}
