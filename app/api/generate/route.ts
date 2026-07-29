import { NextRequest, NextResponse } from "next/server";
import { buildPlannerPrompt } from "../../lib/ai/planner";

type CardType =
  | "hook"
  | "reason"
  | "food"
  | "comparison"
  | "howto"
  | "recipe"
  | "warning"
  | "closing";

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

const ALLOWED_TYPES: CardType[] = [
  "hook", "reason", "food", "comparison",
  "howto", "recipe", "warning", "closing"
];

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOllama(prompt: string) {
  const base = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "gemma3:4b";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000);

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
          temperature: 0.35,
          num_ctx: 4096,
          num_predict: 2600
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
      throw new Error("AI 생성 시간이 5분을 넘었습니다. 다른 프로그램을 닫고 다시 시도하세요.");
    }
    if (error instanceof TypeError) {
      throw new Error("Ollama 연결에 실패했습니다. Ollama 앱이 실행 중인지 확인하세요.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function cleanList(value: unknown, max = 4) {
  if (!Array.isArray(value)) return [];
  return value.map(String).map(v => v.trim()).filter(Boolean).slice(0, max);
}

function trimCardTitle(value: string) {
  const title = value.replace(/\s+/g, " ").trim();
  return title.length > 42 ? `${title.slice(0, 41).trim()}…` : title;
}

function hasNaturalBridge(text: string) {
  return /(다음|그렇다면|여기서|이제|반면|먼저|중요한 건|구분|확인해|살펴보)/.test(text);
}

function normalizeCard(card: RawCard, index: number) {
  const fallbackTypes: CardType[] = [
    "hook", "reason", "food", "comparison",
    "howto", "recipe", "warning", "closing"
  ];
  const type = ALLOWED_TYPES.includes(card.type as CardType)
    ? (card.type as CardType)
    : fallbackTypes[index];

  return {
    type,
    title: trimCardTitle(String(card.title || `카드 ${index + 1}`)),
    body: String(card.body || "").replace(/\s+/g, " ").trim(),
    details: cleanList(card.details, 4),
    goodItems: cleanList(card.goodItems, 4),
    cautionItems: cleanList(card.cautionItems, 4),
    recipeSteps: cleanList(card.recipeSteps, 4),
    imageKeyword: String(card.imageKeyword || "checklist").trim(),
    badge: String(card.badge || (index === 0 ? "꼭 확인하세요" : `${index + 1}/8`)).trim(),
    sourceNote: String(card.sourceNote || "일반적인 건강·영양 정보 요약").trim(),
    imageSearchQuery: String(card.imageSearchQuery || card.imageKeyword || "healthy lifestyle").trim()
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const topic = String(body.topic || "").trim();
  const category = String(body.category || "건강");
  const mode = String(body.mode || "auto");
  const audience = String(body.audience || "일반 성인");
  const commercialBrief = body.commercialBrief && typeof body.commercialBrief === "object" ? body.commercialBrief : {};

  if (!topic) {
    return NextResponse.json({ error: "주제를 입력하세요." }, { status: 400 });
  }

  const prompt = buildPlannerPrompt({ topic, category, mode, audience, commercialBrief });

  try {
    const result = await callOllama(prompt);
    const rawCards: RawCard[] = Array.isArray(result.cards) ? result.cards.slice(0, 8) : [];

    if (rawCards.length !== 8) {
      throw new Error("AI가 8장의 카드를 완성하지 못했습니다. 다시 생성하세요.");
    }

    const cards = rawCards.map(normalizeCard);
    const comparison = cards.find(c => c.type === "comparison");
    const recipe = cards.find(c => c.type === "recipe");

    if (comparison && comparison.goodItems.length < 2) {
      comparison.goodItems = ["균형 잡힌 선택", "개인 상태에 맞춘 선택"];
    }
    if (comparison && comparison.cautionItems.length < 2) {
      comparison.cautionItems = ["과도한 섭취", "증상이 있는데 무리하기"];
    }
    if (recipe && recipe.recipeSteps.length < 3) {
      recipe.recipeSteps = ["재료를 준비합니다.", "간단하게 조리합니다.", "개인 상태에 맞게 양을 조절합니다."];
    }

    const allText = cards
      .map(c => [c.title, c.body, ...c.details, ...c.goodItems, ...c.cautionItems, ...c.recipeSteps].join(" "))
      .join(" ");

    const riskyWords = ["완치", "치료됩니다", "무조건", "100%", "해독", "기적", "즉시 낫"];
    const riskyCount = riskyWords.filter(word => allText.includes(word)).length;
    const concreteCards = cards.filter(
      c => c.details.length >= 2 || c.goodItems.length >= 2 || c.recipeSteps.length >= 3
    ).length;
    const duplicateTitles =
      cards.length - new Set(cards.map(c => c.title.replace(/\s/g, ""))).size;
    const bridgeCards = cards.slice(0, 7).filter(c => hasNaturalBridge(c.body)).length;
    const conciseCards = cards.filter(c => c.body.length > 0 && c.body.length <= 150).length;
    const score = Math.max(
      70,
      Math.min(
        98,
        78 + concreteCards * 2 + Math.min(bridgeCards, 5) + Math.floor(conciseCards / 2)
          - riskyCount * 8 - duplicateTitles * 4
      )
    );

    return NextResponse.json({
      caption: ["product", "review", "compare", "event"].includes(mode)
        ? `${String(commercialBrief.disclosure || "광고·협찬 콘텐츠")}\n\n${String(result.caption || "")}${commercialBrief.purchaseLink ? `\n\n구매 안내: ${String(commercialBrief.purchaseLink)}` : ""}`
        : String(result.caption || ""),
      hashtags: cleanList(result.hashtags, 12),
      cards,
      quality: {
        score,
        strengths: cleanList(result?.review?.strengths, 4).length
          ? cleanList(result.review.strengths, 4)
          : ["첫 장 훅 명확화", "카드 간 자연스러운 연결", "구체적인 실천 방법", "주의 상황 포함"],
        checks: cleanList(result?.review?.checks, 6).length
          ? cleanList(result.review.checks, 6)
          : ["첫 장 훅", "카드 간 연결", "중복 내용", "과장 표현", "본문 길이", "안전 문구"],
        metrics: {
          hook: Math.max(70, Math.min(98, 82 + (cards[0].title.length >= 12 ? 6 : 0) + (cards[0].body.length >= 25 ? 5 : 0) - riskyCount * 6)),
          flow: Math.max(70, Math.min(98, 76 + bridgeCards * 3)),
          readability: Math.max(70, Math.min(98, 78 + conciseCards * 2)),
          safety: Math.max(60, 98 - riskyCount * 14),
          uniqueness: Math.max(65, 98 - duplicateTitles * 12)
        },
        improvements: [
          ...(bridgeCards < 4 ? ["카드 끝의 다음 장 연결 문장을 조금 더 강화하세요."] : []),
          ...(conciseCards < 6 ? ["본문이 긴 카드는 핵심 두 문장으로 줄이는 것이 좋습니다."] : []),
          ...(duplicateTitles > 0 ? ["비슷한 카드 제목을 서로 다른 질문으로 바꾸세요."] : []),
          ...(riskyCount > 0 ? ["과장되거나 단정적인 건강 표현을 완화하세요."] : []),
          ...(score >= 88 ? ["바로 캐러셀 패키지로 제작해도 좋은 수준입니다."] : [])
        ].slice(0, 4)
      },
      planSummary: {
        target: String(result?.planner?.target || audience),
        intent: String(result?.planner?.intent || "정보 탐색"),
        questions: cleanList(result?.planner?.questions, 5),
        hook: String(result?.planner?.hook || cards[0]?.title || topic),
        story: cleanList(result?.planner?.story, 8),
        contentKind: String(result?.planner?.contentKind || ""),
        coreQuestion: String(result?.planner?.coreQuestion || result?.planner?.questions?.[0] || ""),
        keyFacts: cleanList(result?.planner?.keyFacts, 4)
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "생성 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
