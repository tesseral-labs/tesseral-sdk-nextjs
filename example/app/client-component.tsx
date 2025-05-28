"use client";

import {useOrganization, useUser} from "../../src/clientside";
import useSWR from "swr";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export function ClientComponent() {
    const organization = useOrganization()
    const user = useUser()

    const { data: whoami } = useSWR("/api/whoami", fetcher);

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
            <code><pre>{JSON.stringify(whoami, null, 2)}</pre></code>
        </div>
    )
}
