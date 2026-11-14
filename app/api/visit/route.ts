import { NextResponse, type NextRequest } from "next/server";

import {
  VISIT_COOKIE_NAME,
  buildVisitStatus,
  readVisitCount,
  recordVisit,
  shouldCountVisit,
} from "@/lib/visitor-counter";

export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "Cache-Control": "no-store, max-age=0" } as const;

/** 현재 방문자 수와 문의 메일 노출 여부. 카운터를 세지 않는 조회용. */
export async function GET() {
  const count = await readVisitCount();

  return NextResponse.json(buildVisitStatus(count), { headers: NO_STORE_HEADERS });
}

/** 방문 1회 기록. 같은 세션의 두 번째 요청부터는 세지 않고 현재 수만 돌려준다. */
export async function POST(request: NextRequest) {
  const counted = shouldCountVisit({
    userAgent: request.headers.get("user-agent"),
    secFetchSite: request.headers.get("sec-fetch-site"),
    hasVisitCookie: request.cookies.get(VISIT_COOKIE_NAME)?.value === "1",
  });

  const count = counted ? await recordVisit() : await readVisitCount();
  const response = NextResponse.json(buildVisitStatus(count), { headers: NO_STORE_HEADERS });

  if (counted && count !== null) {
    response.cookies.set({
      name: VISIT_COOKIE_NAME,
      value: "1",
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}
