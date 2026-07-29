import { NextResponse } from "next/server";
import { getDraft, updateDraft } from "../../../../lib/db";

async function answerCallback(token: string, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId, text })
  });
}

async function finishMessage(token: string, callback: any, text: string) {
  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;
  if (!chatId || !messageId) return;
  await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
  });
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, reply_to_message_id: messageId })
  });
}

export async function POST(req: Request) {
  const secret = req.headers.get("x-telegram-bot-api-secret-token");
  if (process.env.TELEGRAM_WEBHOOK_SECRET && secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const update = await req.json();
  const callback = update.callback_query;
  if (!callback) return NextResponse.json({ ok: true });

  const [action, draftId] = String(callback.data || "").split(":");
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const allowedChatId = process.env.TELEGRAM_CHAT_ID;
  const callbackChatId = String(callback.message?.chat?.id || "");

  if (allowedChatId && callbackChatId !== String(allowedChatId)) {
    if (token) await answerCallback(token, callback.id, "허용되지 않은 계정입니다.");
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const draft = await getDraft(draftId);
  if (!draft) {
    if (token) await answerCallback(token, callback.id, "콘텐츠를 찾을 수 없습니다.");
    return NextResponse.json({ error: "draft not found" }, { status: 404 });
  }

  if (draft.status === "published" || draft.status === "cancelled") {
    if (token) await answerCallback(token, callback.id, "이미 처리된 요청입니다.");
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (action === "cancel") {
    await updateDraft(draftId, { status: "cancelled" });
    if (token) {
      await answerCallback(token, callback.id, "승인 요청을 취소했습니다.");
      await finishMessage(token, callback, "❌ 콘텐츠 승인 요청이 취소되었습니다.");
    }
    return NextResponse.json({ ok: true, action, draftId, status: "rejected" });
  }

  if (action === "publish") {
    // 기존 DB 스키마의 published 값을 '텔레그램 승인 완료' 상태로 사용합니다.
    // 실제 플랫폼 게시 성공으로 표시하지 않으며, Studio의 업로드 대기열로 넘깁니다.
    await updateDraft(draftId, { status: "published" });
    if (token) {
      await answerCallback(token, callback.id, "승인 완료. Studio에서 상태를 확인하세요.");
      await finishMessage(token, callback, "✅ 콘텐츠가 승인되었습니다. AI Content Studio의 업로드 대기열로 이동할 수 있습니다.");
    }
    return NextResponse.json({ ok: true, action, draftId, status: "approved" });
  }

  if (token) await answerCallback(token, callback.id, "잘못된 요청입니다.");
  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
