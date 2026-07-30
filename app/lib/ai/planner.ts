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

  return `한국 인스타그램 정보형 캐러셀 6장을 JSON으로 작성하세요.
주제:${topic} / 카테고리:${category} / 대상:${audience} / 모드:${mode}${commercialInfo}

규칙:
- 레시피 금지. 제목의 질문에 본문이 직접 답해야 합니다.
- 특히 2장은 왜 중요한지 원인→몸의 변화→생활 영향 순서로 설명하세요.
- 본문은 장당 쉬운 한국어 2문장, 60~110자. 반복·뜬구름 표현 금지.
- 4장은 실천 3개, 5장은 실수·주의 3개, 6장은 핵심 3개.
- 근거 없는 수치, 공포 조장, 완치·치료 보장 금지. 필요하면 전문가 상담 안내.

장별 역할: 1훅 / 2중요한 이유 / 3몸의 원리 / 4실천 / 5실수·주의 / 6요약·저장유도.
그림키워드는 heart,doctor,food,checklist,warning,baby,fruit,exercise,hospital,skin 중 하나.

아래 압축 JSON만 출력하세요. 설명·코드블록 금지.
{"c":[["제목","본문",["핵심"],"heart"],["제목","본문",["이유1","이유2"],"doctor"],["제목","본문",["원리1","원리2"],"heart"],["제목","본문",["실천1","실천2","실천3"],"checklist"],["제목","본문",["실수1","주의1","주의2"],"warning"],["제목","본문",["요약1","요약2","요약3"],"heart"]],"caption":"3문장","tags":["#태그1","#태그2","#태그3","#태그4","#태그5"]}`;
}
