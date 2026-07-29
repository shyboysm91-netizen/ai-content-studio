import { NextRequest, NextResponse } from "next/server";
import {
  deleteTelegramDraft,
  saveTelegramDraft,
} from "../../../lib/telegramDraftStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(value: unknown, max = 3500) {
  return String(value ?? "").trim().slice(0, max);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!token || !chatId) {
    return NextResponse.json(
      { error: "텔레그램 환경변수가 설정되지 않았습니다." },
      { status: 400 }
    );
  }

  let draftId = "";
  try {
    const body = await request.json();
    const topic = clean(body.topic, 180);
    const platform = clean(body.platform, 80);
    const title = clean(body.title, 300);
    const description = clean(body.description, 1800);
    const hashtags = clean(body.hashtags, 700);
    const note = clean(body.note, 500);
    const totalCards = Number(body.totalCards || 0);
    const duration = Number(body.estimatedDurationSeconds || 0);
    const now = new Date();
    draftId = crypto.randomUUID();

    await saveTelegramDraft({
      id: draftId,
      category: "health",
      topic: topic || title || "새 콘텐츠",
      title: title || topic || "새 콘텐츠",
      cards: [],
      caption: description,
      hashtags: hashtags.split(/\s+/).filter(Boolean),
      scheduledDate: now.toISOString().slice(0, 10),
      scheduledTime: now.toTimeString().slice(0, 8),
      status: "telegram_sent",
    });

    const message = [
      "📱 <b>새 콘텐츠 승인 요청</b>",
      "",
      `<b>주제</b> ${escapeHtml(topic)}`,
      `<b>플랫폼</b> ${escapeHtml(platform)}`,
      `<b>구성</b> 카드 ${totalCards}장 · 약 ${duration}초`,
      "",
      "<b>제목</b>",
      escapeHtml(title),
      "",
      "<b>설명·캡션</b>",
      escapeHtml(description),
      "",
      "<b>해시태그</b>",
      escapeHtml(hashtags),
      note ? `\n<b>메모</b>\n${escapeHtml(note)}` : "",
      "",
      "아래 버튼으로 승인하거나 취소하세요.",
    ]
      .filter(Boolean)
      .join("\n");

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ 승인", callback_data: `publish:${draftId}` },
              { text: "❌ 취소", callback_data: `cancel:${draftId}` },
            ],
          ],
        },
      }),
      cache: "no-store",
    });

    const result = await response.json();
    if (!response.ok || !result.ok) {
      await deleteTelegramDraft(draftId);
      return NextResponse.json(
        { error: result.description || "텔레그램 API 전송에 실패했습니다." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      draftId,
      messageId: result.result?.message_id,
    });
  } catch (error) {
    if (draftId) await deleteTelegramDraft(draftId);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "전송 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
