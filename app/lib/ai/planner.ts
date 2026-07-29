export type PlannerResult = {
  target: string;
  intent: string;
  questions: string[];
  hook: string;
  story: string[];
  contentKind: string;
  coreQuestion: string;
  keyFacts: string[];
};

export function buildPlannerPrompt(input: {
  topic: string;
  category: string;
  mode: string;
  audience: string;
  commercialBrief?: {
    productName?: string; brandName?: string; price?: string; purchaseLink?: string;
    features?: string; reviewNotes?: string; compareTarget?: string; eventBenefit?: string;
    campaignGoal?: string; disclosure?: string;
  };
}) {
  const { topic, category, mode, audience, commercialBrief = {} } = input;
  const commercialMode = ["product", "review", "compare", "event"].includes(mode);
  const foodFocused = /(음식|식단|메뉴|반찬|간식|레시피|브로콜리|키위|샐러드|철분|변비|다이어트|영양|임산부)/.test(`${topic} ${category} ${mode}`);
  const modeGuide = mode === "product"
    ? "문제 제기 → 필요성 → 검증된 특징 → 사용 방법 → 추천 대상 → 구매 안내 순서의 제품 소개형"
    : mode === "review"
      ? "실제 사용 맥락 → 좋았던 점 → 아쉬운 점 → 추천 대상과 비추천 대상을 모두 밝히는 균형 잡힌 후기형"
      : mode === "compare"
        ? "동일한 기준으로 양쪽을 비교하고 누구에게 어떤 선택이 맞는지 설명하는 비교형"
        : mode === "event"
          ? "혜택 → 기간 → 참여 방법 → 조건과 유의사항 → 행동 유도의 이벤트형"
          : "정보 제공형";
  const foodContext = foodFocused ? `
음식·식단 콘텐츠 특별 규칙:
- 단순히 “브로콜리를 먹으세요”, “키위를 드세요”, “샐러드를 추천합니다”처럼 식재료 이름만 나열하지 않습니다.
- 독자가 실제로 맛있게 만들어 먹고 싶도록 완성된 메뉴명과 조리 아이디어를 우선합니다.
- 건강식이라는 이유로 맛없는 생채소·무가당 샐러드만 반복 추천하지 않습니다.
- 메뉴는 한국에서 쉽게 구할 수 있는 재료로 만들고, 현실적인 한 끼·반찬·간식 형태로 제안합니다.
- 예: 브로콜리 치즈구이, 소고기 시금치 덮밥, 골드키위 그릭요거트볼, 연어 아보카도 덮밥, 두부 계란찜, 새우 토마토 파스타처럼 구체적으로 씁니다.
- 맛을 살리는 요소(치즈, 참깨, 들깨, 달걀, 소고기, 요거트, 견과류, 간장·레몬·올리브유 소량 등)를 적절히 활용하되 건강 주제와 대상 독자에 맞춥니다.
- recipe 카드에는 메뉴명, 준비 재료 3~6개, 예상 조리시간, 3단계 이상의 실제 조리법을 넣습니다.
- food 카드에는 식재료 효능 설명보다 “어떤 맛있는 메뉴로 먹을지”를 먼저 보여줍니다.
- 임산부·건강 대상이면 덜 익힌 달걀·고기·생선, 비살균 유제품, 과도한 당·나트륨 등 대상별 주의점을 자연스럽게 반영합니다.
- 특정 식품 하나가 증상을 치료한다고 단정하지 않습니다.
` : "";
  const commercialContext = commercialMode ? `
광고 콘텐츠 필수 정보:
- 제품·서비스명: ${commercialBrief.productName || "미입력"}
- 브랜드명: ${commercialBrief.brandName || "미입력"}
- 가격·혜택: ${commercialBrief.price || "미입력"}
- 구매 링크: ${commercialBrief.purchaseLink || "미입력"}
- 검증된 특징: ${commercialBrief.features || "미입력"}
- 실제 사용 메모: ${commercialBrief.reviewNotes || "미입력"}
- 비교 대상·기준: ${commercialBrief.compareTarget || "미입력"}
- 이벤트 정보: ${commercialBrief.eventBenefit || "미입력"}
- 광고 목적: ${commercialBrief.campaignGoal || "판매 전환"}
- 광고 표시: ${commercialBrief.disclosure || "광고·협찬 콘텐츠"}
` : "";
  return `
당신은 한국 인스타그램 콘텐츠 전문 기획자, 작가, 검수자입니다.
바로 카드 문구부터 쓰지 말고 반드시 먼저 독자의 검색 의도와 궁금증을 분석한 뒤 6장 스토리를 설계하세요.

카테고리: ${category}
주제: ${topic}
콘텐츠 모드: ${mode} (${modeGuide})
사용자가 지정한 대상 독자: ${audience}
${commercialContext}
${foodContext}

1단계 AI PLANNER
- 실제로 이 주제를 궁금해할 핵심 타겟을 한 문장으로 정합니다.
- 검색 의도를 한 문장으로 정합니다.
- 독자가 가장 궁금해할 질문을 3~5개 만듭니다.
- 과장되지 않으면서도 자연스럽고 구체적인 대표 훅을 만듭니다.
- 6장 전체의 역할과 흐름을 서로 겹치지 않게 설계합니다.

2단계 AI WRITER — 이탈 방지형 스토리 작성
- Planner 결과를 그대로 사용해 6장의 카드 문구를 작성합니다.
- 제목은 어색한 명사 나열을 피하고 자연스러운 한국어 문장으로 씁니다.
- 한 장에 한 가지 메시지만 전달하고, 앞 카드의 답이 다음 카드로 자연스럽게 이어지게 합니다.
- 매 장의 첫 문장은 독자가 즉시 이해할 수 있는 핵심 문장으로 시작합니다.
- 1~5장은 마지막 문장에 다음 장이 궁금해지는 짧고 자연스러운 연결 문장을 넣습니다.
- 단, “충격”, “소름”, “절대”, “안 보면 손해” 같은 낚시성 표현은 사용하지 않습니다.
- 본문은 모바일에서 3초 안에 읽을 수 있도록 짧게 쓰고, 어려운 용어는 즉시 풀어 씁니다.
- 같은 결론을 반복하지 말고 정보가 한 단계씩 깊어지게 만듭니다.

카드별 역할:
- 1장 hook: 대상과 얻을 이익이 분명한 제목 + “무엇이 달라지는지” 예고
- 2장 reason: 독자가 가장 궁금해하는 질문을 먼저 제시하고 짧게 답변
- 3장 food: 첫 번째 핵심 정보와 구체적인 완성 메뉴 예시. 음식 주제라면 식재료 나열 대신 맛있는 메뉴명과 먹는 장면을 제시
- 4장 comparison: 헷갈리는 두 선택이나 좋은 경우/주의할 경우 비교
- 5장 recipe: 실제 적용 가능한 맛있는 메뉴 1개를 정하고 재료·조리시간·3단계 이상의 조리법을 구체적으로 제시하며 필요한 주의사항도 함께 정리
- 6장 closing: 핵심 3가지를 요약하고 저장·공유를 자연스럽게 유도

이탈 방지 규칙:
- 1장 제목은 2줄 안에 들어갈 정도로 간결하고, 주제·대상·핵심 이익을 포함합니다.
- 2장부터는 “그렇다면 무엇을 해야 할까요?”, “여기서 가장 중요한 건”, “다음 기준으로 구분해 보세요”처럼 문맥에 맞는 전환을 사용합니다.
- 모든 카드 제목은 서로 다른 질문이나 답을 담당해야 합니다.
- 추상적인 조언보다 숫자 없는 구체적 행동, 상황, 예시를 우선합니다.
- 6장까지 읽어야만 핵심 정리가 완성되는 점진적 구조를 만듭니다.

3단계 AI REVIEWER
- 제목 어색함, 내용 중복, 과장 표현, 근거 없는 수치, 건강·임신 안전 문구를 스스로 점검합니다.

광고 콘텐츠 추가 규칙:
- 제품·후기·비교·이벤트 모드에서는 입력된 제품 정보만 사실로 사용합니다.
- 입력되지 않은 성분, 인증, 판매량, 만족도, 체험 후기, 할인 조건을 만들어내지 않습니다.
- 후기형은 실제 사용 메모가 없으면 개인 경험처럼 쓰지 말고 “제품 정보 기준”이라고 명확히 표현합니다.
- 비교형은 비교 대상과 동일한 기준이 입력된 경우에만 우열을 단정합니다.
- 건강 관련 제품은 치료·예방·효과 보장 표현을 사용하지 않습니다.
- 캡션 첫부분 또는 마지막에 광고 표시 문구를 자연스럽게 포함합니다.
- 마지막 카드는 가격·혜택·구매 방법을 명확히 정리하되 과도한 압박 문구를 쓰지 않습니다.

공통 규칙:
- 쉬운 한국어를 사용합니다.
- 카드 제목은 자연스럽고 구체적으로 작성합니다.
- 본문은 2~3문장 이내로 작성합니다.
- 각 문장은 짧게 쓰고 불필요한 서론을 없앱니다.
- 같은 내용을 반복하지 않습니다.
- 카드 1~5의 끝에는 다음 카드로 이어지는 자연스러운 전환을 포함합니다.
- 완치, 치료 보장, 해독, 무조건, 100% 같은 과장 표현을 쓰지 않습니다.
- 임신·약·보충제는 임의 복용이나 중단을 지시하지 않습니다.
- 확실하지 않은 수치와 연구 결과를 만들지 않습니다.
- 개인차와 의료진 상담이 필요한 상황을 자연스럽게 포함합니다.
- comparison은 goodItems와 cautionItems를 각각 2개 이상 작성합니다.
- recipe는 recipeSteps를 3개 이상 작성하고, details에 재료와 조리시간을 포함합니다.
- 음식 주제의 카드 제목에는 가능하면 완성된 메뉴명을 사용하고 “채소 섭취”, “건강 샐러드” 같은 추상적인 제목을 피합니다.
- imageKeyword는 다음 중 하나만 사용합니다:
pregnant, water, food, walk, sleep, doctor, medicine, warning, heart, checklist,
baby, fruit, exercise, hospital, calendar, broccoli, kiwi, meal, recipe, compare,
skin, sun, pet, protein, vegetables

JSON만 출력하세요:
{
  "planner": {
    "target": "핵심 타겟",
    "intent": "검색 의도",
    "questions": ["질문1", "질문2", "질문3"],
    "hook": "자연스럽고 구체적인 대표 훅",
    "story": ["1장 역할", "2장 역할", "3장 역할", "4장 역할", "5장 역할", "6장 역할"],
    "contentKind": "food 또는 symptom 또는 lifestyle",
    "coreQuestion": "독자가 가장 궁금해할 질문",
    "keyFacts": ["핵심 사실 1", "핵심 사실 2", "핵심 사실 3"]
  },
  "caption": "도입, 핵심 요약, 행동 유도를 포함한 자연스러운 캡션 4~6문장",
  "hashtags": ["#태그1", "#태그2"],
  "cards": [
    {
      "type": "hook",
      "title": "",
      "body": "",
      "details": [],
      "goodItems": [],
      "cautionItems": [],
      "recipeSteps": [],
      "imageKeyword": "",
      "badge": "",
      "sourceNote": "일반적인 건강·영양 정보 요약",
      "imageSearchQuery": "구체적인 영어 이미지 검색 문장"
    }
  ],
  "review": {
    "strengths": ["구체적인 실천 방법", "주의 상황 포함"],
    "checks": ["제목 자연스러움", "첫 장 훅의 명확성", "카드 간 연결", "내용 중복", "과장 표현", "임신·약물 안전 문구", "근거 없는 수치"]
  }
}
`;
}
