import { NextRequest, NextResponse } from "next/server";
import { buildPlannerPrompt } from "../../lib/ai/planner";

type CardType = "hook" | "reason" | "food" | "comparison" | "howto" | "recipe" | "warning" | "closing";
type RawCard = { type?: CardType; title?: string; body?: string; details?: string[]; goodItems?: string[]; cautionItems?: string[]; recipeSteps?: string[]; imageKeyword?: string; badge?: string; sourceNote?: string; imageSearchQuery?: string; };

const ALLOWED_TYPES: CardType[] = ["hook", "reason", "food", "comparison", "howto", "recipe", "warning", "closing"];

function extractJson(text: string) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callOllama(prompt: string, numPredict = 900) {
  const base = (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, "");
  const model = process.env.OLLAMA_MODEL || "gemma3:4b";
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
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
          keep_alive: "5m",
          options: { temperature: 0.3, num_ctx: 2048, num_predict: numPredict, num_batch: 128 }
        })
      });
      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Ollama 호출에 실패했습니다.");
      }
      const data = await response.json();
      return extractJson(String(data.response || ""));
    } catch (error) {
      lastError = error;
      if (attempt === 1) await new Promise(resolve => setTimeout(resolve, 1200));
    } finally {
      clearTimeout(timeout);
    }
  }

  if (lastError instanceof Error && lastError.name === "AbortError") {
    throw new Error("AI 응답이 2분 안에 끝나지 않았습니다. Ollama를 재시작한 뒤 다시 시도하세요.");
  }
  if (lastError instanceof TypeError) {
    throw new Error("Ollama 연결에 실패했습니다. Ollama 앱과 localhost:11434를 확인하세요.");
  }
  throw lastError instanceof Error ? lastError : new Error("AI 생성에 실패했습니다.");
}

function cleanList(value: unknown, max = 4) { return Array.isArray(value) ? value.map(String).map(v => v.trim()).filter(Boolean).slice(0, max) : []; }
function trimCardTitle(value: string) { const title = value.replace(/\s+/g, " ").trim(); return title.length > 42 ? `${title.slice(0, 41).trim()}…` : title; }
function hasNaturalBridge(text: string) { return /(다음|그렇다면|여기서|이제|반면|먼저|중요한 건|구분|확인해|살펴보)/.test(text); }
function normalizeCard(card: RawCard, index: number) {
  const fallbackTypes: CardType[] = ["hook", "reason", "food", "comparison", "recipe", "closing"];
  const type = ALLOWED_TYPES.includes(card.type as CardType) ? (card.type as CardType) : fallbackTypes[index];
  return { type, title: trimCardTitle(String(card.title || `카드 ${index + 1}`)), body: String(card.body || "").replace(/\s+/g, " ").trim(), details: cleanList(card.details, 4), goodItems: cleanList(card.goodItems, 4), cautionItems: cleanList(card.cautionItems, 4), recipeSteps: cleanList(card.recipeSteps, 4), imageKeyword: String(card.imageKeyword || "checklist").trim(), badge: String(card.badge || (index === 0 ? "꼭 확인하세요" : `${index + 1}/6`)).trim(), sourceNote: String(card.sourceNote || "일반적인 건강·영양 정보 요약").trim(), imageSearchQuery: String(card.imageSearchQuery || card.imageKeyword || "healthy lifestyle").trim() };
}

function baseRules(topic: string, category: string, audience: string) {
  const food = /(음식|식단|메뉴|반찬|간식|레시피|브로콜리|키위|샐러드|철분|변비|다이어트|영양|임산부)/.test(`${topic} ${category}`);
  return `주제: ${topic}\n카테고리: ${category}\n대상: ${audience}\n쉬운 한국어, 과장·치료 보장·근거 없는 수치 금지. 본문은 카드당 2~3문장. ${food ? "음식은 식재료 나열 대신 맛있는 완성 메뉴를 우선하고, 레시피에는 재료·조리시간·3단계 조리법을 넣으세요." : "구체적인 행동과 주의점을 제시하세요."}`;
}

async function generateInParts(topic: string, category: string, audience: string) {
  const rules = baseRules(topic, category, audience);
  const first = await callOllama(`${rules}\n\n1~3장만 JSON으로 작성하세요.\n1장 hook, 2장 reason, 3장 food. 카드 1~2 본문 끝에 다음 장 연결 문장을 넣으세요.\nJSON 형식: {"planner":{"target":"","intent":"","questions":[""],"hook":"","story":["","","","","",""]},"cards":[{"type":"hook","title":"","body":"","details":[],"goodItems":[],"cautionItems":[],"recipeSteps":[],"imageKeyword":"","badge":"","sourceNote":"일반적인 건강·영양 정보 요약","imageSearchQuery":""}]}`, 850);
  const firstCards = Array.isArray(first.cards) ? first.cards.slice(0, 3) : [];
  if (firstCards.length !== 3) throw new Error("AI가 앞부분 3장을 완성하지 못했습니다. 다시 생성하세요.");

  const summary = firstCards.map((c: RawCard, i: number) => `${i + 1}장 ${c.title || ""}: ${c.body || ""}`).join("\n");
  const second = await callOllama(`${rules}\n이미 작성된 앞부분:\n${summary}\n\n4~6장과 캡션·해시태그만 JSON으로 작성하세요.\n4장 comparison(goodItems/cautionItems 각각 2개 이상), 5장 recipe(details에 재료와 조리시간, recipeSteps 3개 이상), 6장 closing.\nJSON 형식: {"cards":[{"type":"comparison","title":"","body":"","details":[],"goodItems":[],"cautionItems":[],"recipeSteps":[],"imageKeyword":"","badge":"","sourceNote":"일반적인 건강·영양 정보 요약","imageSearchQuery":""}],"caption":"4~6문장","hashtags":["#태그"]}`, 950);
  const secondCards = Array.isArray(second.cards) ? second.cards.slice(0, 3) : [];
  if (secondCards.length !== 3) throw new Error("AI가 뒷부분 3장을 완성하지 못했습니다. 다시 생성하세요.");
  return { planner: first.planner || {}, cards: [...firstCards, ...secondCards], caption: second.caption || "", hashtags: second.hashtags || [], review: {} };
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
    try { const response = await fetch(`${base}/api/tags`, { cache: "no-store", signal: AbortSignal.timeout(7000) }); if (!response.ok) throw new Error(); return NextResponse.json({ ok: true }); }
    catch { return NextResponse.json({ error: process.env.VERCEL && /127\.0\.0\.1|localhost/.test(base) ? "Vercel에서는 PC의 localhost Ollama에 직접 연결할 수 없습니다." : "Ollama 연결에 실패했습니다." }, { status: 503 }); }
  }
  if (!topic) return NextResponse.json({ error: "주제를 입력하세요." }, { status: 400 });

  const prompt = buildPlannerPrompt({ topic, category, mode, audience, commercialBrief });
  if (body.action === "prepare") return NextResponse.json({ prompt, model: process.env.OLLAMA_MODEL || "gemma3:4b" });

  try {
    const result = body.action === "finalize" ? extractJson(String(body.rawResponse || "")) : await generateInParts(topic, category, audience);
    const rawCards: RawCard[] = Array.isArray(result.cards) ? result.cards.slice(0, 6) : [];
    if (rawCards.length !== 6) throw new Error("AI가 6장의 카드를 완성하지 못했습니다. 다시 생성하세요.");
    const cards = rawCards.map(normalizeCard);
    const comparison = cards.find(c => c.type === "comparison");
    const recipe = cards.find(c => c.type === "recipe");
    if (comparison && comparison.goodItems.length < 2) comparison.goodItems = ["균형 잡힌 선택", "개인 상태에 맞춘 선택"];
    if (comparison && comparison.cautionItems.length < 2) comparison.cautionItems = ["과도한 섭취", "증상이 있는데 무리하기"];
    if (recipe && recipe.recipeSteps.length < 3) recipe.recipeSteps = ["재료를 준비합니다.", "간단하게 조리합니다.", "개인 상태에 맞게 양을 조절합니다."];

    const allText = cards.map(c => [c.title, c.body, ...c.details, ...c.goodItems, ...c.cautionItems, ...c.recipeSteps].join(" ")).join(" ");
    const riskyWords = ["완치", "치료됩니다", "무조건", "100%", "해독", "기적", "즉시 낫"];
    const riskyCount = riskyWords.filter(word => allText.includes(word)).length;
    const concreteCards = cards.filter(c => c.details.length >= 2 || c.goodItems.length >= 2 || c.recipeSteps.length >= 3).length;
    const duplicateTitles = cards.length - new Set(cards.map(c => c.title.replace(/\s/g, ""))).size;
    const bridgeCards = cards.slice(0, 5).filter(c => hasNaturalBridge(c.body)).length;
    const conciseCards = cards.filter(c => c.body.length > 0 && c.body.length <= 150).length;
    const score = Math.max(70, Math.min(98, 78 + concreteCards * 2 + Math.min(bridgeCards, 5) + Math.floor(conciseCards / 2) - riskyCount * 8 - duplicateTitles * 4));

    return NextResponse.json({
      caption: ["product", "review", "compare", "event"].includes(mode) ? `${String(commercialBrief.disclosure || "광고·협찬 콘텐츠")}\n\n${String(result.caption || "")}${commercialBrief.purchaseLink ? `\n\n구매 안내: ${String(commercialBrief.purchaseLink)}` : ""}` : String(result.caption || ""),
      hashtags: cleanList(result.hashtags, 12), cards,
      quality: { score, strengths: ["6장 분할 생성", "구체적인 실천 방법", "주의 상황 포함"], checks: ["첫 장 훅", "카드 간 연결", "중복 내용", "과장 표현", "본문 길이", "안전 문구"], metrics: { hook: Math.max(70, Math.min(98, 82 + (cards[0].title.length >= 12 ? 6 : 0) + (cards[0].body.length >= 25 ? 5 : 0) - riskyCount * 6)), flow: Math.max(70, Math.min(98, 76 + bridgeCards * 3)), readability: Math.max(70, Math.min(98, 78 + conciseCards * 2)), safety: Math.max(60, 98 - riskyCount * 14), uniqueness: Math.max(65, 98 - duplicateTitles * 12) }, improvements: score >= 88 ? ["바로 캐러셀 패키지로 제작해도 좋은 수준입니다."] : ["필요하면 카드별 AI 수정으로 문장을 다듬으세요."] },
      planSummary: { target: String(result?.planner?.target || audience), intent: String(result?.planner?.intent || "정보 탐색"), questions: cleanList(result?.planner?.questions, 5), hook: String(result?.planner?.hook || cards[0]?.title || topic), story: cleanList(result?.planner?.story, 6), contentKind: String(result?.planner?.contentKind || ""), coreQuestion: String(result?.planner?.coreQuestion || result?.planner?.questions?.[0] || ""), keyFacts: cleanList(result?.planner?.keyFacts, 4) }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "생성 중 오류가 발생했습니다.";
    const friendly = /bad_alloc|GGML_ASSERT|terminated|out of memory/i.test(message) ? "Ollama 메모리가 부족해 생성이 중단됐습니다. Ollama를 재시작하고 다른 프로그램을 닫은 뒤 다시 시도하세요." : message;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
