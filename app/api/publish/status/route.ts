import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const storageConnected = Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  const instagramAuth = Boolean(
    process.env.INSTAGRAM_ACCESS_TOKEN &&
    process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID
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
      instagram: {
        connected: instagramAuth && storageConnected,
        label: instagramAuth && storageConnected ? "인증 준비됨" : "설정 필요",
        detail: instagramAuth && storageConnected
          ? "Instagram 인증과 미디어 저장소가 준비되었습니다. 실제 게시 연결은 V42에서 완료합니다."
          : "INSTAGRAM_ACCESS_TOKEN, INSTAGRAM_BUSINESS_ACCOUNT_ID, Supabase Storage 설정이 필요합니다."
      },
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
