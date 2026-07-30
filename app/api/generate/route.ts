import { NextRequest, NextResponse } from "next/server";
import { buildPlannerPrompt } from "../../lib/ai/planner";

type CardType = "hook" | "reason" | "food" | "comparison" | "howto" | "recipe" | "warning" | "closing";
type RawCard = {
  type?: CardType;
  title?: string;
  body?: string;
  details?: string[];
  goodItems?: string[];
  cautionItems?: string[];
  recipeSteps?: string[];
  imageKeyword?: string;
  badge?: string;
  sourceNote?: string;
  imageSearchQuery?: string;
};

type CompactResult = {
  c?: unknown[];
  g?: string[];
  w?: string[];
  caption?: string;
  tags?: string[];
};

const CARD_TYPES: CardType[] = ["hook", "reason", "food", "howto", "warning", "closing"];
const IMAGE_KEYWORDS = ["heart", "doctor", "food", "checklist", "warning", "heart"];
const BADGES = ["꼭 알아두세요", "왜 중요할까요?", "몸에서 일어나는 변화", "오늘부터 실천", "자주 하는 실수", "오늘의 핵심"];

type CacheEntry = { expiresAt: number; value: unknown };
const globalCache = globalThis as typeof globalThis & { __contentGenerationCache?: Map<string, CacheEntry> };
const generationCache = globalCache.__contentGenerationCache || new Map<string, CacheEntry>();
globalCache.__contentGenerationCache = generationCache;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function cacheKey(input: { topic: string; category: string; mode: string; audience: string; commercialBrief: unknown }) {
  return JSON.stringify(input);
}

function getCached(key: string) {
  const hit = generationCache.get(key);
  if (!hit) return null;
  if (hit.expiresAt <= Date.now()) {
    generationCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCached(key: string, value: unknown) {
  generationCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, value });
  if (generationCache.size > 100) {
    const first = generationCache.keys().next().value;
    if (first) generationCache.delete(first);
  }
}

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOllama(prompt: string) {
  const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "gemma3:4b";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 75_000);

  try {
    const response = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: "json",
        keep_alive: "30m",
        options: {
          temperature: 0.28,
          num_ctx: 1536,
          num_predict: 720,
          num_batch: 16,
          top_k: 20,
          top_p: 0.86,
          repeat_penalty: 1.1
        }
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "Ollama 호출에 실패했습니다.");
    }
    const data = await response.json();
    return extractJson(String(data.response || ""));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI 생성이 75초를 넘겼습니다. Ollama를 재시작한 뒤 다시 시도하세요.");
    }
    if (error instanceof TypeError) {
      throw new Error("Ollama 연결에 실패했습니다. Ollama 앱과 localhost:11434를 확인하세요.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanList(value: unknown, max = 4) {
  return Array.isArray(value) ? value.map(String).map(v => v.trim()).filter(Boolean).slice(0, max) : [];
}

function trimCardTitle(value: string) {
  const title = value.replace(/\s+/g, " ").trim();
  return title.length > 42 ? `${title.slice(0, 41).trim()}…` : title;
}

function hasNaturalBridge(text: string) {
  return /(다음|그렇다면|여기서|이제|반면|먼저|중요한 건|구분|확인해|살펴보)/.test(text);
}

function normalizeBody(value: unknown) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function expandCompact(result: CompactResult) {
  const rows = Array.isArray(result.c) ? result.c.slice(0, 6) : [];
  const cards: RawCard[] = rows.map((item, index) => {
    const row = Array.isArray(item) ? item : [];
    const details = cleanList(row[2], 4);
    return {
      type: CARD_TYPES[index],
      title: String(row[0] || ""),
      body: String(row[1] || ""),
      details,
      goodItems: index === 3 ? cleanList(result.g, 4) : [],
      cautionItems: index === 4 ? cleanList(result.w, 4) : [],
      recipeSteps: [],
      imageKeyword: String(row[3] || IMAGE_KEYWORDS[index]),
      badge: BADGES[index],
      sourceNote: "일반적인 건강·생활 정보이며 개인 진료를 대신하지 않음",
      imageSearchQuery: String(row[3] || IMAGE_KEYWORDS[index])
    };
  });

  return {
    cards,
    caption: result.caption || "",
    hashtags: result.tags || []
  };
}

function normalizeCard(card: RawCard, index: number) {
  const type = CARD_TYPES[index] || "closing";
  return {
    type,
    title: trimCardTitle(String(card.title || `카드 ${index + 1}`)),
    body: normalizeBody(card.body),
    details: cleanList(card.details, 4),
    goodItems: cleanList(card.goodItems, 4),
    cautionItems: cleanList(card.cautionItems, 4),
    recipeSteps: [],
    imageKeyword: String(card.imageKeyword || IMAGE_KEYWORDS[index]).trim(),
    badge: String(card.badge || BADGES[index]).trim(),
    sourceNote: String(card.sourceNote || "일반적인 건강·생활 정보이며 개인 진료를 대신하지 않음").trim(),
    imageSearchQuery: String(card.imageSearchQuery || card.imageKeyword || IMAGE_KEYWORDS[index]).trim()
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const topic = String(body.topic || "").trim();
  const category = String(body.category || "건강");
  const mode = String(body.mode || "auto");
  const audience = String(body.audience || "일반 성인");
  const commercialBrief = body.commercialBrief && typeof body.commercialBrief === "object" ? body.commercialBrief : {};

  if (body.healthCheck === true) {
    const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
    try {
      const response = await fetch(`${base}/api/tags`, { cache: "no-store", signal: AbortSignal.timeout(7000) });
      if (!response.ok) throw new Error();
      return NextResponse.json({ ok: true });
    } catch {
      return NextResponse.json({
        error: process.env.VERCEL && /127\.0\.0\.1|localhost/.test(base)
          ? "Vercel에서는 PC의 localhost Ollama에 직접 연결할 수 없습니다."
          : "Ollama 연결에 실패했습니다."
      }, { status: 503 });
    }
  }

  if (!topic) return NextResponse.json({ error: "주제를 입력하세요." }, { status: 400 });

  const key = cacheKey({ topic, category, mode, audience, commercialBrief });
  if (!body.action) {
    const cached = getCached(key);
    if (cached) return NextResponse.json({ ...(cached as object), cached: true });
  }

  const prompt = buildPlannerPrompt({ topic, category, mode, audience, commercialBrief });
  if (body.action === "prepare") {
    return NextResponse.json({ prompt, model: process.env.OLLAMA_MODEL || "gemma3:4b" });
  }

  try {
    const raw = body.action === "finalize"
      ? extractJson(String(body.rawResponse || ""))
      : await callOllama(prompt);
    const result = expandCompact(raw as CompactResult);
    const rawCards: RawCard[] = Array.isArray(result.cards) ? result.cards.slice(0, 6) : [];

    if (rawCards.length !== 6) {
      throw new Error("AI가 6장의 카드를 완성하지 못했습니다. 다시 생성하세요.");
    }

    const cards = rawCards.map(normalizeCard);

    if (cards[3].details.length < 2) {
      cards[3].details = ["오늘 바로 할 수 있는 행동 하나를 정하세요.", "한 번에 바꾸기보다 꾸준히 반복하세요."];
    }
    if (cards[4].details.length < 2) {
      cards[4].details = ["좋다고 알려진 방법도 과하게 적용하지 마세요.", "증상이 지속되면 혼자 판단하지 말고 전문가와 상담하세요."];
    }
    if (cards[5].details.length < 2) {
      cards[5].details = [cards[1].title, cards[3].title, cards[4].title].filter(Boolean).slice(0, 3);
    }

    const allText = cards
      .map(c => [c.title, c.body, ...c.details, ...c.goodItems, ...c.cautionItems].join(" "))
      .join(" ");
    const riskyWords = ["완치", "치료됩니다", "무조건", "100%", "해독", "기적", "즉시 낫"];
    const riskyCount = riskyWords.filter(word => allText.includes(word)).length;
    const concreteCards = cards.filter(c => c.details.length >= 2 || c.body.length >= 70).length;
    const duplicateTitles = cards.length - new Set(cards.map(c => c.title.replace(/\s/g, ""))).size;
    const bridgeCards = cards.slice(0, 5).filter(c => hasNaturalBridge(c.body)).length;
    const readableCards = cards.filter(c => c.body.length >= 55 && c.body.length <= 220).length;
    const score = Math.max(70, Math.min(98,
      78 + concreteCards * 2 + Math.min(bridgeCards, 4) + Math.floor(readableCards / 2)
      - riskyCount * 8 - duplicateTitles * 4
    ));

    const payload = {
      caption: ["product", "review", "compare", "event"].includes(mode)
        ? `${String(commercialBrief.disclosure || "광고·협찬 콘텐츠")}\n\n${String(result.caption || "")}${commercialBrief.purchaseLink ? `\n\n구매 안내: ${String(commercialBrief.purchaseLink)}` : ""}`
        : String(result.caption || ""),
      hashtags: cleanList(result.hashtags, 12),
      cards,
      quality: {
        score,
        strengths: ["왜 중요한지 설명", "생활 속 실천 방법", "자주 하는 실수와 주의점"],
        checks: ["제목에 대한 답", "카드 간 연결", "중복 내용", "과장 표현", "본문 깊이", "안전 문구"],
        metrics: {
          hook: Math.max(70, Math.min(98, 82 + (cards[0].title.length >= 10 ? 6 : 0) + (cards[0].body.length >= 55 ? 6 : 0) - riskyCount * 6)),
          flow: Math.max(70, Math.min(98, 78 + bridgeCards * 3)),
          readability: Math.max(70, Math.min(98, 76 + readableCards * 3)),
          safety: Math.max(60, 98 - riskyCount * 14),
          uniqueness: Math.max(65, 98 - duplicateTitles * 12)
        },
        improvements: score >= 88
          ? ["정보형 캐러셀로 바로 제작해도 좋은 수준입니다."]
          : ["카드별 AI 수정으로 이유와 실천 내용을 더 구체화하세요."]
      },
      planSummary: {
        target: audience,
        intent: "주제의 중요성과 실천 방법을 이해하려는 정보 탐색",
        questions: ["왜 중요한가?", "몸에서는 어떤 변화가 생기는가?", "생활 속에서 무엇을 해야 하는가?"],
        hook: cards[0]?.title || topic,
        story: cards.map(card => card.title),
        contentKind: "information",
        coreQuestion: `${topic}은 왜 중요하고 어떻게 실천해야 할까?`,
        keyFacts: [cards[1]?.title, cards[2]?.title, cards[4]?.title].filter(Boolean)
      }
    };
    if (!body.action) setCached(key, payload);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    const friendly = /bad_alloc|GGML_ASSERT|terminated|out of memory/i.test(message)
      ? "Ollama 메모리가 부족해 생성이 중단됐습니다. Ollama를 재시작하고 다른 프로그램을 닫은 뒤 다시 시도하세요."
      : message;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
