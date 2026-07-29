import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const supabaseUrl = process.env.SUPABASE_URL?.trim() || process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const missing = [
    !token ? "TELEGRAM_BOT_TOKEN" : null,
    !chatId ? "TELEGRAM_CHAT_ID" : null,
    !supabaseUrl ? "SUPABASE_URL 또는 NEXT_PUBLIC_SUPABASE_URL" : null,
    !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null
  ].filter(Boolean);

  if (missing.length) {
    return NextResponse.json({ ready: false, connected: false, missing });
  }

  try {
    const [meResponse, hookResponse] = await Promise.all([
      fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" }),
      fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { cache: "no-store" })
    ]);
    const me = await meResponse.json();
    const hook = await hookResponse.json();

    if (!meResponse.ok || !me.ok) {
      return NextResponse.json({ ready: false, connected: false, error: me.description || "봇 토큰이 올바르지 않습니다." });
    }

    const webhookUrl = String(hook.result?.url || "");
    const webhookReady = Boolean(hookResponse.ok && hook.ok && webhookUrl.includes("/api/telegram/webhook"));

    return NextResponse.json({
      ready: webhookReady,
      connected: true,
      webhookReady,
      bot: me.result?.username || me.result?.first_name || "Telegram Bot",
      webhookUrl,
      pendingUpdates: Number(hook.result?.pending_update_count || 0),
      lastError: hook.result?.last_error_message || ""
    });
  } catch (error) {
    return NextResponse.json({
      ready: false,
      connected: false,
      error: error instanceof Error ? error.message : "텔레그램 상태 확인에 실패했습니다."
    });
  }
}
