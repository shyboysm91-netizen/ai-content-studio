export type TelegramDraft = {
  id: string;
  category: string;
  topic: string;
  title: string;
  cards: unknown[];
  caption: string;
  hashtags: string[];
  scheduledDate: string;
  scheduledTime: string;
  status: string;
};

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim().replace(/\/$/, "");
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

function requireConfig() {
  if (!supabaseUrl || !serviceKey) {
    throw new Error(
      "Supabase 서버 환경변수가 없습니다. NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 확인하세요."
    );
  }
}

function headers(extra?: Record<string, string>) {
  return {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export async function saveTelegramDraft(draft: TelegramDraft) {
  requireConfig();
  const row = {
    id: draft.id,
    category: draft.category,
    topic: draft.topic,
    title: draft.title,
    cards: draft.cards,
    caption: draft.caption,
    hashtags: draft.hashtags,
    scheduled_date: draft.scheduledDate,
    scheduled_time: draft.scheduledTime,
    status: draft.status,
    updated_at: new Date().toISOString(),
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/content_drafts?on_conflict=id`, {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify([row]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Supabase 승인 요청 저장 실패: ${await response.text()}`);
  }
}

export async function getTelegramDraft(id: string): Promise<TelegramDraft | null> {
  requireConfig();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/content_drafts?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { headers: headers(), cache: "no-store" }
  );
  if (!response.ok) {
    throw new Error(`Supabase 승인 요청 조회 실패: ${await response.text()}`);
  }

  const rows = await response.json();
  const row = rows?.[0];
  if (!row) return null;
  return {
    id: row.id,
    category: row.category,
    topic: row.topic,
    title: row.title,
    cards: row.cards || [],
    caption: row.caption || "",
    hashtags: row.hashtags || [],
    scheduledDate: row.scheduled_date,
    scheduledTime: row.scheduled_time,
    status: row.status,
  };
}

export async function updateTelegramDraftStatus(id: string, status: string) {
  requireConfig();
  const response = await fetch(
    `${supabaseUrl}/rest/v1/content_drafts?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=minimal" }),
      body: JSON.stringify({ status, updated_at: new Date().toISOString() }),
      cache: "no-store",
    }
  );
  if (!response.ok) {
    throw new Error(`Supabase 승인 상태 수정 실패: ${await response.text()}`);
  }
}

export async function deleteTelegramDraft(id: string) {
  if (!supabaseUrl || !serviceKey) return;
  await fetch(`${supabaseUrl}/rest/v1/content_drafts?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: headers(),
    cache: "no-store",
  });
}
