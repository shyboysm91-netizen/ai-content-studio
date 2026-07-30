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
  const commercial = ["product", "review", "compare", "event"].includes(mode);
  const commercialInfo = commercial
    ? `\n제품:${commercialBrief.productName || "미입력"}, 브랜드:${commercialBrief.brandName || "미입력"}, 가격:${commercialBrief.price || "미입력"}, 특징:${commercialBrief.features || "미입력"}, 후기:${commercialBrief.reviewNotes || "미입력"}, 비교:${commercialBrief.compareTarget || "미입력"}, 혜택:${commercialBrief.eventBenefit || "미입력"}. 없는 사실은 만들지 마세요.`
    : "";

  const audienceRule = audience === "일반 성인"
    ? "임신·태아·아기 이야기는 넣지 마세요. 성인의 피로, 집중력, 일상 건강 관점으로 설명하세요."
    : audience === "임산부"
      ? "임산부에게 필요한 정보만 다루고 산모와 태아 관련 설명은 정확하고 과장 없이 쓰세요."
      : audience === "초보 보호자"
        ? "보호자가 바로 이해할 수 있도록 쉬운 표현과 관찰 포인트를 중심으로 쓰세요."
        : "바쁜 사람이 바로 실천할 수 있도록 짧고 현실적인 행동을 중심으로 쓰세요.";

  return `한국 인스타그램 정보형 캐러셀 6장을 작성하세요.
주제:${topic} / 카테고리:${category} / 대상:${audience} / 모드:${mode}${commercialInfo}

가장 중요한 규칙:
- ${audienceRule}
- 대상 독자가 카테고리보다 우선입니다.
- 레시피를 만들지 마세요.
- 제목의 질문에 본문이 직접 답해야 합니다.
- 특히 2장은 원인 → 몸의 변화 → 생활 영향 순서로 왜 중요한지 설명하세요.
- 카드 본문은 쉬운 한국어 2문장, 약 55~100자로 작성하세요.
- 근거 없는 숫자, 공포 조장, 완치·치료 보장을 쓰지 마세요.

장별 역할:
1 관심을 끄는 질문
2 왜 중요한가
3 몸에서 일어나는 원리
4 실생활 실천 방법 3개
5 자주 하는 실수와 주의점 3개
6 핵심 요약 3개와 저장 유도

아래 형식 그대로 일반 텍스트로만 출력하세요. JSON과 코드블록은 절대 사용하지 마세요.
[CARD 1]
TITLE: 제목
BODY: 본문
POINTS: 핵심1 | 핵심2

[CARD 2]
TITLE: 제목
BODY: 본문
POINTS: 이유1 | 이유2

[CARD 3]
TITLE: 제목
BODY: 본문
POINTS: 원리1 | 원리2

[CARD 4]
TITLE: 제목
BODY: 본문
POINTS: 실천1 | 실천2 | 실천3

[CARD 5]
TITLE: 제목
BODY: 본문
POINTS: 실수1 | 주의1 | 주의2

[CARD 6]
TITLE: 제목
BODY: 본문
POINTS: 요약1 | 요약2 | 요약3

[CAPTION]
3문장 캡션

[HASHTAGS]
#태그1 #태그2 #태그3 #태그4 #태그5`;
}
