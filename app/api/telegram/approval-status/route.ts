import { NextRequest, NextResponse } from "next/server";
import { getDraft } from "../../../../lib/db";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id가 필요합니다." }, { status: 400 });

  try {
    const draft = await getDraft(id);
    if (!draft) return NextResponse.json({ error: "승인 요청을 찾을 수 없습니다." }, { status: 404 });

    if (draft.status === "published") {
      return NextResponse.json({ status: "approved", message: "텔레그램 승인 완료 · 업로드 대기열 이동 가능" });
    }
    if (draft.status === "cancelled") {
      return NextResponse.json({ status: "rejected", message: "텔레그램에서 승인 요청 취소" });
    }
    return NextResponse.json({ status: "pending", message: "텔레그램 응답 대기 중" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "상태 확인에 실패했습니다." },
      { status: 500 }
    );
  }
}
