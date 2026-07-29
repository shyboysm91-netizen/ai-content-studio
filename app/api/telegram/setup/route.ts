import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function productionBaseUrl(request: NextRequest) {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const production = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (production) return `https://${production.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  const deployment = process.env.VERCEL_URL?.trim();
  if (deployment) return `https://${deployment.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  const origin = request.nextUrl.origin;
  if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) return origin.replace(/\/$/, "");
  return "";
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();

  if (!token || !chatId) {
    return NextResponse.json(
      {
        ok: false,
        error: "TELEGRAM_BOT_TOKEN과 TELEGRAM_CHAT_ID를 먼저 설정하세요.",
        missing: [!token ? "TELEGRAM_BOT_TOKEN" : null, !chatId ? "TELEGRAM_CHAT_ID" : null].filter(Boolean)
      },
      { status: 400 }
    );
  }

  const baseUrl = productionBaseUrl(request);
  if (!baseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: "로컬 주소는 텔레그램 웹훅으로 사용할 수 없습니다. Vercel 환경변수 NEXT_PUBLIC_APP_URL에 Production 주소를 입력하세요."
      },
      { status: 400 }
    );
  }

  const webhookUrl = `${baseUrl}/api/telegram/webhook`;

  try {
    const meResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`, { cache: "no-store" });
    const me = await meResponse.json();
    if (!meResponse.ok || !me.ok) {
      return NextResponse.json({ ok: false, error: me.description || "봇 토큰 확인에 실패했습니다." }, { status: 502 });
    }

    const body: Record<string, unknown> = {
      url: webhookUrl,
      allowed_updates: ["callback_query"],
      drop_pending_updates: false
    };
    if (secret) body.secret_token = secret;

    const hookResponse = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const hook = await hookResponse.json();
    if (!hookResponse.ok || !hook.ok) {
      return NextResponse.json({ ok: false, error: hook.description || "웹훅 연결에 실패했습니다." }, { status: 502 });
    }

    const testResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ AI Content Studio 텔레그램 연결이 완료되었습니다.\n이제 Studio에서 승인 요청을 보낼 수 있습니다."
      }),
      cache: "no-store"
    });
    const test = await testResponse.json();
    if (!testResponse.ok || !test.ok) {
      return NextResponse.json({ ok: false, error: test.description || "테스트 메시지 전송에 실패했습니다." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      ready: true,
      bot: me.result?.username || me.result?.first_name || "Telegram Bot",
      webhookUrl,
      message: "텔레그램 봇·채팅·승인 웹훅 연결이 완료되었습니다. 테스트 메시지를 확인하세요."
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "텔레그램 연결 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
