import { NextRequest, NextResponse } from "next/server";

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

const ALLOWED_TYPES: CardType[] = ["hook", "reason", "food", "comparison", "howto", "recipe", "warning", "closing"];
const CARD_TYPES: CardType[] = ["hook", "reason", "food", "comparison", "recipe", "closing"];

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOllama(prompt: string, numPredict: number) {
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
        keep_alive: "2m",
        options: {
          temperature: 0.25,
          num_ctx: 1536,
          num_predict: numPredict,
          num_batch: 32,
          num_thread: 4
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
      throw new Error("AI 생성이 75초를 넘었습니다. Ollama를 재시작한 뒤 다시 시도하세요.");
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
  return Array.isArray(value) ? value.map(String).map((v) => v.trim()).filter(Boolean).slice(0, max) : [];
}

function trimCardTitle(value: string) {
  const title = value.replace(/\s+/g, " ").trim();
  return title.length > 42 ? `${title.slice(0, 41).trim()}…` : title;
}

function hasNaturalBridge(text: string) {
  return /(다음|그렇다면|여기서|이제|반면|먼저|중요한 건|구분|확인해|살펴보)/.test(text);
}

function normalizeCard(card: RawCard, index: number) {
  const type = ALLOWED_TYPES.includes(card.type as CardType) ? (card.type as CardType) : CARD_TYPES[index];
  const title = trimCardTitle(String(card.title || `카드 ${index + 1}`));
  const body = String(card.body || "").replace(/\s+/g, " ").trim();
  const imageKeyword = String(card.imageKeyword || (type === "recipe" ? "healthy meal" : "healthy lifestyle")).trim();

  return {
    type,
    title,
    body,
    details: cleanList(card.details, 4),
    goodItems: cleanList(card.goodItems, 4),
    cautionItems: cleanList(card.cautionItems, 4),
    recipeSteps: cleanList(card.recipeSteps, 4),
    imageKeyword,
    badge: String(card.badge || (index === 0 ? "꼭 확인하세요" : `${index + 1}/6`)).trim(),
    sourceNote: String(card.sourceNote || "일반적인 건강·영양 정보 요약").trim(),
    imageSearchQuery: String(card.imageSearchQuery || imageKeyword).trim()
  };
}

function isFoodTopic(topic: string, category: string) {
  return /(음식|식단|메뉴|반찬|간식|레시피|브로콜리|키위|샐러드|철분|변비|다이어트|영양|임산부)/.test(`${topic} ${category}`);
}

function buildCardsPrompt(topic: string, category: string, audience: string) {
  const foodRule = isFoodTopic(topic, category)
    ? "3장과 5장은 식재료 이름만 나열하지 말고 실제로 맛있게 먹는 완성 메뉴를 제시하세요. 5장은 재료와 조리시간을 본문에 간단히 포함하세요."
    : "각 카드에 바로 실행할 수 있는 구체적인 행동을 넣으세요.";

  return `한국어 인스타그램 카드뉴스 6장을 만드세요.
주제: ${topic}
카테고리: ${category}
대상: ${audience}

규칙:
- 쉬운 한국어로 작성
- 과장, 치료 보장, 근거 없는 숫자 금지
- 제목은 22자 안팎, 본문은 카드당 1~2문장
- 카드 순서와 type은 정확히 hook, reason, food, comparison, recipe, closing
- 1장은 강한 훅, 6장은 핵심 요약과 저장 유도
- ${foodRule}
- JSON 외에는 출력하지 마세요.

정확한 JSON 형식:
{"cards":[{"type":"hook","title":"","body":"","imageKeyword":""},{"type":"reason","title":"","body":"","imageKeyword":""},{"type":"food","title":"","body":"","imageKeyword":""},{"type":"comparison","title":"","body":"","imageKeyword":""},{"type":"recipe","title":"","body":"","imageKeyword":""},{"type":"closing","title":"","body":"","imageKeyword":""}]}`;
}

function buildMetaPrompt(topic: string, audience: string, cards: RawCard[]) {
  const summary = cards.map((card, index) => `${index + 1}. ${card.title}: ${card.body}`).join("\n");
  return `아래 카드뉴스를 바탕으로 인스타그램 캡션과 해시태그를 만드세요.
주제: ${topic}
대상: ${audience}
카드 내용:
${summary}

규칙:
- 캡션은 3~5문장
- 마지막에 저장 또는 공유를 자연스럽게 권유
- 해시태그는 한국어 중심 8개
- JSON 외에는 출력하지 마세요.

JSON 형식: {"caption":"","hashtags":["#태그"]}`;
}

function prepareFallbacks(cards: ReturnType<typeof normalizeCard>[]) {
  const comparison = cards.find((card) => card.type === "comparison");
  const recipe = cards.find((card) => card.type === "recipe");

  if (comparison && comparison.goodItems.length < 2) {
    comparison.goodItems = ["균형 잡힌 선택", "개인 상태에 맞춘 선택"];
  }
  if (comparison && comparison.cautionItems.length < 2) {
    comparison.cautionItems = ["과도한 섭취", "증상이 있는데 무리하기"];
  }
  if (recipe && recipe.details.length < 2) {
    recipe.details = ["준비 5분", "간단 조리 10분"];
  }
  if (recipe && recipe.recipeSteps.length < 3) {
    recipe.recipeSteps = ["재료를 먹기 좋게 준비합니다.", "기름과 간은 과하지 않게 조리합니다.", "개인 상태에 맞춰 양을 조절합니다."];
  }
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
      return NextResponse.json(
        {
          error:
            process.env.VERCEL && /127\.0\.0\.1|localhost/.test(base)
              ? "Vercel에서는 PC의 localhost Ollama에 직접 연결할 수 없습니다."
              : "Ollama 연결에 실패했습니다."
        },
        { status: 503 }
      );
    }
  }

  if (!topic) return NextResponse.json({ error: "주제를 입력하세요." }, { status: 400 });

  const cardsPrompt = buildCardsPrompt(topic, category, audience);
  if (body.action === "prepare") {
    return NextResponse.json({ prompt: cardsPrompt, model: process.env.OLLAMA_MODEL || "gemma3:4b" });
  }

  try {
    let rawCards: RawCard[];
    let caption = "";
    let hashtags: string[] = [];

    if (body.action === "finalize") {
      const parsed = extractJson(String(body.rawResponse || ""));
      rawCards = Array.isArray(parsed.cards) ? parsed.cards.slice(0, 6) : [];
      caption = String(parsed.caption || "");
      hashtags = cleanList(parsed.hashtags, 12);
    } else {
      const cardResult = await callOllama(cardsPrompt, 620);
      rawCards = Array.isArray(cardResult.cards) ? cardResult.cards.slice(0, 6) : [];
      if (rawCards.length !== 6) throw new Error("AI가 6장의 카드를 완성하지 못했습니다. 다시 생성하세요.");

      const metaResult = await callOllama(buildMetaPrompt(topic, audience, rawCards), 260);
      caption = String(metaResult.caption || "");
      hashtags = cleanList(metaResult.hashtags, 12);
    }

    if (rawCards.length !== 6) throw new Error("AI가 6장의 카드를 완성하지 못했습니다. 다시 생성하세요.");

    const cards = rawCards.map(normalizeCard);
    prepareFallbacks(cards);

    const allText = cards.map((card) => [card.title, card.body, ...card.details, ...card.goodItems, ...card.cautionItems, ...card.recipeSteps].join(" ")).join(" ");
    const riskyWords = ["완치", "치료됩니다", "무조건", "100%", "해독", "기적", "즉시 낫"];
    const riskyCount = riskyWords.filter((word) => allText.includes(word)).length;
    const concreteCards = cards.filter((card) => card.details.length >= 2 || card.goodItems.length >= 2 || card.recipeSteps.length >= 3).length;
    const duplicateTitles = cards.length - new Set(cards.map((card) => card.title.replace(/\s/g, ""))).size;
    const bridgeCards = cards.slice(0, 5).filter((card) => hasNaturalBridge(card.body)).length;
    const conciseCards = cards.filter((card) => card.body.length > 0 && card.body.length <= 150).length;
    const score = Math.max(70, Math.min(98, 78 + concreteCards * 2 + Math.min(bridgeCards, 5) + Math.floor(conciseCards / 2) - riskyCount * 8 - duplicateTitles * 4));

    const finalCaption = ["product", "review", "compare", "event"].includes(mode)
      ? `${String(commercialBrief.disclosure || "광고·협찬 콘텐츠")}\n\n${caption}${commercialBrief.purchaseLink ? `\n\n구매 안내: ${String(commercialBrief.purchaseLink)}` : ""}`
      : caption;

    return NextResponse.json({
      caption: finalCaption,
      hashtags,
      cards,
      quality: {
        score,
        strengths: ["6장 경량 생성", "구체적인 실천 방법", "주의 상황 포함"],
        checks: ["첫 장 훅", "카드 간 연결", "중복 내용", "과장 표현", "본문 길이", "안전 문구"],
        metrics: {
          hook: Math.max(70, Math.min(98, 82 + (cards[0].title.length >= 12 ? 6 : 0) + (cards[0].body.length >= 25 ? 5 : 0) - riskyCount * 6)),
          flow: Math.max(70, Math.min(98, 76 + bridgeCards * 3)),
          readability: Math.max(70, Math.min(98, 78 + conciseCards * 2)),
          safety: Math.max(60, 98 - riskyCount * 14),
          uniqueness: Math.max(65, 98 - duplicateTitles * 12)
        },
        improvements: score >= 88 ? ["바로 캐러셀 패키지로 제작해도 좋은 수준입니다."] : ["필요하면 카드별 AI 수정으로 문장을 다듬으세요."]
      },
      planSummary: {
        target: audience,
        intent: "정보 탐색",
        questions: [],
        hook: cards[0]?.title || topic,
        story: cards.map((card) => card.title),
        contentKind: mode,
        coreQuestion: topic,
        keyFacts: cards.slice(1, 5).map((card) => card.title)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    const friendly = /bad_alloc|GGML_ASSERT|terminated|out of memory/i.test(message)
      ? "Ollama 메모리가 부족해 생성이 중단됐습니다. Ollama를 재시작하고 다른 프로그램을 닫은 뒤 다시 시도하세요."
      : message;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
