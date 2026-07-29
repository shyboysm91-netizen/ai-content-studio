import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type InstagramCheck = {
  connected: boolean;
  label: string;
  detail: string;
  username?: string;
  accountType?: string;
};

async function checkInstagramConnection(storageConnected: boolean): Promise<InstagramCheck> {
  const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN;
  const accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID || process.env.INSTAGRAM_USER_ID;
  const graphVersion = process.env.META_GRAPH_VERSION || "v25.0";

  if (!accessToken || !accountId) {
    return {
      connected: false,
      label: "설정 필요",
      detail: "INSTAGRAM_ACCESS_TOKEN과 INSTAGRAM_BUSINESS_ACCOUNT_ID가 필요합니다."
    };
  }

  try {
    const url = new URL(`https://graph.facebook.com/${graphVersion}/${encodeURIComponent(accountId)}`);
    url.searchParams.set("fields", "id,username,account_type");
    url.searchParams.set("access_token", accessToken);

    const response = await fetch(url, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok || data?.error) {
      const message = data?.error?.message || "Instagram 계정 확인에 실패했습니다.";
      return {
        connected: false,
        label: "인증 실패",
        detail: message
      };
    }

    const username = String(data?.username || "");
    const accountType = String(data?.account_type || "");
    return {
      connected: storageConnected,
      label: storageConnected ? "실제 계정 연결됨" : "계정 연결됨 · 저장소 필요",
      detail: storageConnected
        ? `@${username || accountId} 계정과 Supabase 미디어 저장소가 정상 연결되었습니다.`
        : `@${username || accountId} 계정 인증은 정상입니다. Supabase Storage 설정을 확인하세요.`,
      username,
      accountType
    };
  } catch (error) {
    return {
      connected: false,
      label: "확인 실패",
      detail: error instanceof Error ? error.message : "Instagram 연결 상태를 확인하지 못했습니다."
    };
  }
}

export async function GET() {
  const storageConnected = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const youtubeAuth = Boolean(
    process.env.YOUTUBE_CLIENT_ID &&
    process.env.YOUTUBE_CLIENT_SECRET &&
    process.env.YOUTUBE_REFRESH_TOKEN
  );
  const tiktokConnected = Boolean(
    process.env.TIKTOK_CLIENT_KEY &&
    process.env.TIKTOK_CLIENT_SECRET &&
    process.env.TIKTOK_ACCESS_TOKEN
  );

  const instagram = await checkInstagramConnection(storageConnected);

  return NextResponse.json({
    ok: true,
    storage: {
      connected: storageConnected,
      bucket: process.env.SUPABASE_MEDIA_BUCKET || "content-media",
      detail: storageConnected
        ? "Supabase 미디어 저장소가 준비되었습니다."
        : "NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
    },
    platforms: {
      instagram,
      youtube: {
        connected: youtubeAuth,
        label: youtubeAuth ? "실제 업로드 가능" : "설정 필요",
        detail: youtubeAuth
          ? storageConnected
            ? "YouTube OAuth와 Supabase 영상 보관이 준비되었습니다."
            : "YouTube 실제 업로드는 가능하지만 Supabase 원본 보관 설정은 없습니다."
          : "YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN이 필요합니다."
      },
      tiktok: {
        connected: tiktokConnected,
        label: tiktokConnected ? "인증 준비됨" : "설정 필요",
        detail: tiktokConnected
          ? "TikTok 자격 증명이 있습니다. 실제 게시 연결은 후속 단계입니다."
          : "TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET, TIKTOK_ACCESS_TOKEN과 앱 심사가 필요합니다."
      }
    }
  });
}
