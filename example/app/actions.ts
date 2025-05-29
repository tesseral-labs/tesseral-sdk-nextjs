"use server";

import {getOrganization, getUser} from "../../src/serverside";

export async function action() {
  const organization = await getOrganization();
  const user = await getUser();
  return { organization, user };
}
