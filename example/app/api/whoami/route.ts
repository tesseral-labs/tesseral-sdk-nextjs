import { NextRequest, NextResponse } from "next/server";

import { auth } from "../../../../src/serverside";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { accessTokenClaims, organizationId } = await auth({
    or: "throw",
  });

  return NextResponse.json(
    {
      accessTokenClaims,
      organizationId,
    },
    {
      status: 200,
    },
  );
}
