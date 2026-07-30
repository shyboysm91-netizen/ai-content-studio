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

const CARD_TYPES: CardType[] = ["hook", "reason", "food", "howto", "warning", "closing"];
const IMAGE_KEYWORDS = ["heart", "doctor", "body", "checklist", "warning", "heart"];
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

async function callOllama(prompt: string) {
  const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "gemma3:4b";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 70_000);

  try {
    const response = await fetch(`${base}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        keep_alive: "30m",
        options: {
          temperature: 0.25,
          num_ctx: 1536,
          num_predict: 620,
          num_batch: 16,
          top_k: 20,
          top_p: 0.85,
          repeat_penalty: 1.1
        }
      })
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || "Ollama 호출에 실패했습니다.");
    }
    const data = await response.json();
    const text = String(data.response || "").trim();
    if (!text) throw new Error("AI가 빈 응답을 보냈습니다.");
    return text;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("AI 생성이 70초를 넘겼습니다. Ollama를 재시작한 뒤 다시 시도하세요.");
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

function valueAfterLabel(block: string, labels: string[]) {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = block.match(new RegExp(`(?:^|\\n)\\s*${escaped}\\s*[:：]\\s*([^\\n]+)`, "i"));
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function listAfterLabel(block: string, labels: string[]) {
  const raw = valueAfterLabel(block, labels);
  if (!raw) return [];
  return raw
    .split(/\s*(?:\||·|•|,|\/|;|→)\s*/)
    .map(v => v.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
}

function parsePlainText(text: string) {
  const normalized = text.replace(/\r/g, "").replace(/```[a-z]*/gi, "").replace(/```/g, "").trim();
  const marker = /\[?\s*(?:CARD|카드)\s*([1-6])\s*\]?\s*[:：-]?/gi;
  const matches = [...normalized.matchAll(marker)];
  const cards: RawCard[] = [];

  for (let i = 0; i < 6; i += 1) {
    const found = matches.find(m => Number(m[1]) === i + 1);
    if (!found || found.index === undefined) continue;
    const next = matches.find(m => m.index !== undefined && m.index > found.index!);
    const start = found.index + found[0].length;
    const end = next?.index ?? normalized.length;
    const block = normalized.slice(start, end).trim();
    const title = valueAfterLabel(block, ["TITLE", "제목"]);
    const body = valueAfterLabel(block, ["BODY", "본문", "내용"]);
    const details = listAfterLabel(block, ["POINTS", "POINT", "핵심", "포인트", "실천", "주의"]);
    if (title || body) {
      cards.push({
        type: CARD_TYPES[i],
        title,
        body,
        details,
        goodItems: [],
        cautionItems: [],
        recipeSteps: [],
        imageKeyword: IMAGE_KEYWORDS[i],
        badge: BADGES[i],
        sourceNote: "일반적인 건강·생활 정보이며 개인 진료를 대신하지 않음",
        imageSearchQuery: IMAGE_KEYWORDS[i]
      });
    }
  }

  // 모델이 카드 마커를 조금 틀려도 제목/본문 쌍 6개를 복구합니다.
  if (cards.length < 6) {
    const titleMatches = [...normalized.matchAll(/(?:^|\n)\s*(?:TITLE|제목)\s*[:：]\s*([^\n]+)/gi)];
    const bodyMatches = [...normalized.matchAll(/(?:^|\n)\s*(?:BODY|본문|내용)\s*[:：]\s*([^\n]+)/gi)];
    if (titleMatches.length >= 6 && bodyMatches.length >= 6) {
      cards.length = 0;
      for (let i = 0; i < 6; i += 1) {
        cards.push({
          type: CARD_TYPES[i],
          title: titleMatches[i]?.[1]?.trim() || `카드 ${i + 1}`,
          body: bodyMatches[i]?.[1]?.trim() || "",
          details: [],
          goodItems: [],
          cautionItems: [],
          recipeSteps: [],
          imageKeyword: IMAGE_KEYWORDS[i],
          badge: BADGES[i],
          sourceNote: "일반적인 건강·생활 정보이며 개인 진료를 대신하지 않음",
          imageSearchQuery: IMAGE_KEYWORDS[i]
        });
      }
    }
  }

  const captionMatch = normalized.match(/\[?\s*(?:CAPTION|캡션)\s*\]?\s*[:：]?\s*([\s\S]*?)(?=\n\s*\[?\s*(?:HASHTAGS?|해시태그)\b|$)/i);
  const hashtagMatch = normalized.match(/\[?\s*(?:HASHTAGS?|해시태그)\s*\]?\s*[:：]?\s*([^\n]+)/i);
  const hashtags = hashtagMatch?.[1]
    ? hashtagMatch[1].split(/[\s,]+/).map(v => v.trim()).filter(v => v.startsWith("#")).slice(0, 12)
    : [];

  return {
    cards: cards.slice(0, 6),
    caption: captionMatch?.[1]?.trim() || "",
    hashtags
  };
}

function normalizeCard(card: RawCard, index: number) {
  return {
    type: CARD_TYPES[index] || "closing",
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
    const text = body.action === "finalize" ? String(body.rawResponse || "") : await callOllama(prompt);
    const result = parsePlainText(text);
    const rawCards = result.cards;

    if (rawCards.length !== 6) {
      throw new Error(`AI 카드 형식을 읽지 못했습니다. 생성된 카드 ${rawCards.length}/6장입니다. 다시 시도하세요.`);
    }

    const cards = rawCards.map(normalizeCard);
    if (cards[3].details.length < 2) cards[3].details = ["오늘 바로 할 수 있는 행동 하나를 정하세요.", "한 번에 바꾸기보다 꾸준히 반복하세요."];
    if (cards[4].details.length < 2) cards[4].details = ["좋다고 알려진 방법도 과하게 적용하지 마세요.", "증상이 지속되면 전문가와 상담하세요."];
    if (cards[5].details.length < 2) cards[5].details = [cards[1].title, cards[3].title, cards[4].title].filter(Boolean).slice(0, 3);

    const allText = cards.map(c => [c.title, c.body, ...c.details].join(" ")).join(" ");
    const riskyWords = ["완치", "치료됩니다", "무조건", "100%", "해독", "기적", "즉시 낫"];
    const riskyCount = riskyWords.filter(word => allText.includes(word)).length;
    const concreteCards = cards.filter(c => c.details.length >= 2 || c.body.length >= 55).length;
    const duplicateTitles = cards.length - new Set(cards.map(c => c.title.replace(/\s/g, ""))).size;
    const bridgeCards = cards.slice(0, 5).filter(c => hasNaturalBridge(c.body)).length;
    const readableCards = cards.filter(c => c.body.length >= 45 && c.body.length <= 220).length;
    const score = Math.max(70, Math.min(98, 78 + concreteCards * 2 + Math.min(bridgeCards, 4) + Math.floor(readableCards / 2) - riskyCount * 8 - duplicateTitles * 4));

    const payload = {
      caption: ["product", "review", "compare", "event"].includes(mode)
        ? `${String((commercialBrief as { disclosure?: string }).disclosure || "광고·협찬 콘텐츠")}\n\n${result.caption}${(commercialBrief as { purchaseLink?: string }).purchaseLink ? `\n\n구매 안내: ${String((commercialBrief as { purchaseLink?: string }).purchaseLink)}` : ""}`
        : result.caption,
      hashtags: cleanList(result.hashtags, 12),
      cards,
      quality: {
        score,
        strengths: ["JSON 없는 안정적인 글 생성", "왜 중요한지 설명", "생활 속 실천 방법"],
        checks: ["제목에 대한 답", "카드 간 연결", "중복 내용", "과장 표현", "본문 깊이", "대상 독자 일치"],
        metrics: {
          hook: Math.max(70, Math.min(98, 82 + (cards[0].title.length >= 10 ? 6 : 0) + (cards[0].body.length >= 45 ? 6 : 0) - riskyCount * 6)),
          flow: Math.max(70, Math.min(98, 78 + bridgeCards * 3)),
          readability: Math.max(70, Math.min(98, 76 + readableCards * 3)),
          safety: Math.max(60, 98 - riskyCount * 14),
          uniqueness: Math.max(65, 98 - duplicateTitles * 12)
        },
        improvements: score >= 88 ? ["정보형 캐러셀로 바로 제작해도 좋은 수준입니다."] : ["카드별 AI 수정으로 이유와 실천 내용을 더 구체화하세요."]
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
