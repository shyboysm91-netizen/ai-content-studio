import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set([
  "images.pexels.com"
]);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "이미지 URL이 없습니다." }, { status: 400 });
  }

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
      return NextResponse.json({ error: "허용되지 않은 이미지 주소입니다." }, { status: 400 });
    }

    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "AI-Content-Studio/5.1" },
      cache: "force-cache"
    });

    if (!response.ok) {
      return NextResponse.json({ error: "이미지를 불러오지 못했습니다." }, { status: 502 });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = await response.arrayBuffer();

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, s-maxage=86400"
      }
    });
  } catch {
    return NextResponse.json({ error: "잘못된 이미지 주소입니다." }, { status: 400 });
  }
}
