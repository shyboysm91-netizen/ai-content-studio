import { NextRequest, NextResponse } from "next/server";

type CardType =
  | "hook" | "reason" | "food" | "comparison"
  | "howto" | "recipe" | "warning" | "closing";

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
  designTone?: "green" | "pink" | "blue" | "purple" | "orange" | "red";
  visualKeyword?: string;
  layoutStyle?: "standard" | "imageTop" | "compact";
};

const ALLOWED_TYPES: CardType[] = [
  "hook", "reason", "food", "comparison",
  "howto", "recipe", "warning", "closing"
];

const ALLOWED_VISUALS = [
  "pregnant", "water", "food", "walk", "sleep", "doctor", "medicine", "warning",
  "heart", "checklist", "baby", "fruit", "exercise", "hospital", "calendar", "broccoli",
  "kiwi", "meal", "recipe", "compare", "skin", "sun", "pet", "protein", "vegetables"
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
  const timeout = setTimeout(() => controller.abort(), 180_000);

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
        options: { temperature: 0.3, num_ctx: 4096, num_predict: 1300 }
      })
    });

    if (!response.ok) throw new Error((await response.text()) || "Ollama 호출에 실패했습니다.");
    const data = await response.json();
    return extractJson(String(data.response || ""));
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("카드 수정 시간이 3분을 넘었습니다. 다시 시도하세요.");
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

function normalizeCard(raw: RawCard, fallback: RawCard) {
  const type = ALLOWED_TYPES.includes(raw.type as CardType)
    ? raw.type as CardType
    : (fallback.type as CardType);
  const visual = String(raw.imageKeyword || fallback.imageKeyword || "checklist").trim();

  return {
    ...fallback,
    type,
    title: String(raw.title || fallback.title || "").replace(/\s+/g, " ").trim().slice(0, 60),
    body: String(raw.body || fallback.body || "").replace(/\s+/g, " ").trim().slice(0, 240),
    details: cleanList(raw.details ?? fallback.details, 4),
    goodItems: cleanList(raw.goodItems ?? fallback.goodItems, 4),
    cautionItems: cleanList(raw.cautionItems ?? fallback.cautionItems, 4),
    recipeSteps: cleanList(raw.recipeSteps ?? fallback.recipeSteps, 4),
    imageKeyword: ALLOWED_VISUALS.includes(visual) ? visual : String(fallback.imageKeyword || "checklist"),
    visualKeyword: ALLOWED_VISUALS.includes(String(raw.visualKeyword || visual))
      ? String(raw.visualKeyword || visual)
      : String(fallback.visualKeyword || fallback.imageKeyword || "checklist"),
    badge: String(raw.badge || fallback.badge || "핵심 정보").trim().slice(0, 24),
    sourceNote: String(raw.sourceNote || fallback.sourceNote || "일반적인 정보 요약").trim(),
    imageSearchQuery: String(raw.imageSearchQuery || fallback.imageSearchQuery || "healthy lifestyle").trim(),
    designTone: raw.designTone || fallback.designTone,
    layoutStyle: raw.layoutStyle || fallback.layoutStyle
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const topic = String(body.topic || "").trim();
    const category = String(body.category || "건강");
    const audience = String(body.audience || "일반 성인");
    const instruction = String(body.instruction || "더 자연스럽고 읽기 쉽게 수정").trim();
    const index = Number(body.index || 0);
    const currentCard = body.card as RawCard;
    const previousTitle = String(body.previousCard?.title || "없음");
    const nextTitle = String(body.nextCard?.title || "없음");

    if (!currentCard?.title) {
      return NextResponse.json({ error: "수정할 카드가 없습니다." }, { status: 400 });
    }

    const prompt = `
당신은 한국 인스타그램 캐러셀 전문 편집자입니다.
전체 6장 중 ${index + 1}번 카드 한 장만 수정합니다. 다른 카드의 역할과 내용은 바꾸면 안 됩니다.

주제: ${topic || currentCard.title}
카테고리: ${category}
타겟: ${audience}
이전 카드 제목: ${previousTitle}
다음 카드 제목: ${nextTitle}
사용자 수정 지시: ${instruction}

현재 카드 JSON:
${JSON.stringify(currentCard, null, 2)}

수정 규칙:
- 현재 카드의 type과 전체 스토리 역할은 유지합니다.
- 사용자 지시를 가장 우선합니다.
- 제목은 자연스러운 한국어로 24자 안팎, 최대 2줄 분량으로 씁니다.
- 본문은 모바일에서 빠르게 읽도록 2~3문장, 110자 안팎으로 씁니다.
- 이전 카드와 중복하지 않고 다음 카드의 답을 미리 모두 말하지 않습니다.
- 1~5번 카드라면 끝에 다음 장으로 이어지는 자연스러운 문장을 넣습니다.
- 낚시성 표현, 근거 없는 수치, 완치·무조건·100% 같은 표현은 금지합니다.
- 임신·건강·약 관련 내용은 진단이나 복용 지시를 하지 않습니다.
- details/goodItems/cautionItems/recipeSteps는 현재 카드 유형에 필요한 것만 유지하거나 개선합니다.
- 음식·식단 카드라면 식재료 이름만 나열하지 말고 실제로 맛있게 먹을 수 있는 완성 메뉴명으로 바꿉니다.
- recipe 카드라면 details에 재료와 조리시간을 넣고 recipeSteps에 실제 조리 순서를 3단계 이상 작성합니다.
- “브로콜리 먹기”, “키위 먹기”, “샐러드 추천”처럼 맛이 느껴지지 않는 표현 대신 치즈구이·덮밥·요거트볼·계란찜·볶음·파스타처럼 구체적인 조리 형태를 사용합니다.
- imageKeyword는 허용된 기존 키워드 중 하나만 사용합니다.

JSON만 출력하세요:
{
  "card": {
    "type": "${currentCard.type}",
    "title": "",
    "body": "",
    "details": [],
    "goodItems": [],
    "cautionItems": [],
    "recipeSteps": [],
    "imageKeyword": "${currentCard.imageKeyword || "checklist"}",
    "visualKeyword": "${currentCard.visualKeyword || currentCard.imageKeyword || "checklist"}",
    "badge": "",
    "sourceNote": "",
    "imageSearchQuery": ""
  },
  "review": {
    "score": 0,
    "summary": "수정 결과 한 줄 평가"
  }
}`;

    const result = await callOllama(prompt);
    const card = normalizeCard(result.card || {}, currentCard);
    const score = Math.max(70, Math.min(99, Number(result?.review?.score) || 90));

    return NextResponse.json({
      card,
      review: {
        score,
        summary: String(result?.review?.summary || "선택한 카드만 수정했습니다.")
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "카드 수정 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
