import { NextResponse } from "next/server";
import {
  getTelegramDraft,
  updateTelegramDraftStatus,
} from "../../../lib/telegramDraftStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function telegramCall(token: string, method: string, body: Record<string, unknown>) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.description || `Telegram ${method} 실패`);
  }
  return result;
}

async function answerCallback(token: string, callbackId: string, text: string, showAlert = false) {
  await telegramCall(token, "answerCallbackQuery", {
    callback_query_id: callbackId,
    text: text.slice(0, 190),
    show_alert: showAlert,
  });
}

async function finishMessage(token: string, callback: any, text: string) {
  const chatId = callback.message?.chat?.id;
  const messageId = callback.message?.message_id;
  if (!chatId || !messageId) return;

  await telegramCall(token, "editMessageReplyMarkup", {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: [] },
  });

  await telegramCall(token, "sendMessage", {
    chat_id: chatId,
    text,
    reply_to_message_id: messageId,
  });
}

export async function POST(req: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN 누락" }, { status: 500 });
  }

  let callback: any = null;
  try {
    const expectedSecret = (
      process.env.TELEGRAM_WEBHOOK_SECRET ||
      process.env.CONTENT_APPROVAL_SECRET ||
      ""
    ).trim();
    const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token") || "";
    if (expectedSecret && receivedSecret !== expectedSecret) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const update = await req.json();
    callback = update.callback_query;
    if (!callback) return NextResponse.json({ ok: true });

    const separator = String(callback.data || "").indexOf(":");
    const action = separator >= 0 ? String(callback.data).slice(0, separator) : "";
    const draftId = separator >= 0 ? String(callback.data).slice(separator + 1) : "";
    const allowedChatId = process.env.TELEGRAM_CHAT_ID?.trim();
    const callbackChatId = String(callback.message?.chat?.id || "");

    if (allowedChatId && callbackChatId !== allowedChatId) {
      await answerCallback(token, callback.id, "허용되지 않은 계정입니다.", true);
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    if (!draftId || !["publish", "cancel"].includes(action)) {
      await answerCallback(token, callback.id, "잘못된 승인 요청입니다.", true);
      return NextResponse.json({ error: "invalid callback" }, { status: 400 });
    }

    const draft = await getTelegramDraft(draftId);
    if (!draft) {
      await answerCallback(token, callback.id, "저장된 콘텐츠를 찾지 못했습니다.", true);
      return NextResponse.json({ error: "draft not found" }, { status: 404 });
    }

    if (["published", "cancelled"].includes(draft.status)) {
      await answerCallback(token, callback.id, "이미 처리된 요청입니다.");
      return NextResponse.json({ ok: true, duplicate: true });
    }

    if (action === "cancel") {
      await updateTelegramDraftStatus(draftId, "cancelled");
      await answerCallback(token, callback.id, "승인 요청을 취소했습니다.");
      await finishMessage(token, callback, "❌ 콘텐츠 승인 요청이 취소되었습니다.");
      return NextResponse.json({ ok: true, action, draftId, status: "rejected" });
    }

    await updateTelegramDraftStatus(draftId, "published");
    await answerCallback(token, callback.id, "승인 완료");
    await finishMessage(
      token,
      callback,
      "✅ 콘텐츠가 승인되었습니다. AI Content Studio에서 승인 상태를 확인할 수 있습니다."
    );
    return NextResponse.json({ ok: true, action, draftId, status: "approved" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "승인 처리 실패";
    if (callback?.id) {
      try {
        await answerCallback(token, callback.id, `승인 처리 실패: ${message}`, true);
      } catch {}
    }
    console.error("Telegram webhook error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
