import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PlatformKey = "instagram" | "youtube" | "tiktok";

function cleanFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9가-힣._-]+/g, "-").replace(/-+/g, "-").slice(0, 90) || "content";
}

async function getYouTubeAccessToken() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("YouTube OAuth 환경변수가 없습니다. Client ID, Client Secret, Refresh Token을 연결하세요.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token"
    }),
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || "YouTube 액세스 토큰 갱신에 실패했습니다.");
  }
  return String(data.access_token);
}

async function uploadToSupabase(file: File, folder: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_MEDIA_BUCKET || "content-media";
  if (!supabaseUrl || !serviceKey) return null;

  const extension = file.name.split(".").pop() || "webm";
  const objectPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
  const uploadUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  const bytes = await file.arrayBuffer();
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: bytes
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase Storage 업로드 실패: ${text.slice(0, 300)}`);
  }
  const publicUrl = `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${encodeURIComponent(bucket)}/${objectPath.split("/").map(encodeURIComponent).join("/")}`;
  return { bucket, objectPath, publicUrl };
}

async function uploadYouTubeVideo(file: File, title: string, description: string) {
  const accessToken = await getYouTubeAccessToken();
  const metadata = {
    snippet: {
      title: title.slice(0, 100),
      description: description.slice(0, 5000),
      categoryId: process.env.YOUTUBE_CATEGORY_ID || "22"
    },
    status: {
      privacyStatus: process.env.YOUTUBE_PRIVACY_STATUS || "public",
      selfDeclaredMadeForKids: false
    }
  };

  const boundary = `ai-content-studio-${Date.now()}`;
  const fileBytes = Buffer.from(await file.arrayBuffer());
  const metadataPart = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`,
    "utf8"
  );
  const mediaHeader = Buffer.from(
    `--${boundary}\r\nContent-Type: ${file.type || "video/webm"}\r\n\r\n`,
    "utf8"
  );
  const ending = Buffer.from(`\r\n--${boundary}--\r\n`, "utf8");
  const body = Buffer.concat([metadataPart, mediaHeader, fileBytes, ending]);

  const response = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.length)
    },
    body,
    cache: "no-store"
  });
  const data = await response.json();
  if (!response.ok || !data.id) {
    const reason = data?.error?.errors?.[0]?.reason;
    const message = data?.error?.message || "YouTube 영상 업로드에 실패했습니다.";
    throw new Error(reason ? `${message} (${reason})` : message);
  }
  return {
    videoId: String(data.id),
    url: `https://www.youtube.com/watch?v=${data.id}`
  };
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    let platform: PlatformKey;
    let title = "AI Content Studio 영상";
    let description = "";
    let topic = "content";
    let video: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      platform = String(form.get("platform") || "") as PlatformKey;
      title = String(form.get("title") || title);
      description = String(form.get("description") || "");
      topic = String(form.get("topic") || "content");
      const candidate = form.get("video");
      video = candidate instanceof File ? candidate : null;
    } else {
      const body = await request.json();
      platform = body.platform as PlatformKey;
      title = String(body.title || title);
      description = String(body.description || "");
      topic = String(body.topic || "content");
    }

    if (!( ["instagram", "youtube", "tiktok"] as string[]).includes(platform)) {
      return NextResponse.json({ ok: false, message: "지원하지 않는 플랫폼입니다." }, { status: 400 });
    }

    if (platform === "youtube") {
      if (!video || video.size === 0) {
        return NextResponse.json({ ok: false, message: "YouTube 업로드용 릴스 영상을 먼저 생성하세요." }, { status: 412 });
      }
      if (video.size > 250 * 1024 * 1024) {
        return NextResponse.json({ ok: false, message: "현재 자동 업로드는 250MB 이하 영상만 지원합니다." }, { status: 413 });
      }

      const storage = await uploadToSupabase(video, `youtube/${cleanFileName(topic)}`);
      const youtube = await uploadYouTubeVideo(video, title, description);
      return NextResponse.json({
        ok: true,
        message: "YouTube 영상 업로드가 완료되었습니다.",
        platform,
        publishedUrl: youtube.url,
        videoId: youtube.videoId,
        mediaUrl: storage?.publicUrl || null
      });
    }

    if (platform === "instagram") {
      const configured = Boolean(
        process.env.INSTAGRAM_ACCESS_TOKEN &&
        process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID &&
        (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      if (!configured) {
        return NextResponse.json({ ok: false, message: "Instagram 토큰·비즈니스 계정 ID·Supabase Storage 설정이 필요합니다." }, { status: 412 });
      }
      return NextResponse.json({ ok: false, message: "Instagram 캐러셀·릴스 게시 연결은 다음 V42에서 진행합니다." }, { status: 501 });
    }

    return NextResponse.json({ ok: false, message: "TikTok 실제 게시 연결은 Instagram 연결 이후 진행합니다." }, { status: 501 });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      message: error instanceof Error ? error.message : "업로드 실행 요청을 처리하지 못했습니다."
    }, { status: 500 });
  }
}
