"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { toPng } from "html-to-image";

type CardType =
  | "hook" | "reason" | "food" | "comparison"
  | "howto" | "recipe" | "warning" | "closing";

type Card = {
  type: CardType;
  title: string;
  body: string;
  details: string[];
  goodItems: string[];
  cautionItems: string[];
  recipeSteps: string[];
  imageKeyword: string;
  badge: string;
  sourceNote: string;
  imageSearchQuery: string;
  imageUrl?: string;
  designTone?: "green" | "pink" | "blue" | "purple" | "orange" | "red";
  visualKeyword?: string;
  layoutStyle?: "standard" | "imageTop" | "compact";
};

type ReelScenePlan = {
  scene: number;
  role: string;
  subtitle: string;
  narration: string;
  visual: string;
  duration: number;
};

type Generated = {
  caption: string;
  platformText?: Partial<Record<PlatformKey, PlatformCopy>>;
  hashtags: string[];
  cards: Card[];
  quality?: {
    score: number;
    strengths: string[];
    checks: string[];
    metrics?: {
      hook: number;
      flow: number;
      readability: number;
      safety: number;
      uniqueness: number;
    };
    improvements?: string[];
  };
  planSummary?: {
    target: string;
    intent: string;
    questions: string[];
    hook: string;
    story: string[];
    contentKind: string;
    coreQuestion: string;
    keyFacts: string[];
  };
};

type CommercialBrief = {
  productName: string;
  brandName: string;
  price: string;
  purchaseLink: string;
  features: string;
  reviewNotes: string;
  compareTarget: string;
  eventBenefit: string;
  campaignGoal: string;
  disclosure: string;
  productImageDataUrl: string;
  applyBrandStyle: boolean;
};

type AdvertiserProfile = {
  id: string;
  companyName: string;
  brandName: string;
  contactName: string;
  contactInfo: string;
  memo: string;
  createdAt: string;
  updatedAt: string;
  brief: CommercialBrief;
};

type SavedProject = {
  version: 1;
  savedAt: string;
  category: string;
  mode: string;
  audience: string;
  topic: string;
  commercialBrief?: CommercialBrief;
  generated: Generated;
};

type ContentLibraryItem = {
  id: string;
  title: string;
  category: string;
  mode: string;
  audience: string;
  topic: string;
  createdAt: string;
  updatedAt: string;
  commercialBrief?: CommercialBrief;
  generated: Generated;
};

type PlatformKey = "instagram" | "youtube" | "tiktok";

type PlatformCopy = {
  title: string;
  description: string;
  hashtags: string;
};

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected" | "published";

type ApprovalItem = {
  id: string;
  serverDraftId?: string;
  createdAt: string;
  topic: string;
  platform: PlatformKey;
  status: ApprovalStatus;
  note: string;
  syncMessage?: string;
};

type UploadStatus = "queued" | "scheduled" | "uploading" | "failed" | "published";

type PlatformConnection = {
  connected: boolean;
  label: string;
  detail: string;
};

type UploadQueueItem = {
  id: string;
  createdAt: string;
  scheduledAt: string;
  topic: string;
  platform: PlatformKey;
  status: UploadStatus;
  title: string;
  attempts: number;
  lastError: string;
};

type AutomationLog = {
  id: string;
  createdAt: string;
  topic: string;
  platform: PlatformKey;
  result: "success" | "failed";
  message: string;
};

type BrandPreset = {
  id: string;
  name: string;
  brandName: string;
  tagline: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: "system" | "serif" | "rounded" | "mono";
  watermarkPosition: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  watermarkOpacity: number;
  showBrandName: boolean;
  showTagline: boolean;
  logoDataUrl: string;
};

type ContentMetric = {
  id: string;
  publishedAt: string;
  platform: PlatformKey;
  title: string;
  views: number;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  clicks: number;
};

type SocialAccount = {
  id: string;
  platform: PlatformKey;
  accountName: string;
  handle: string;
  category: string;
  brandPresetId: string;
  isDefault: boolean;
  isActive: boolean;
  memo: string;
};

type AccountAssignment = {
  platform: PlatformKey;
  accountId: string;
};

type OptimizationRecommendation = {
  id: string;
  createdAt: string;
  platform: PlatformKey;
  sourceTopic: string;
  titleSuggestions: string[];
  hashtagSuggestions: string[];
  bestHour: string;
  contentDirection: string;
  reason: string;
};

type DiagnosticItem = {
  id: string;
  label: string;
  status: "ok" | "warning" | "error";
  detail: string;
};


type VisualScene = {
  emoji: string;
  secondary?: string;
  tertiary?: string;
  label: string;
  tone: "green" | "pink" | "blue" | "purple" | "orange" | "red";
};

const VISUALS: Record<string, VisualScene> = {
  pregnant: { emoji: "🤰", secondary: "💗", tertiary: "✨", label: "임신 건강", tone: "pink" },
  water: { emoji: "💧", secondary: "🥤", tertiary: "✨", label: "수분 관리", tone: "blue" },
  food: { emoji: "🥗", secondary: "🍅", tertiary: "🥑", label: "균형 식사", tone: "green" },
  walk: { emoji: "🚶‍♀️", secondary: "🌿", tertiary: "☀️", label: "가벼운 활동", tone: "green" },
  sleep: { emoji: "🌙", secondary: "🛏️", tertiary: "✨", label: "수면", tone: "purple" },
  doctor: { emoji: "👩‍⚕️", secondary: "🩺", tertiary: "💬", label: "전문가 상담", tone: "blue" },
  medicine: { emoji: "💊", secondary: "⏰", tertiary: "✅", label: "복용 확인", tone: "blue" },
  warning: { emoji: "⚠️", secondary: "🩺", tertiary: "☎️", label: "주의 신호", tone: "red" },
  heart: { emoji: "💗", secondary: "🌿", tertiary: "✨", label: "건강 습관", tone: "pink" },
  checklist: { emoji: "📋", secondary: "✅", tertiary: "⏱️", label: "실천 체크", tone: "orange" },
  baby: { emoji: "👶", secondary: "🧸", tertiary: "💗", label: "아기", tone: "pink" },
  fruit: { emoji: "🍎", secondary: "🫐", tertiary: "🥝", label: "과일", tone: "red" },
  exercise: { emoji: "🧘‍♀️", secondary: "💧", tertiary: "🌿", label: "운동", tone: "purple" },
  hospital: { emoji: "🏥", secondary: "🩺", tertiary: "📅", label: "진료 확인", tone: "blue" },
  calendar: { emoji: "📅", secondary: "📦", tertiary: "✅", label: "미리 준비", tone: "orange" },
  broccoli: { emoji: "🥦", secondary: "✨", tertiary: "🌿", label: "브로콜리", tone: "green" },
  kiwi: { emoji: "🥝", secondary: "🥄", tertiary: "✨", label: "키위", tone: "green" },
  meal: { emoji: "🍽️", secondary: "🥚", tertiary: "🥦", label: "한 끼 조합", tone: "purple" },
  recipe: { emoji: "🍳", secondary: "🥦", tertiary: "🥚", label: "간단 레시피", tone: "orange" },
  compare: { emoji: "⚖️", secondary: "✅", tertiary: "⚠️", label: "선택 비교", tone: "green" },
  skin: { emoji: "🧴", secondary: "💧", tertiary: "✨", label: "피부 관리", tone: "purple" },
  sun: { emoji: "☀️", secondary: "🧴", tertiary: "🧢", label: "자외선 관리", tone: "orange" },
  pet: { emoji: "🐶", secondary: "🥣", tertiary: "💗", label: "반려동물", tone: "green" },
  protein: { emoji: "🥚", secondary: "🐟", tertiary: "🫘", label: "단백질 조합", tone: "orange" },
  vegetables: { emoji: "🥦", secondary: "🥕", tertiary: "🍅", label: "채소 조합", tone: "green" }
};

const DEMO: Generated = {
  caption: "브로콜리를 먹는 목적에 따라 조리법과 함께 먹는 음식이 달라질 수 있습니다. 한 가지 식품만으로 증상을 해결하려 하기보다 전체 식사와 개인 상태를 함께 살펴보세요.",
  hashtags: ["#브로콜리", "#건강식단", "#간단레시피", "#건강카드뉴스"],
  quality: {
    score: 91,
    strengths: ["구체적인 음식명", "조리법과 주의점 포함", "과장 표현 없음"],
    checks: ["의학적 치료 표현 점검", "임신·약물 안전 문구 점검", "중복 내용 점검"]
  },
  planSummary: {
    target: "건강한 식사를 쉽게 실천하고 싶은 성인",
    intent: "브로콜리를 실제 식사에 어떻게 활용할지 알고 싶음",
    questions: ["어떻게 조리해야 먹기 편할까?", "무엇과 함께 먹으면 좋을까?", "주의할 점은 무엇일까?"],
    hook: "브로콜리, 그냥 먹기보다 이렇게 준비해 보세요",
    story: ["훅", "추천 이유", "구체적인 조합", "조리법 비교", "보관과 준비", "간단 레시피", "주의사항", "저장 유도"],
    contentKind: "food",
    coreQuestion: "브로콜리를 어떻게 먹어야 실생활에 도움이 될까?",
    keyFacts: ["구체적인 조리법", "함께 먹기 좋은 식품", "개인 상태별 주의"]
  },
  cards: [
    {
      type: "hook", title: "브로콜리, 그냥 먹지 마세요", body: "목적에 맞는 조리법과 조합을 먼저 확인하세요.",
      details: [], goodItems: [], cautionItems: [], recipeSteps: [],
      imageKeyword: "broccoli", badge: "3초 식품 체크", sourceNote: "일반적인 건강·영양 정보 요약", imageSearchQuery: "woman holding fresh broccoli in kitchen"
    },
    {
      type: "reason", title: "왜 자주 추천될까?", body: "식이섬유와 여러 미량영양소를 함께 섭취할 수 있는 채소입니다.",
      details: ["식사 부피를 늘리기 좋음", "다른 단백질 식품과 조합하기 쉬움", "찜·볶음·수프로 활용 가능"],
      goodItems: [], cautionItems: [], recipeSteps: [],
      imageKeyword: "food", badge: "추천 이유", sourceNote: "개인 상태와 전체 식단에 따라 달라질 수 있음", imageSearchQuery: "broccoli healthy meal close up"
    },
    {
      type: "food", title: "이렇게 조합해 보세요", body: "브로콜리를 단독으로 먹기보다 한 끼 식사로 구성해 보세요.",
      details: ["달걀 — 간단한 단백질 보충", "두부 — 부드러운 식감의 한 끼", "닭고기 — 포만감 있는 식사", "파프리카 — 색감과 다양한 채소 섭취"],
      goodItems: [], cautionItems: [], recipeSteps: [],
      imageKeyword: "meal", badge: "추천 조합", sourceNote: "특정 음식 궁합의 치료 효과를 의미하지 않음", imageSearchQuery: "broccoli egg chicken healthy meal"
    },
    {
      type: "comparison", title: "조리법을 비교하세요", body: "영양뿐 아니라 소화 상태와 실제로 꾸준히 먹을 수 있는지도 중요합니다.",
      details: [], goodItems: ["짧게 찌기", "가볍게 볶기", "수프에 넣기"], cautionItems: ["너무 오래 삶기", "소스·소금 과다", "한 번에 과량 섭취"],
      recipeSteps: [], imageKeyword: "broccoli", badge: "추천 vs 주의", sourceNote: "조리 시간과 양은 개인 취향·상태에 맞게 조절", imageSearchQuery: "steamed broccoli cooking kitchen"
    },
    {
      type: "howto", title: "먹기 편하게 준비하기", body: "작게 손질해 냉장 또는 냉동해 두면 식사에 추가하기 쉽습니다.",
      details: ["송이 크기를 비슷하게 자르기", "씻은 뒤 물기 제거", "한 끼 분량으로 나누어 보관"],
      goodItems: [], cautionItems: [], recipeSteps: [],
      imageKeyword: "calendar", badge: "실천 방법", sourceNote: "보관 상태가 의심되면 섭취하지 않기", imageSearchQuery: "meal prep broccoli containers"
    },
    {
      type: "recipe", title: "브로콜리 달걀볶음", body: "바쁜 날 빠르게 만들 수 있는 간단한 조합입니다.",
      details: ["재료: 브로콜리, 달걀, 식용유 소량"], goodItems: [], cautionItems: [],
      recipeSteps: ["브로콜리를 작게 잘라 살짝 익히기", "달걀을 풀어 팬에 넣기", "함께 볶고 간은 약하게 하기"],
      imageKeyword: "recipe", badge: "간단 레시피", sourceNote: "알레르기와 개인 식이 제한 확인", imageSearchQuery: "broccoli scrambled eggs healthy dish"
    },
    {
      type: "warning", title: "이럴 땐 양을 조절하세요", body: "많이 먹는다고 더 좋은 것은 아닙니다.",
      details: ["가스·복부팽만이 심한 경우", "특정 식품 알레르기가 있는 경우", "의료진에게 식이 제한을 안내받은 경우"],
      goodItems: [], cautionItems: [], recipeSteps: [],
      imageKeyword: "warning", badge: "주의", sourceNote: "지속되는 증상은 의료진 상담 필요", imageSearchQuery: "woman stomach discomfort healthy food"
    },
    {
      type: "closing", title: "오늘 한 가지 해보세요", body: "브로콜리를 활용할 가장 쉬운 방법 하나를 골라보세요.",
      details: ["달걀과 볶기", "두부 식사에 곁들이기", "한 끼 분량으로 손질해 두기"],
      goodItems: [], cautionItems: [], recipeSteps: [],
      imageKeyword: "heart", badge: "저장 · 공유", sourceNote: "일반 정보이며 개인 진료를 대신하지 않음", imageSearchQuery: "woman preparing healthy vegetables kitchen"
    }
  ]
};

export default function Home() {
  const [category, setCategory] = useState("임신");
  const [mode, setMode] = useState("auto");
  const [audience, setAudience] = useState("일반 성인");
  const [topic, setTopic] = useState("브로콜리");
  const [commercialBrief, setCommercialBrief] = useState<CommercialBrief>({
    productName: "",
    brandName: "",
    price: "",
    purchaseLink: "",
    features: "",
    reviewNotes: "",
    compareTarget: "",
    eventBenefit: "",
    campaignGoal: "판매 전환",
    disclosure: "광고·협찬 콘텐츠",
    productImageDataUrl: "",
    applyBrandStyle: true
  });
  const [advertisers, setAdvertisers] = useState<AdvertiserProfile[]>([]);
  const [advertiserCompany, setAdvertiserCompany] = useState("");
  const [advertiserContactName, setAdvertiserContactName] = useState("");
  const [advertiserContactInfo, setAdvertiserContactInfo] = useState("");
  const [advertiserMemo, setAdvertiserMemo] = useState("");
  const [advertiserSearch, setAdvertiserSearch] = useState("");
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState("");
  const [generated, setGenerated] = useState<Generated>(DEMO);
  const [contentLibrary, setContentLibrary] = useState<ContentLibraryItem[]>([]);
  const [librarySearch, setLibrarySearch] = useState("");
  const [libraryCategory, setLibraryCategory] = useState("all");
  const [loading, setLoading] = useState(false);
  const [packagingCarousel, setPackagingCarousel] = useState(false);
  const [packagingComplete, setPackagingComplete] = useState(false);
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");
  const [message, setMessage] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState("");
  const [reelCardIndex, setReelCardIndex] = useState(0);
  const [reelPlaying, setReelPlaying] = useState(false);
  const [secondsPerCard, setSecondsPerCard] = useState(3);
  const [transitionSeconds, setTransitionSeconds] = useState(0.6);
  const [reelStoryStyle, setReelStoryStyle] = useState<"retention" | "informative" | "sales">("retention");
  const [renderingReel, setRenderingReel] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [voiceRate, setVoiceRate] = useState(1);
  const [voicePitch, setVoicePitch] = useState(1);
  const [selectedVoiceName, setSelectedVoiceName] = useState("");
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [musicName, setMusicName] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [musicVolume, setMusicVolume] = useState(0.18);
  const [narrationName, setNarrationName] = useState("");
  const [narrationUrl, setNarrationUrl] = useState("");
  const [narrationVolume, setNarrationVolume] = useState(1);
  const [previewSpeaking, setPreviewSpeaking] = useState(false);
  const projectFileRef = useRef<HTMLInputElement | null>(null);
  const musicFileRef = useRef<HTMLInputElement | null>(null);
  const narrationFileRef = useRef<HTMLInputElement | null>(null);
  const productImageFileRef = useRef<HTMLInputElement | null>(null);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const narrationAudioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformKey>("instagram");
  const [lastVideoBlob, setLastVideoBlob] = useState<Blob | null>(null);
  const [lastVideoName, setLastVideoName] = useState("");
  const [copiedField, setCopiedField] = useState("");
  const [telegramSending, setTelegramSending] = useState(false);
  const [telegramStatus, setTelegramStatus] = useState<"unknown" | "ready" | "missing" | "error">("unknown");
  const [approvalNote, setApprovalNote] = useState("");
  const [approvalItems, setApprovalItems] = useState<ApprovalItem[]>([]);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [platformConnections, setPlatformConnections] = useState<Record<PlatformKey, PlatformConnection>>({
    instagram: { connected: false, label: "확인 전", detail: "연결 상태를 확인하세요." },
    youtube: { connected: false, label: "확인 전", detail: "연결 상태를 확인하세요." },
    tiktok: { connected: false, label: "확인 전", detail: "연결 상태를 확인하세요." }
  });
  const [connectionChecking, setConnectionChecking] = useState(false);
  const [executingQueueId, setExecutingQueueId] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [queueFilter, setQueueFilter] = useState<"all" | UploadStatus>("all");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  });
  const [calendarPlatform, setCalendarPlatform] = useState<"all" | PlatformKey>("all");
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [automationTime, setAutomationTime] = useState("09:00");
  const [automationPlatform, setAutomationPlatform] = useState<PlatformKey>("instagram");
  const [automationTopics, setAutomationTopics] = useState("임신 28주 증상\n임산부 철분 섭취\n임신 중 허리 통증\n출산 준비 체크리스트");
  const [automationNextIndex, setAutomationNextIndex] = useState(0);
  const [automationLastRunDate, setAutomationLastRunDate] = useState("");
  const [automationRunning, setAutomationRunning] = useState(false);
  const [automationLogs, setAutomationLogs] = useState<AutomationLog[]>([]);
  const [brandName, setBrandName] = useState("AI Content Studio");
  const [brandTagline, setBrandTagline] = useState("쉽고 정확한 건강 콘텐츠");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#5c6ac4");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#eef0ff");
  const [brandFontFamily, setBrandFontFamily] = useState<BrandPreset["fontFamily"]>("system");
  const [watermarkPosition, setWatermarkPosition] = useState<BrandPreset["watermarkPosition"]>("bottom-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(72);
  const [showBrandName, setShowBrandName] = useState(true);
  const [showBrandTagline, setShowBrandTagline] = useState(false);
  const [brandLogoDataUrl, setBrandLogoDataUrl] = useState("");
  const [brandPresets, setBrandPresets] = useState<BrandPreset[]>([]);
  const [brandPresetName, setBrandPresetName] = useState("");
  const [contentMetrics, setContentMetrics] = useState<ContentMetric[]>([]);
  const [metricPlatform, setMetricPlatform] = useState<PlatformKey>("instagram");
  const [metricTitle, setMetricTitle] = useState("");
  const [metricPublishedAt, setMetricPublishedAt] = useState(() => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  });
  const [metricViews, setMetricViews] = useState(0);
  const [metricLikes, setMetricLikes] = useState(0);
  const [metricComments, setMetricComments] = useState(0);
  const [metricSaves, setMetricSaves] = useState(0);
  const [metricShares, setMetricShares] = useState(0);
  const [metricClicks, setMetricClicks] = useState(0);
  const [metricFilter, setMetricFilter] = useState<"all" | PlatformKey>("all");
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [accountPlatform, setAccountPlatform] = useState<PlatformKey>("instagram");
  const [accountName, setAccountName] = useState("");
  const [accountHandle, setAccountHandle] = useState("");
  const [accountCategory, setAccountCategory] = useState("건강·임신");
  const [accountBrandPresetId, setAccountBrandPresetId] = useState("");
  const [accountMemo, setAccountMemo] = useState("");
  const [accountFilter, setAccountFilter] = useState<"all" | PlatformKey>("all");
  const [selectedAccountByPlatform, setSelectedAccountByPlatform] = useState<Record<PlatformKey, string>>({
    instagram: "",
    youtube: "",
    tiktok: ""
  });
  const [optimizationPlatform, setOptimizationPlatform] = useState<PlatformKey>("instagram");
  const [optimizationTopic, setOptimizationTopic] = useState("");
  const [optimizationResult, setOptimizationResult] = useState<OptimizationRecommendation | null>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<OptimizationRecommendation[]>([]);
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [diagnosticRunning, setDiagnosticRunning] = useState(false);
  const [activeStudioTab, setActiveStudioTab] = useState<
    "create" | "video" | "publish" | "manage" | "system"
  >("create");
  const [selectedCardIndex, setSelectedCardIndex] = useState(0);
  const [cardRewriteInstruction, setCardRewriteInstruction] = useState("");
  const [cardRewriteLoading, setCardRewriteLoading] = useState(false);
  const [cardHistory, setCardHistory] = useState<Record<number, Card[]>>({});
  const [lastRewriteBefore, setLastRewriteBefore] = useState<Card | null>(null);
  const [lastRewriteIndex, setLastRewriteIndex] = useState<number | null>(null);
  const [lastRewriteReview, setLastRewriteReview] = useState<{ score: number; summary: string } | null>(null);
  const [backupImportedAt, setBackupImportedAt] = useState("");
  const backupInputRef = useRef<HTMLInputElement | null>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const exportCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const reelTimerRef = useRef<number | null>(null);

  useEffect(() => {
    async function checkOllama() {
      try {
        const response = await fetch("/api/ollama/status", { cache: "no-store" });
        const data = await response.json().catch(() => null);
        if (response.ok && data?.ok) {
          setStatus("online");
          return;
        }
      } catch {
        // Vercel 서버가 로컬 Ollama에 접근할 수 없으면 브라우저에서 직접 확인합니다.
      }

      try {
        const localResponse = await fetch("http://127.0.0.1:11434/api/tags", { cache: "no-store" });
        const localData = await localResponse.json().catch(() => null);
        const hasModel = Array.isArray(localData?.models)
          && localData.models.some((item: { name?: string }) => String(item?.name || "").startsWith("gemma3:4b"));
        setStatus(localResponse.ok && hasModel ? "online" : "offline");
      } catch {
        setStatus("offline");
      }
    }

    void checkOllama();

    try {
      const raw = localStorage.getItem("ai-content-studio-project");
      if (!raw) return;

      const saved = JSON.parse(raw) as SavedProject;
      if (!saved?.generated?.cards?.length) return;

      setCategory(saved.category || "임신");
      setMode(saved.mode || "auto");
      setAudience(saved.audience || "일반 성인");
      setTopic(saved.topic || "");
      if (saved.commercialBrief) setCommercialBrief((current) => ({ ...current, ...saved.commercialBrief }));
      setGenerated(saved.generated);
      setLastSavedAt(saved.savedAt || "");
      setMessage("이전에 자동 저장한 작업을 불러왔습니다.");
    } catch {
      localStorage.removeItem("ai-content-studio-project");
    }
  }, []);

  useEffect(() => {
    if (!generated.cards.length) return;

    const timer = window.setTimeout(() => {
      const savedAt = new Date().toISOString();
      const project: SavedProject = {
        version: 1,
        savedAt,
        category,
        mode,
        audience,
        topic,
        commercialBrief,
        generated
      };
      localStorage.setItem("ai-content-studio-project", JSON.stringify(project));
      setLastSavedAt(savedAt);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [category, mode, audience, topic, commercialBrief, generated]);

  useEffect(() => {
    if (!reelPlaying || generated.cards.length === 0) {
      if (reelTimerRef.current) window.clearTimeout(reelTimerRef.current);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      setPreviewSpeaking(false);
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current.currentTime = 0;
      }
      return;
    }

    if (voiceEnabled) speakCard(reelCardIndex);

    if (musicAudioRef.current && musicUrl && musicAudioRef.current.paused) {
      musicAudioRef.current.currentTime = 0;
      musicAudioRef.current.volume = musicVolume;
      musicAudioRef.current.play().catch(() => undefined);
    }

    reelTimerRef.current = window.setTimeout(() => {
      setReelCardIndex((current) => {
        const next = current + 1;
        if (next >= generated.cards.length) {
          setReelPlaying(false);
          return 0;
        }
        return next;
      });
    }, secondsPerCard * 1000);

    return () => {
      if (reelTimerRef.current) window.clearTimeout(reelTimerRef.current);
    };
  }, [
    reelPlaying,
    reelCardIndex,
    secondsPerCard,
    generated.cards.length,
    voiceEnabled,
    voiceRate,
    voicePitch,
    selectedVoiceName,
    musicUrl,
    musicVolume
  ]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const koreanFirst = [...voices].sort((a, b) => {
        const aKo = a.lang.toLowerCase().startsWith("ko") ? 0 : 1;
        const bKo = b.lang.toLowerCase().startsWith("ko") ? 0 : 1;
        return aKo - bKo || a.name.localeCompare(b.name);
      });
      setAvailableVoices(koreanFirst);
      setSelectedVoiceName((current) => {
        if (current && koreanFirst.some((voice) => voice.name === current)) return current;
        return koreanFirst.find((voice) => voice.lang.toLowerCase().startsWith("ko"))?.name
          || koreanFirst[0]?.name
          || "";
      });
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  useEffect(() => {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.volume = narrationVolume;
    }
  }, [narrationVolume]);

  const platformCopies = useMemo<Record<PlatformKey, PlatformCopy>>(() => {
    const cleanTopic = topic.trim() || generated.cards[0]?.title || "오늘의 건강 정보";
    const baseCaption = generated.caption.trim()
      || generated.cards.map((card) => card.title).slice(0, 4).join(" · ");
    const uniqueHashtags = Array.from(
      new Set(
        generated.hashtags
          .map((tag) => tag.replace(/^#/, "").trim())
          .filter(Boolean)
      )
    );
    const instagramTags = uniqueHashtags.slice(0, 20).map((tag) => `#${tag}`).join(" ");
    const youtubeTags = Array.from(new Set(["쇼츠", "건강정보", ...uniqueHashtags]))
      .slice(0, 12)
      .map((tag) => `#${tag}`)
      .join(" ");
    const tiktokTags = Array.from(new Set(["건강", "생활정보", ...uniqueHashtags]))
      .slice(0, 8)
      .map((tag) => `#${tag}`)
      .join(" ");

    return {
      instagram: {
        title: cleanTopic.slice(0, 80),
        description: `${baseCaption}\n\n저장해 두고 필요할 때 다시 확인하세요.\n\n${instagramTags}`.trim(),
        hashtags: instagramTags
      },
      youtube: {
        title: `${cleanTopic} #shorts`.slice(0, 100),
        description: `${baseCaption}\n\n※ 개인 상황에 따라 다를 수 있으며 필요한 경우 전문가와 상담하세요.\n\n${youtubeTags}`.trim(),
        hashtags: youtubeTags
      },
      tiktok: {
        title: cleanTopic.slice(0, 80),
        description: `${baseCaption.slice(0, 700)}\n\n${tiktokTags}`.trim(),
        hashtags: tiktokTags
      }
    };
  }, [topic, generated]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-approvals");
      if (saved) setApprovalItems(JSON.parse(saved));
    } catch {
      setApprovalItems([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-approvals", JSON.stringify(approvalItems));
    } catch {
      // 브라우저 저장 실패 시 현재 화면에서는 계속 사용할 수 있습니다.
    }
  }, [approvalItems]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-upload-queue");
      if (saved) setUploadQueue(JSON.parse(saved));
    } catch {
      setUploadQueue([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-upload-queue", JSON.stringify(uploadQueue));
    } catch {}
  }, [uploadQueue]);

  useEffect(() => {
    if (!generated?.cards?.length) {
      setSelectedCardIndex(0);
      return;
    }
    if (selectedCardIndex > generated.cards.length - 1) {
      setSelectedCardIndex(generated.cards.length - 1);
    }
  }, [generated?.cards?.length, selectedCardIndex]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-optimization");
      if (saved) {
        const data = JSON.parse(saved);
        setOptimizationHistory(Array.isArray(data.history) ? data.history : []);
        setOptimizationResult(data.current || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-optimization", JSON.stringify({
        history: optimizationHistory,
        current: optimizationResult
      }));
    } catch {}
  }, [optimizationHistory, optimizationResult]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-accounts");
      if (saved) {
        const data = JSON.parse(saved);
        setSocialAccounts(Array.isArray(data.accounts) ? data.accounts : []);
        setSelectedAccountByPlatform(data.selected || {
          instagram: "",
          youtube: "",
          tiktok: ""
        });
      }
    } catch {
      setSocialAccounts([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-accounts", JSON.stringify({
        accounts: socialAccounts,
        selected: selectedAccountByPlatform
      }));
    } catch {}
  }, [socialAccounts, selectedAccountByPlatform]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-metrics");
      if (saved) {
        const data = JSON.parse(saved);
        setContentMetrics(Array.isArray(data) ? data : []);
      }
    } catch {
      setContentMetrics([]);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-metrics", JSON.stringify(contentMetrics));
    } catch {}
  }, [contentMetrics]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-content-library");
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setContentLibrary(parsed);
    } catch {
      localStorage.removeItem("ai-content-studio-content-library");
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-content-library", JSON.stringify(contentLibrary.slice(0, 50)));
    } catch {
      setMessage("콘텐츠 라이브러리 저장 공간이 부족합니다. 오래된 콘텐츠를 삭제해 주세요.");
    }
  }, [contentLibrary]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-advertisers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setAdvertisers(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-advertisers", JSON.stringify(advertisers));
    } catch {}
  }, [advertisers]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-brand");
      if (saved) {
        const data = JSON.parse(saved);
        setBrandName(data.brandName || "AI Content Studio");
        setBrandTagline(data.tagline || "");
        setBrandPrimaryColor(data.primaryColor || "#5c6ac4");
        setBrandSecondaryColor(data.secondaryColor || "#eef0ff");
        setBrandFontFamily(data.fontFamily || "system");
        setWatermarkPosition(data.watermarkPosition || "bottom-right");
        setWatermarkOpacity(Number(data.watermarkOpacity ?? 72));
        setShowBrandName(data.showBrandName !== false);
        setShowBrandTagline(Boolean(data.showTagline));
        setBrandLogoDataUrl(data.logoDataUrl || "");
        setBrandPresets(Array.isArray(data.presets) ? data.presets : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-brand", JSON.stringify({
        brandName,
        tagline: brandTagline,
        primaryColor: brandPrimaryColor,
        secondaryColor: brandSecondaryColor,
        fontFamily: brandFontFamily,
        watermarkPosition,
        watermarkOpacity,
        showBrandName,
        showTagline: showBrandTagline,
        logoDataUrl: brandLogoDataUrl,
        presets: brandPresets
      }));
    } catch {}
  }, [
    brandName,
    brandTagline,
    brandPrimaryColor,
    brandSecondaryColor,
    brandFontFamily,
    watermarkPosition,
    watermarkOpacity,
    showBrandName,
    showBrandTagline,
    brandLogoDataUrl,
    brandPresets
  ]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ai-content-studio-automation");
      if (saved) {
        const data = JSON.parse(saved);
        setAutomationEnabled(Boolean(data.enabled));
        setAutomationTime(data.time || "09:00");
        setAutomationPlatform(data.platform || "instagram");
        setAutomationTopics(data.topics || "");
        setAutomationNextIndex(Number(data.nextIndex || 0));
        setAutomationLastRunDate(data.lastRunDate || "");
        setAutomationLogs(Array.isArray(data.logs) ? data.logs : []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("ai-content-studio-automation", JSON.stringify({
        enabled: automationEnabled,
        time: automationTime,
        platform: automationPlatform,
        topics: automationTopics,
        nextIndex: automationNextIndex,
        lastRunDate: automationLastRunDate,
        logs: automationLogs.slice(0, 50)
      }));
    } catch {}
  }, [
    automationEnabled,
    automationTime,
    automationPlatform,
    automationTopics,
    automationNextIndex,
    automationLastRunDate,
    automationLogs
  ]);

  const filteredAccounts = useMemo(() => {
    return socialAccounts.filter((account) => accountFilter === "all" || account.platform === accountFilter);
  }, [socialAccounts, accountFilter]);

  const accountSummary = useMemo(() => {
    return (["instagram", "youtube", "tiktok"] as PlatformKey[]).map((platform) => {
      const accounts = socialAccounts.filter((account) => account.platform === platform);
      return {
        platform,
        total: accounts.length,
        active: accounts.filter((account) => account.isActive).length,
        defaultAccount: accounts.find((account) => account.isDefault)
      };
    });
  }, [socialAccounts]);

  const filteredMetrics = useMemo(() => {
    return contentMetrics
      .filter((item) => metricFilter === "all" || item.platform === metricFilter)
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  }, [contentMetrics, metricFilter]);

  const metricTotals = useMemo(() => {
    return filteredMetrics.reduce((total, item) => {
      total.views += item.views;
      total.likes += item.likes;
      total.comments += item.comments;
      total.saves += item.saves;
      total.shares += item.shares;
      total.clicks += item.clicks;
      return total;
    }, { views: 0, likes: 0, comments: 0, saves: 0, shares: 0, clicks: 0 });
  }, [filteredMetrics]);

  const platformMetricSummary = useMemo(() => {
    return (["instagram", "youtube", "tiktok"] as PlatformKey[]).map((platform) => {
      const items = contentMetrics.filter((item) => item.platform === platform);
      const totals = items.reduce((total, item) => {
        total.views += item.views;
        total.engagements += item.likes + item.comments + item.saves + item.shares;
        total.clicks += item.clicks;
        return total;
      }, { views: 0, engagements: 0, clicks: 0 });

      return {
        platform,
        count: items.length,
        views: totals.views,
        engagementRate: totals.views > 0 ? (totals.engagements / totals.views) * 100 : 0,
        clickRate: totals.views > 0 ? (totals.clicks / totals.views) * 100 : 0
      };
    });
  }, [contentMetrics]);

  const bestMetric = useMemo(() => {
    return [...contentMetrics].sort((a, b) => {
      const aRate = a.views > 0 ? ((a.likes + a.comments + a.saves + a.shares) / a.views) * 100 : 0;
      const bRate = b.views > 0 ? ((b.likes + b.comments + b.saves + b.shares) / b.views) * 100 : 0;
      return bRate - aRate;
    })[0];
  }, [contentMetrics]);

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const start = new Date(year, month, 1 - firstDay.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const items = uploadQueue.filter((item) => {
        const itemDate = new Date(item.scheduledAt);
        const itemKey = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}-${String(itemDate.getDate()).padStart(2, "0")}`;
        return itemKey === key && (calendarPlatform === "all" || item.platform === calendarPlatform);
      });

      return {
        date,
        key,
        inMonth: date.getMonth() === month,
        items
      };
    });
  }, [calendarMonth, uploadQueue, calendarPlatform]);

  const selectedCalendarItems = useMemo(() => {
    return uploadQueue
      .filter((item) => {
        const date = new Date(item.scheduledAt);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        return key === selectedCalendarDate && (calendarPlatform === "all" || item.platform === calendarPlatform);
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [uploadQueue, selectedCalendarDate, calendarPlatform]);

  const todayQueueItems = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return uploadQueue.filter((item) => {
      const date = new Date(item.scheduledAt);
      const itemKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      return itemKey === key;
    });
  }, [uploadQueue]);

  const weekQueueItems = useMemo(() => {
    const now = new Date();
    const end = new Date(now);
    end.setDate(now.getDate() + 7);
    return uploadQueue.filter((item) => {
      const time = new Date(item.scheduledAt).getTime();
      return time >= now.getTime() && time <= end.getTime();
    });
  }, [uploadQueue]);

  useEffect(() => {
    if (!automationEnabled) return;

    const check = () => {
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      const timeKey = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      if (
        timeKey === automationTime &&
        automationLastRunDate !== dateKey &&
        !automationRunning
      ) {
        void runAutomationNow("schedule");
      }
    };

    check();
    const timer = window.setInterval(check, 30000);
    return () => window.clearInterval(timer);
  }, [
    automationEnabled,
    automationTime,
    automationLastRunDate,
    automationRunning,
    automationTopics,
    automationNextIndex,
    automationPlatform,
    category,
    mode,
    audience
  ]);

  const theme = useMemo(() => {
    if (category === "임신") return "pregnancy";
    if (category === "반려동물") return "pet";
    if (category === "피부") return "beauty";
    return "health";
  }, [category]);


  const isCommercialMode = ["product", "review", "compare", "event"].includes(mode);

  function handleProductImage(file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage("이미지 파일만 업로드할 수 있습니다.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setMessage("제품 이미지는 8MB 이하로 업로드해 주세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setCommercialBrief((current) => ({ ...current, productImageDataUrl: dataUrl }));
      setMessage("제품 이미지가 카드에 자동 배치되었습니다.");
    };
    reader.onerror = () => setMessage("제품 이미지를 불러오지 못했습니다.");
    reader.readAsDataURL(file);
  }

  function clearProductImage() {
    setCommercialBrief((current) => ({ ...current, productImageDataUrl: "" }));
    if (productImageFileRef.current) productImageFileRef.current.value = "";
    setMessage("제품 이미지를 제거했습니다.");
  }

  function updateCommercialBrief<K extends keyof CommercialBrief>(key: K, value: CommercialBrief[K]) {
    setCommercialBrief((current) => ({ ...current, [key]: value }));
  }

  const filteredLibraryItems = useMemo(() => {
    const query = librarySearch.trim().toLowerCase();
    return contentLibrary.filter((item) => {
      const categoryMatch = libraryCategory === "all" || item.category === libraryCategory;
      const textMatch = !query || [item.title, item.topic, item.category, item.mode, item.audience]
        .join(" ").toLowerCase().includes(query);
      return categoryMatch && textMatch;
    });
  }, [contentLibrary, librarySearch, libraryCategory]);

  const filteredAdvertisers = advertisers.filter((item) => {
    const keyword = advertiserSearch.trim().toLowerCase();
    if (!keyword) return true;
    return [item.companyName, item.brandName, item.brief.productName, item.contactName]
      .join(" ").toLowerCase().includes(keyword);
  });

  function resetAdvertiserForm() {
    setSelectedAdvertiserId("");
    setAdvertiserCompany("");
    setAdvertiserContactName("");
    setAdvertiserContactInfo("");
    setAdvertiserMemo("");
    setCommercialBrief({
      productName: "", brandName: "", price: "", purchaseLink: "", features: "",
      reviewNotes: "", compareTarget: "", eventBenefit: "", campaignGoal: "판매 전환",
      disclosure: "광고·협찬 콘텐츠", productImageDataUrl: "", applyBrandStyle: true
    });
  }

  function saveAdvertiserProfile() {
    if (!advertiserCompany.trim() && !commercialBrief.brandName.trim() && !commercialBrief.productName.trim()) {
      setMessage("회사명, 브랜드명 또는 제품명 중 하나는 입력해 주세요.");
      return;
    }
    const now = new Date().toISOString();
    const existing = advertisers.find((item) => item.id === selectedAdvertiserId);
    const profile: AdvertiserProfile = {
      id: selectedAdvertiserId || `advertiser-${Date.now()}`,
      companyName: advertiserCompany.trim(),
      brandName: commercialBrief.brandName.trim(),
      contactName: advertiserContactName.trim(),
      contactInfo: advertiserContactInfo.trim(),
      memo: advertiserMemo.trim(),
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      brief: { ...commercialBrief }
    };
    setAdvertisers((prev) => prev.some((item) => item.id === profile.id)
      ? prev.map((item) => item.id === profile.id ? profile : item)
      : [profile, ...prev]);
    setSelectedAdvertiserId(profile.id);
    setMessage("광고주와 제품 정보가 저장되었습니다.");
  }

  function loadAdvertiserProfile(profile: AdvertiserProfile) {
    setSelectedAdvertiserId(profile.id);
    setAdvertiserCompany(profile.companyName);
    setAdvertiserContactName(profile.contactName);
    setAdvertiserContactInfo(profile.contactInfo);
    setAdvertiserMemo(profile.memo);
    setCommercialBrief({ ...profile.brief });
    if (profile.brief.productName) setTopic(`${profile.brief.productName} 제품 소개`);
    if (!["product", "review", "compare", "event"].includes(mode)) setMode("product");
    setMessage(`${profile.brandName || profile.companyName || "광고주"} 정보를 불러왔습니다.`);
    setActiveStudioTab("create");
  }

  function deleteAdvertiserProfile(id: string) {
    setAdvertisers((prev) => prev.filter((item) => item.id !== id));
    if (selectedAdvertiserId === id) resetAdvertiserForm();
    setMessage("광고주 정보가 삭제되었습니다.");
  }

  async function generateForTopic(targetTopic: string) {
    const requestBody = { topic: targetTopic, category, mode, audience, commercialBrief };
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) return data as Generated;

    // Production(Vercel)에서는 서버가 사용자의 PC localhost에 접근할 수 없으므로
    // 같은 브라우저에서 실행 중인 Ollama를 직접 호출한 뒤 서버에서 결과를 정리합니다.
    if (response.status >= 500) {
      const prepareResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, action: "prepare" })
      });
      const prepared = await prepareResponse.json().catch(() => ({}));
      if (!prepareResponse.ok || !prepared?.prompt) {
        throw new Error(prepared?.error || data?.error || "AI 생성 준비에 실패했습니다.");
      }

      let localResponse: Response;
      try {
        localResponse = await fetch("http://127.0.0.1:11434/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: prepared.model || "gemma3:4b",
            prompt: prepared.prompt,
            stream: false,
            format: "json",
            keep_alive: "5m",
            options: { temperature: 0.35, num_ctx: 3072, num_predict: 1800 }
          })
        });
      } catch {
        throw new Error("브라우저에서 Ollama에 연결하지 못했습니다. Ollama를 다시 실행한 뒤 새로고침하세요.");
      }

      const localData = await localResponse.json().catch(() => ({}));
      if (!localResponse.ok || !localData?.response) {
        throw new Error(localData?.error || "Ollama 생성 응답을 받지 못했습니다.");
      }

      const finalizeResponse = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...requestBody, action: "finalize", rawResponse: localData.response })
      });
      const finalized = await finalizeResponse.json().catch(() => ({}));
      if (!finalizeResponse.ok) throw new Error(finalized?.error || "AI 결과 정리에 실패했습니다.");
      return finalized as Generated;
    }

    throw new Error(data?.error || "생성 실패");
  }

  async function generate() {
    if (!topic.trim()) return setMessage("주제를 입력하세요.");
    if (isCommercialMode && !commercialBrief.productName.trim()) {
      return setMessage("제품명 또는 서비스명을 입력하세요.");
    }
    setLoading(true);
    setMessage(isCommercialMode ? "제품 정보를 바탕으로 광고 스토리를 기획하고 있습니다." : "AI가 먼저 기획한 뒤 캐러셀을 작성하고 있습니다.");
    try {
      const data = await generateForTopic(topic);
      setGenerated(data);
      setMessage("콘텐츠와 3D 일러스트 구성이 완성되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function cardPng(index: number) {
    const node = exportCardRefs.current[index] || cardRefs.current[index];
    if (!node) throw new Error("카드를 찾지 못했습니다.");
    return toPng(node, { pixelRatio: 2, cacheBust: true });
  }

  async function downloadOne(index: number) {
    try {
      const dataUrl = await cardPng(index);
      const link = document.createElement("a");
      link.download = `card-${String(index + 1).padStart(2, "0")}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      setMessage("PNG 저장에 실패했습니다.");
    }
  }

  async function downloadZip() {
    if (packagingCarousel) return;

    if (generated.cards.length !== 6) {
      setMessage(`인스타 캐러셀 패키지는 카드 6장이 필요합니다. 현재 ${generated.cards.length}장입니다.`);
      return;
    }

    setPackagingCarousel(true);
    let currentCard = 0;

    try {
      const zip = new JSZip();

      for (let i = 0; i < 6; i++) {
        currentCard = i + 1;
        setMessage(`인스타 캐러셀 패키지 생성 중... ${currentCard}/6`);
        const dataUrl = await cardPng(i);
        const base64 = dataUrl.split(",")[1];
        if (!base64) throw new Error(`${currentCard}번 카드 이미지 변환 실패`);
        zip.file(`${String(currentCard).padStart(2, "0")}.png`, base64, { base64: true });
      }

      zip.file("caption.txt", generated.caption.trim());
      zip.file("hashtags.txt", generated.hashtags.join(" ").trim());

      setMessage("파일을 ZIP으로 묶는 중...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = "instagram_package.zip";
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("인스타 캐러셀 패키지 생성 완료");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "알 수 없는 오류";
      const cardInfo = currentCard > 0 && currentCard <= 6 ? ` (${currentCard}번 카드 확인)` : "";
      setMessage(`인스타 캐러셀 패키지 생성 실패${cardInfo}: ${detail}`);
    } finally {
      setPackagingCarousel(false);
    }
  }


  async function downloadCompletePackage() {
    if (packagingComplete || packagingCarousel) return;
    if (generated.cards.length !== 6) {
      setMessage(`원클릭 패키지는 카드 6장이 필요합니다. 현재 ${generated.cards.length}장입니다.`);
      return;
    }

    setPackagingComplete(true);
    let currentCard = 0;
    try {
      const zip = new JSZip();
      const instagramFolder = zip.folder("01_instagram_carousel");
      const reelsFolder = zip.folder("02_reels");
      const projectFolder = zip.folder("03_project_info");
      if (!instagramFolder || !reelsFolder || !projectFolder) throw new Error("ZIP 폴더 생성 실패");

      for (let i = 0; i < 6; i += 1) {
        currentCard = i + 1;
        setMessage(`원클릭 패키지 생성 중... 캐러셀 ${currentCard}/6`);
        const dataUrl = await cardPng(i);
        const base64 = dataUrl.split(",")[1];
        if (!base64) throw new Error(`${currentCard}번 카드 이미지 변환 실패`);
        instagramFolder.file(`${String(currentCard).padStart(2, "0")}.png`, base64, { base64: true });
      }

      instagramFolder.file("caption.txt", generated.caption.trim());
      instagramFolder.file("hashtags.txt", generated.hashtags.join(" ").trim());
      reelsFolder.file(`${safeFileName(topic || "content")}_reels_storyboard.txt`, buildReelScriptText());
      reelsFolder.file("caption.txt", generated.caption.trim());
      reelsFolder.file("hashtags.txt", generated.hashtags.join(" ").trim());
      if (lastVideoBlob) {
        reelsFolder.file(lastVideoName || `${safeFileName(topic || "content")}_reels.webm`, lastVideoBlob);
      } else {
        reelsFolder.file("VIDEO_NOT_INCLUDED.txt", "릴스 영상 파일은 아직 생성되지 않았습니다. 프로그램의 릴스 탭에서 '음원 포함 릴스 저장'을 먼저 실행하면 다음 원클릭 패키지에 WebM 영상도 포함됩니다.");
      }

      projectFolder.file("content.json", JSON.stringify({
        version: "V38",
        exportedAt: new Date().toISOString(),
        topic, category, mode, audience,
        commercialBrief: { ...commercialBrief, productImageDataUrl: "" },
        generated
      }, null, 2));
      projectFolder.file("README.txt", [
        "AI Content Studio V38 원클릭 콘텐츠 패키지",
        "",
        "01_instagram_carousel: 인스타그램 4:5 캐러셀 이미지 6장, 캡션, 해시태그",
        "02_reels: 9:16 릴스 스토리보드, 캡션, 해시태그, 생성된 경우 WebM 영상",
        "03_project_info: 콘텐츠 원본 JSON",
        "",
        `주제: ${topic || generated.cards[0]?.title || "콘텐츠"}`,
        `생성 시각: ${new Date().toLocaleString("ko-KR")}`
      ].join("\n"));

      setMessage("원클릭 패키지를 ZIP으로 묶는 중...");
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.download = `${safeFileName(topic || "content")}_complete_package.zip`;
      link.href = url;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(lastVideoBlob ? "원클릭 콘텐츠 패키지 생성 완료 · 릴스 영상 포함" : "원클릭 콘텐츠 패키지 생성 완료 · 릴스 스토리보드 포함");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "알 수 없는 오류";
      const cardInfo = currentCard > 0 && currentCard <= 6 ? ` (${currentCard}번 카드 확인)` : "";
      setMessage(`원클릭 패키지 생성 실패${cardInfo}: ${detail}`);
    } finally {
      setPackagingComplete(false);
    }
  }

  function studioBackupPayload() {
    const storageKeys = [
      "ai-content-studio-project",
      "ai-content-studio-upload-queue",
      "ai-content-studio-approvals",
      "ai-content-studio-automation",
      "ai-content-studio-brand",
      "ai-content-studio-metrics",
      "ai-content-studio-accounts",
      "ai-content-studio-optimization"
    ];

    const storage: Record<string, string | null> = {};
    storageKeys.forEach((key) => {
      storage[key] = localStorage.getItem(key);
    });

    return {
      version: "V25",
      exportedAt: new Date().toISOString(),
      storage
    };
  }

  function exportFullBackup() {
    try {
      const payload = studioBackupPayload();
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8"
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `ai-content-studio-backup-${new Date().toISOString().slice(0, 10)}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("전체 데이터 백업 파일을 저장했습니다.");
    } catch {
      setMessage("백업 파일 저장에 실패했습니다.");
    }
  }

  async function importFullBackup(file: File | null) {
    if (!file) return;
    try {
      const raw = await file.text();
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object" || !data.storage || typeof data.storage !== "object") {
        throw new Error("올바른 백업 파일이 아닙니다.");
      }

      Object.entries(data.storage as Record<string, string | null>).forEach(([key, value]) => {
        if (typeof value === "string") localStorage.setItem(key, value);
        else localStorage.removeItem(key);
      });

      setBackupImportedAt(new Date().toISOString());
      setMessage("백업 데이터를 복원했습니다. 페이지를 새로고침합니다.");
      window.setTimeout(() => window.location.reload(), 700);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "백업 복원에 실패했습니다.");
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
  }

  function clearAllStudioData() {
    const confirmed = window.confirm(
      "AI Content Studio의 프로젝트, 예약, 브랜드, 성과, 계정, 추천 기록을 모두 삭제할까요?"
    );
    if (!confirmed) return;

    [
      "ai-content-studio-project",
      "ai-content-studio-upload-queue",
      "ai-content-studio-approvals",
      "ai-content-studio-automation",
      "ai-content-studio-brand",
      "ai-content-studio-metrics",
      "ai-content-studio-accounts",
      "ai-content-studio-optimization"
    ].forEach((key) => localStorage.removeItem(key));

    setMessage("전체 데이터를 초기화했습니다. 페이지를 새로고침합니다.");
    window.setTimeout(() => window.location.reload(), 600);
  }

  async function runSystemDiagnostics() {
    setDiagnosticRunning(true);
    setMessage("주요 기능 상태를 점검하고 있습니다.");

    const results: DiagnosticItem[] = [];
    const add = (
      id: string,
      label: string,
      status: DiagnosticItem["status"],
      detail: string
    ) => results.push({ id, label, status, detail });

    try {
      add(
        "browser-storage",
        "브라우저 저장소",
        typeof localStorage !== "undefined" ? "ok" : "error",
        typeof localStorage !== "undefined"
          ? "LocalStorage를 사용할 수 있습니다."
          : "LocalStorage를 사용할 수 없습니다."
      );

      add(
        "generation-data",
        "현재 콘텐츠",
        generated?.cards?.length > 0 ? "ok" : "warning",
        generated?.cards?.length > 0
          ? `현재 카드 ${generated.cards.length}장이 준비되어 있습니다.`
          : "아직 생성된 콘텐츠가 없습니다."
      );

      add(
        "queue",
        "업로드 대기열",
        uploadQueue.length > 0 ? "ok" : "warning",
        uploadQueue.length > 0
          ? `대기열에 ${uploadQueue.length}건이 저장되어 있습니다.`
          : "업로드 대기열이 비어 있습니다."
      );

      add(
        "accounts",
        "소셜 계정",
        socialAccounts.length > 0 ? "ok" : "warning",
        socialAccounts.length > 0
          ? `등록된 계정이 ${socialAccounts.length}개 있습니다.`
          : "등록된 소셜 계정이 없습니다."
      );

      add(
        "brand",
        "브랜드 설정",
        brandName.trim() ? "ok" : "warning",
        brandName.trim()
          ? `${brandName} 브랜드가 설정되어 있습니다.`
          : "브랜드명이 설정되지 않았습니다."
      );

      add(
        "metrics",
        "성과 데이터",
        contentMetrics.length > 0 ? "ok" : "warning",
        contentMetrics.length > 0
          ? `성과 기록 ${contentMetrics.length}건이 있습니다.`
          : "성과 기록이 없어 최적화 정확도가 낮을 수 있습니다."
      );

      add(
        "automation",
        "자동 생성 루틴",
        automationEnabled ? "ok" : "warning",
        automationEnabled
          ? `매일 ${automationTime} 자동 실행으로 설정되어 있습니다.`
          : "자동 생성 루틴이 꺼져 있습니다."
      );

      try {
        const response = await fetch("/api/telegram/status", { cache: "no-store" });
        const data = await response.json();
        add(
          "telegram",
          "텔레그램 연결",
          response.ok && data?.configured ? "ok" : "warning",
          response.ok && data?.configured
            ? "텔레그램 승인 전송 환경변수가 설정되어 있습니다."
            : "텔레그램 환경변수가 아직 설정되지 않았습니다."
        );
      } catch {
        add(
          "telegram",
          "텔레그램 연결",
          "warning",
          "텔레그램 상태 확인 API에 연결하지 못했습니다."
        );
      }

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic: "시스템 진단",
            category,
            mode,
            audience,
            healthCheck: true
          })
        });
        add(
          "generator",
          "AI 생성 API",
          response.ok ? "ok" : "warning",
          response.ok
            ? "AI 생성 API가 응답했습니다."
            : `AI 생성 API 응답 코드: ${response.status}`
        );
      } catch {
        add(
          "generator",
          "AI 생성 API",
          "error",
          "AI 생성 API에 연결하지 못했습니다. Ollama와 개발 서버를 확인하세요."
        );
      }
    } finally {
      setDiagnostics(results);
      setDiagnosticRunning(false);
      const errors = results.filter((item) => item.status === "error").length;
      const warnings = results.filter((item) => item.status === "warning").length;
      setMessage(
        errors > 0
          ? `진단 완료: 오류 ${errors}개, 확인 필요 ${warnings}개`
          : `진단 완료: 오류 없음, 확인 필요 ${warnings}개`
      );
    }
  }

  function diagnosticSummary() {
    const ok = diagnostics.filter((item) => item.status === "ok").length;
    const warning = diagnostics.filter((item) => item.status === "warning").length;
    const error = diagnostics.filter((item) => item.status === "error").length;
    return { ok, warning, error };
  }

  function recommendationSourceMetrics(platform: PlatformKey) {
    return contentMetrics
      .filter((item) => item.platform === platform)
      .sort((a, b) => metricEngagementRate(b) - metricEngagementRate(a));
  }

  function buildTitleSuggestions(baseTopic: string, platform: PlatformKey, bestTitles: string[]) {
    const cleaned = baseTopic.trim() || topic.trim() || generated.cards[0]?.title || "건강 정보";
    const platformPrefix = platform === "youtube" ? "꼭 보세요" : platform === "tiktok" ? "30초 핵심" : "저장 필수";
    const examples = [
      `${platformPrefix}: ${cleaned}`,
      `${cleaned}, 이것만은 꼭 확인하세요`,
      `${cleaned} 핵심 5가지`,
      `${cleaned}에서 가장 많이 놓치는 부분`,
      `${cleaned} 한눈에 정리`
    ];

    const borrowed = bestTitles
      .slice(0, 2)
      .map((title) => {
        if (title.includes("핵심")) return `${cleaned} 핵심 정리`;
        if (title.includes("체크")) return `${cleaned} 체크리스트`;
        if (title.includes("주의")) return `${cleaned} 주의사항`;
        return "";
      })
      .filter(Boolean);

    return Array.from(new Set([...borrowed, ...examples])).slice(0, 5);
  }

  function buildHashtagSuggestions(baseTopic: string, platform: PlatformKey) {
    const words = baseTopic
      .replace(/[^가-힣a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .map((word) => word.trim())
      .filter((word) => word.length >= 2)
      .slice(0, 6);

    const common = platform === "youtube"
      ? ["쇼츠", "건강정보", "생활정보"]
      : platform === "tiktok"
        ? ["틱톡정보", "건강팁", "생활꿀팁"]
        : ["릴스", "건강정보", "저장필수"];

    return Array.from(new Set([...words, ...common]))
      .map((word) => `#${word.replace(/^#/, "")}`)
      .slice(0, 12);
  }

  function estimateBestHour(items: ContentMetric[]) {
    if (!items.length) return "오후 8:00";
    const hourScores = new Map<number, { score: number; count: number }>();
    items.forEach((item) => {
      const hour = new Date(item.publishedAt).getHours();
      const score = metricEngagementRate(item) + (item.clicks / Math.max(item.views, 1)) * 100;
      const current = hourScores.get(hour) || { score: 0, count: 0 };
      hourScores.set(hour, { score: current.score + score, count: current.count + 1 });
    });

    const best = [...hourScores.entries()].sort((a, b) =>
      (b[1].score / b[1].count) - (a[1].score / a[1].count)
    )[0];

    if (!best) return "오후 8:00";
    const hour = best[0];
    const period = hour < 12 ? "오전" : "오후";
    const display = hour % 12 || 12;
    return `${period} ${display}:00`;
  }

  function buildContentDirection(items: ContentMetric[], baseTopic: string) {
    if (!items.length) {
      return `${baseTopic || "현재 주제"}를 체크리스트형 카드뉴스와 20~30초 릴스로 함께 제작하세요. 첫 장에는 핵심 이익을 크게 보여주는 구성이 적합합니다.`;
    }

    const best = items[0];
    const saveRate = best.views > 0 ? (best.saves / best.views) * 100 : 0;
    const shareRate = best.views > 0 ? (best.shares / best.views) * 100 : 0;
    const clickRate = best.views > 0 ? (best.clicks / best.views) * 100 : 0;

    if (saveRate >= shareRate && saveRate >= clickRate) {
      return "저장률이 높은 편입니다. 체크리스트, 증상 정리, 주차별 변화처럼 나중에 다시 보는 콘텐츠 비중을 늘리세요.";
    }
    if (shareRate >= saveRate && shareRate >= clickRate) {
      return "공유율이 높은 편입니다. 가족이나 지인에게 바로 전달할 수 있는 경고형·공감형 콘텐츠를 늘리세요.";
    }
    return "클릭 반응이 상대적으로 좋습니다. 첫 카드에서 궁금증을 만들고 마지막 카드에서 분석 페이지나 상세 콘텐츠로 자연스럽게 연결하세요.";
  }

  async function createOptimizationRecommendation() {
    const baseTopic = optimizationTopic.trim() || topic.trim() || generated.cards[0]?.title || "";
    if (!baseTopic) {
      setMessage("최적화할 주제를 입력하거나 먼저 콘텐츠를 생성하세요.");
      return;
    }

    setOptimizationLoading(true);
    setMessage("성과 데이터를 분석해 최적화 추천을 만드는 중입니다.");

    try {
      const items = recommendationSourceMetrics(optimizationPlatform);
      const recommendation: OptimizationRecommendation = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
        platform: optimizationPlatform,
        sourceTopic: baseTopic,
        titleSuggestions: buildTitleSuggestions(baseTopic, optimizationPlatform, items.map((item) => item.title)),
        hashtagSuggestions: buildHashtagSuggestions(baseTopic, optimizationPlatform),
        bestHour: estimateBestHour(items),
        contentDirection: buildContentDirection(items, baseTopic),
        reason: items.length
          ? `${platformLabel(optimizationPlatform)} 성과 기록 ${items.length}건의 참여율·저장·공유·클릭 데이터를 기준으로 계산했습니다.`
          : "성과 기록이 없어 플랫폼별 기본 최적화 규칙과 현재 주제를 기준으로 추천했습니다."
      };

      setOptimizationResult(recommendation);
      setOptimizationHistory((current) => [recommendation, ...current].slice(0, 30));
      setMessage("AI 최적화 추천을 완성했습니다.");
    } finally {
      setOptimizationLoading(false);
    }
  }

  function applyRecommendedTitle(titleValue: string) {
    setTopic(titleValue);
    if (generated?.platformText?.[selectedPlatform]) {
      setGenerated((current) => ({
        ...current,
        platformText: {
          ...(current.platformText || {}),
          [selectedPlatform]: {
            ...(current.platformText?.[selectedPlatform] || platformCopies[selectedPlatform]),
            title: titleValue
          }
        }
      }));
    }
    setMessage("추천 제목을 현재 콘텐츠에 적용했습니다.");
  }

  function copyRecommendedHashtags() {
    if (!optimizationResult) return;
    copyText(optimizationResult.hashtagSuggestions.join(" "), "추천 해시태그");
  }

  function deleteOptimizationHistory(id: string) {
    setOptimizationHistory((current) => current.filter((item) => item.id !== id));
    if (optimizationResult?.id === id) setOptimizationResult(null);
  }

  function addSocialAccount() {
    const name = accountName.trim();
    const handle = accountHandle.trim();
    if (!name) {
      setMessage("계정 이름을 입력하세요.");
      return;
    }

    const duplicate = socialAccounts.some((account) =>
      account.platform === accountPlatform &&
      account.handle.trim().toLowerCase() === handle.toLowerCase() &&
      handle.length > 0
    );
    if (duplicate) {
      setMessage("같은 플랫폼에 동일한 계정 아이디가 이미 등록되어 있습니다.");
      return;
    }

    const firstForPlatform = !socialAccounts.some((account) => account.platform === accountPlatform);
    const account: SocialAccount = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      platform: accountPlatform,
      accountName: name,
      handle,
      category: accountCategory.trim() || "미분류",
      brandPresetId: accountBrandPresetId,
      isDefault: firstForPlatform,
      isActive: true,
      memo: accountMemo.trim()
    };

    setSocialAccounts((current) => [account, ...current]);
    if (firstForPlatform) {
      setSelectedAccountByPlatform((current) => ({ ...current, [accountPlatform]: account.id }));
    }
    setAccountName("");
    setAccountHandle("");
    setAccountMemo("");
    setMessage("소셜 계정을 등록했습니다.");
  }

  function setDefaultSocialAccount(id: string) {
    const target = socialAccounts.find((account) => account.id === id);
    if (!target) return;
    setSocialAccounts((current) => current.map((account) => ({
      ...account,
      isDefault: account.platform === target.platform ? account.id === id : account.isDefault
    })));
    setSelectedAccountByPlatform((current) => ({ ...current, [target.platform]: id }));
    setMessage(`${target.accountName} 계정을 기본 계정으로 설정했습니다.`);
  }

  function toggleSocialAccount(id: string) {
    setSocialAccounts((current) => current.map((account) =>
      account.id === id ? { ...account, isActive: !account.isActive } : account
    ));
  }

  function deleteSocialAccount(id: string) {
    const target = socialAccounts.find((account) => account.id === id);
    if (!target) return;

    const remaining = socialAccounts.filter((account) => account.id !== id);
    const platformRemaining = remaining.filter((account) => account.platform === target.platform);
    let next = remaining;

    if (target.isDefault && platformRemaining.length > 0) {
      next = remaining.map((account) =>
        account.id === platformRemaining[0].id ? { ...account, isDefault: true } : account
      );
    }

    setSocialAccounts(next);
    setSelectedAccountByPlatform((current) => ({
      ...current,
      [target.platform]:
        current[target.platform] === id
          ? (platformRemaining[0]?.id || "")
          : current[target.platform]
    }));
    setMessage("등록된 계정을 삭제했습니다.");
  }

  function applyAccountBrand(account: SocialAccount) {
    if (!account.brandPresetId) {
      setMessage("이 계정에는 연결된 브랜드 프리셋이 없습니다.");
      return;
    }
    const preset = brandPresets.find((item) => item.id === account.brandPresetId);
    if (!preset) {
      setMessage("연결된 브랜드 프리셋을 찾을 수 없습니다.");
      return;
    }
    applyBrandPreset(preset);
  }

  function selectedAccountLabel(platform: PlatformKey) {
    const account = socialAccounts.find((item) => item.id === selectedAccountByPlatform[platform]);
    return account ? `${account.accountName}${account.handle ? ` (${account.handle})` : ""}` : "계정 미선택";
  }

  function safeMetricNumber(value: number) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }

  function metricEngagementRate(item: ContentMetric) {
    if (!item.views) return 0;
    return ((item.likes + item.comments + item.saves + item.shares) / item.views) * 100;
  }

  function addContentMetric() {
    const title = metricTitle.trim() || topic.trim() || generated.cards[0]?.title || "새 콘텐츠";
    const item: ContentMetric = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      publishedAt: new Date(metricPublishedAt || Date.now()).toISOString(),
      platform: metricPlatform,
      title,
      views: safeMetricNumber(metricViews),
      likes: safeMetricNumber(metricLikes),
      comments: safeMetricNumber(metricComments),
      saves: safeMetricNumber(metricSaves),
      shares: safeMetricNumber(metricShares),
      clicks: safeMetricNumber(metricClicks)
    };

    setContentMetrics((current) => [item, ...current].slice(0, 500));
    setMetricTitle("");
    setMetricViews(0);
    setMetricLikes(0);
    setMetricComments(0);
    setMetricSaves(0);
    setMetricShares(0);
    setMetricClicks(0);
    setMessage("콘텐츠 성과를 저장했습니다.");
  }

  function deleteContentMetric(id: string) {
    setContentMetrics((current) => current.filter((item) => item.id !== id));
  }

  function createLibrarySnapshot(titleOverride?: string): ContentLibraryItem {
    const now = new Date().toISOString();
    const safeBrief = commercialBrief ? { ...commercialBrief, productImageDataUrl: "" } : undefined;
    return {
      id: crypto.randomUUID(),
      title: (titleOverride || generated.cards[0]?.title || topic || "제목 없는 콘텐츠").trim(),
      category, mode, audience, topic, createdAt: now, updatedAt: now,
      commercialBrief: safeBrief,
      generated: JSON.parse(JSON.stringify(generated)) as Generated
    };
  }

  function saveCurrentToLibrary() {
    if (!generated.cards.length) return setMessage("먼저 콘텐츠를 생성해 주세요.");
    const item = createLibrarySnapshot();
    setContentLibrary((current) => [item, ...current].slice(0, 50));
    setMessage(`콘텐츠 라이브러리에 저장했습니다: ${item.title}`);
  }

  function openLibraryItem(item: ContentLibraryItem) {
    setCategory(item.category || "임신");
    setMode(item.mode || "auto");
    setAudience(item.audience || "일반 성인");
    setTopic(item.topic || "");
    if (item.commercialBrief) setCommercialBrief((current) => ({ ...current, ...item.commercialBrief, productImageDataUrl: "" }));
    setGenerated(JSON.parse(JSON.stringify(item.generated)) as Generated);
    setSelectedCardIndex(0);
    setActiveStudioTab("create");
    setMessage(`라이브러리에서 불러왔습니다: ${item.title}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function duplicateLibraryItem(item: ContentLibraryItem) {
    const now = new Date().toISOString();
    const copy: ContentLibraryItem = {
      ...JSON.parse(JSON.stringify(item)), id: crypto.randomUUID(),
      title: `${item.title} 복사본`, createdAt: now, updatedAt: now
    };
    if (copy.commercialBrief) copy.commercialBrief.productImageDataUrl = "";
    setContentLibrary((current) => [copy, ...current].slice(0, 50));
    setMessage("콘텐츠를 복제했습니다.");
  }

  function deleteLibraryItem(id: string) {
    setContentLibrary((current) => current.filter((item) => item.id !== id));
    setMessage("콘텐츠를 라이브러리에서 삭제했습니다.");
  }

  function importPublishedQueueToMetrics() {
    const published = uploadQueue.filter((item) => item.status === "published");
    const existing = new Set(contentMetrics.map((item) => `${item.platform}-${item.title}-${item.publishedAt.slice(0, 10)}`));
    const additions = published
      .filter((item) => !existing.has(`${item.platform}-${item.title}-${item.scheduledAt.slice(0, 10)}`))
      .map((item) => ({
        id: `queue-${item.id}`,
        publishedAt: item.scheduledAt,
        platform: item.platform,
        title: item.title || item.topic,
        views: 0,
        likes: 0,
        comments: 0,
        saves: 0,
        shares: 0,
        clicks: 0
      }));

    if (!additions.length) {
      setMessage("새로 가져올 발행 완료 콘텐츠가 없습니다.");
      return;
    }
    setContentMetrics((current) => [...additions, ...current].slice(0, 500));
    setMessage(`발행 완료 콘텐츠 ${additions.length}건을 통계에 가져왔습니다.`);
  }

  function exportMetricsCsv() {
    const header = ["발행일", "플랫폼", "제목", "조회수", "좋아요", "댓글", "저장", "공유", "클릭", "참여율"];
    const rows = filteredMetrics.map((item) => [
      new Date(item.publishedAt).toLocaleString("ko-KR"),
      platformLabel(item.platform),
      item.title,
      item.views,
      item.likes,
      item.comments,
      item.saves,
      item.shares,
      item.clicks,
      `${metricEngagementRate(item).toFixed(2)}%`
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `content-metrics-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("성과 통계를 CSV 파일로 저장했습니다.");
  }

  function brandFontStack() {
    if (brandFontFamily === "serif") return '"Noto Serif KR", Georgia, serif';
    if (brandFontFamily === "rounded") return '"Arial Rounded MT Bold", "Noto Sans KR", sans-serif';
    if (brandFontFamily === "mono") return '"IBM Plex Mono", "Courier New", monospace';
    return '"Noto Sans KR", system-ui, sans-serif';
  }

  function handleBrandLogoFile(file: File | null) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("이미지 파일만 로고로 사용할 수 있습니다.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setBrandLogoDataUrl(String(reader.result || ""));
      setMessage("브랜드 로고를 적용했습니다.");
    };
    reader.readAsDataURL(file);
  }

  function clearBrandLogo() {
    setBrandLogoDataUrl("");
    setMessage("브랜드 로고를 제거했습니다.");
  }

  function saveBrandPreset() {
    const name = brandPresetName.trim() || `브랜드 ${brandPresets.length + 1}`;
    const preset: BrandPreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      brandName,
      tagline: brandTagline,
      primaryColor: brandPrimaryColor,
      secondaryColor: brandSecondaryColor,
      fontFamily: brandFontFamily,
      watermarkPosition,
      watermarkOpacity,
      showBrandName,
      showTagline: showBrandTagline,
      logoDataUrl: brandLogoDataUrl
    };
    setBrandPresets((current) => [preset, ...current].slice(0, 20));
    setBrandPresetName("");
    setMessage("브랜드 프리셋을 저장했습니다.");
  }

  function applyBrandPreset(preset: BrandPreset) {
    setBrandName(preset.brandName);
    setBrandTagline(preset.tagline);
    setBrandPrimaryColor(preset.primaryColor);
    setBrandSecondaryColor(preset.secondaryColor);
    setBrandFontFamily(preset.fontFamily);
    setWatermarkPosition(preset.watermarkPosition);
    setWatermarkOpacity(preset.watermarkOpacity);
    setShowBrandName(preset.showBrandName);
    setShowBrandTagline(preset.showTagline);
    setBrandLogoDataUrl(preset.logoDataUrl);
    setMessage(`${preset.name} 프리셋을 적용했습니다.`);
  }

  function deleteBrandPreset(id: string) {
    setBrandPresets((current) => current.filter((preset) => preset.id !== id));
  }

  function automationTopicList() {
    return automationTopics
      .split(/\r?\n/)
      .map((value) => value.trim())
      .filter(Boolean);
  }

  function addAutomationLog(log: Omit<AutomationLog, "id" | "createdAt">) {
    setAutomationLogs((current) => [{
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      ...log
    }, ...current].slice(0, 50));
  }

  async function runAutomationNow(trigger: "manual" | "schedule" = "manual") {
    const topics = automationTopicList();
    if (!topics.length) {
      setMessage("자동 생성에 사용할 주제를 한 줄에 하나씩 입력하세요.");
      return;
    }
    if (automationRunning) return;

    const index = automationNextIndex % topics.length;
    const targetTopic = topics[index];
    setAutomationRunning(true);
    setMessage(`자동 생성 중: ${targetTopic}`);

    try {
      const data = await generateForTopic(targetTopic);
      setTopic(targetTopic);
      setGenerated(data);
      setSelectedPlatform(automationPlatform);

      const now = new Date();
      const queueItem: UploadQueueItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: now.toISOString(),
        scheduledAt: now.toISOString(),
        topic: targetTopic,
        platform: automationPlatform,
        status: "queued",
        title: data.cards[0]?.title || targetTopic,
        attempts: 0,
        lastError: ""
      };

      setUploadQueue((current) => [queueItem, ...current].slice(0, 100));
      setAutomationNextIndex((index + 1) % topics.length);
      const dateKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      if (trigger === "schedule") setAutomationLastRunDate(dateKey);
      addAutomationLog({
        topic: targetTopic,
        platform: automationPlatform,
        result: "success",
        message: trigger === "schedule" ? "예약 시간 자동 생성 완료" : "수동 자동화 실행 완료"
      });
      setMessage("콘텐츠를 생성하고 업로드 대기열에 등록했습니다.");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "자동 생성에 실패했습니다.";
      addAutomationLog({
        topic: targetTopic,
        platform: automationPlatform,
        result: "failed",
        message: errorMessage
      });
      setMessage(errorMessage);
    } finally {
      setAutomationRunning(false);
    }
  }

  function clearAutomationLogs() {
    setAutomationLogs([]);
    setMessage("자동 생성 실행 기록을 삭제했습니다.");
  }

  function uploadStatusLabel(status: UploadStatus) {
    if (status === "queued") return "업로드 대기";
    if (status === "scheduled") return "예약됨";
    if (status === "uploading") return "업로드 중";
    if (status === "failed") return "실패";
    return "발행 완료";
  }

  function addToUploadQueue() {
    const copy = platformCopies[selectedPlatform];
    const now = new Date();
    const target = scheduleMode === "later" && scheduledAt ? new Date(scheduledAt) : now;

    if (scheduleMode === "later" && !scheduledAt) {
      setMessage("예약 날짜와 시간을 선택하세요.");
      return;
    }
    if (target.getTime() < now.getTime() - 60000) {
      setMessage("현재보다 이전 시간으로 예약할 수 없습니다.");
      return;
    }

    const duplicate = uploadQueue.some((item) =>
      item.platform === selectedPlatform &&
      Math.abs(new Date(item.scheduledAt).getTime() - target.getTime()) < 30 * 60 * 1000
    );
    if (duplicate) {
      setMessage("같은 플랫폼에 30분 이내로 예약된 콘텐츠가 있습니다.");
      return;
    }

    const item: UploadQueueItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: now.toISOString(),
      scheduledAt: target.toISOString(),
      topic: topic || generated.cards[0]?.title || "새 콘텐츠",
      platform: selectedPlatform,
      status: scheduleMode === "later" ? "scheduled" : "queued",
      title: copy.title,
      attempts: 0,
      lastError: ""
    };

    setUploadQueue((current) => [item, ...current].slice(0, 100));
    setMessage(scheduleMode === "later" ? "예약 대기열에 추가했습니다." : "업로드 대기열에 추가했습니다.");
  }

  function updateUploadStatus(id: string, status: UploadStatus, error = "") {
    setUploadQueue((current) => current.map((item) =>
      item.id === id
        ? { ...item, status, attempts: status === "failed" ? item.attempts + 1 : item.attempts, lastError: error }
        : item
    ));
  }

  function retryUpload(id: string) {
    setUploadQueue((current) => current.map((item) =>
      item.id === id ? { ...item, status: "queued", attempts: item.attempts + 1, lastError: "" } : item
    ));
    setMessage("재시도 대기열에 넣었습니다.");
  }

  function processDueUploads() {
    const now = Date.now();
    const dueItems = uploadQueue.filter((item) =>
      (item.status === "scheduled" || item.status === "queued") &&
      new Date(item.scheduledAt).getTime() <= now
    );
    if (!dueItems.length) {
      setMessage("지금 발행할 항목이 없습니다.");
      return;
    }
    setMessage(`발행 시간이 된 ${dueItems.length}건이 있습니다. 각 항목의 실제 업로드 실행 버튼을 누르세요.`);
  }

  async function checkPlatformConnections() {
    setConnectionChecking(true);
    try {
      const response = await fetch("/api/publish/status", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "플랫폼 연결 상태 확인에 실패했습니다.");
      setPlatformConnections(data.platforms);
      setMessage("플랫폼 연결 상태를 확인했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "플랫폼 연결 상태 확인에 실패했습니다.");
    } finally {
      setConnectionChecking(false);
    }
  }

  async function executeQueueUpload(item: UploadQueueItem) {
    if (executingQueueId) return;
    setExecutingQueueId(item.id);
    updateUploadStatus(item.id, "uploading");
    try {
      const copy = platformCopies[item.platform];
      const formData = new FormData();
      formData.append("platform", item.platform);
      formData.append("queueId", item.id);
      formData.append("topic", item.topic);
      formData.append("title", item.title || copy.title);
      formData.append("description", `${copy.description}\n\n${copy.hashtags}`.trim());
      formData.append("cardCount", String(generated.cards.length));
      if (lastVideoBlob) {
        formData.append("video", lastVideoBlob, lastVideoName || `${safeFileName(item.topic)}_reels.webm`);
      }
      const response = await fetch("/api/publish/execute", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.message || data.error || "업로드 실행에 실패했습니다.");
      updateUploadStatus(item.id, "published");
      const publishedMessage = data.publishedUrl
        ? `${data.message || `${platformLabel(item.platform)} 업로드가 완료되었습니다.`} ${data.publishedUrl}`
        : (data.message || `${platformLabel(item.platform)} 업로드가 완료되었습니다.`);
      setMessage(publishedMessage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "업로드 실행에 실패했습니다.";
      updateUploadStatus(item.id, "failed", errorMessage);
      setMessage(errorMessage);
    } finally {
      setExecutingQueueId("");
    }
  }

  function approvalStatusLabel(status: ApprovalStatus) {
    if (status === "pending") return "승인 대기";
    if (status === "approved") return "승인 완료";
    if (status === "rejected") return "수정 필요";
    if (status === "published") return "발행 완료";
    return "초안";
  }

  async function checkTelegram() {
    setTelegramStatus("unknown");
    setMessage("텔레그램 봇과 승인 웹훅을 연결하고 있습니다.");
    try {
      const response = await fetch("/api/telegram/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "텔레그램 연결에 실패했습니다.");
      setTelegramStatus("ready");
      setMessage(data.message || "텔레그램 연결이 완료되었습니다. 테스트 메시지를 확인하세요.");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "텔레그램 연결 상태를 확인하지 못했습니다.";
      setTelegramStatus(messageText.includes("환경변수") || messageText.includes("설정") ? "missing" : "error");
      setMessage(messageText);
    }
  }

  async function sendTelegramApproval() {
    const copy = platformCopies[selectedPlatform];
    if (!copy) return;

    setTelegramSending(true);
    setMessage("텔레그램으로 승인 요청을 보내고 있습니다.");

    try {
      const response = await fetch("/api/telegram/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic || generated.cards[0]?.title || "새 콘텐츠",
          platform: platformLabel(selectedPlatform),
          title: copy.title,
          description: copy.description,
          hashtags: copy.hashtags,
          estimatedDurationSeconds: generated.cards.length * secondsPerCard,
          totalCards: generated.cards.length,
          note: approvalNote
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "텔레그램 전송에 실패했습니다.");

      const item: ApprovalItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        serverDraftId: data.draftId || undefined,
        createdAt: new Date().toISOString(),
        topic: topic || generated.cards[0]?.title || "새 콘텐츠",
        platform: selectedPlatform,
        status: "pending",
        note: approvalNote,
        syncMessage: data.draftId ? "텔레그램 응답 대기 중" : "기존 방식으로 전송됨"
      };

      setApprovalItems((current) => [item, ...current].slice(0, 30));
      setApprovalNote("");
      setTelegramStatus("ready");
      setMessage("텔레그램 승인 요청을 보냈습니다.");
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "텔레그램 전송에 실패했습니다.";
      setTelegramStatus(messageText.includes("환경변수") ? "missing" : "error");
      setMessage(messageText);
    } finally {
      setTelegramSending(false);
    }
  }

  async function syncApprovalStatus(item: ApprovalItem, silent = false) {
    if (!item.serverDraftId) {
      if (!silent) setMessage("이 기록은 이전 버전에서 생성되어 텔레그램 상태 동기화를 지원하지 않습니다.");
      return;
    }

    try {
      const response = await fetch(`/api/telegram/approval-status?id=${encodeURIComponent(item.serverDraftId)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "승인 상태 확인에 실패했습니다.");

      const nextStatus = (data.status || "pending") as ApprovalStatus;
      setApprovalItems((current) => current.map((currentItem) =>
        currentItem.id === item.id
          ? { ...currentItem, status: nextStatus, syncMessage: data.message || "상태 확인 완료" }
          : currentItem
      ));

      if (nextStatus === "approved") {
        setUploadQueue((current) => {
          const alreadyAdded = current.some((queueItem) => queueItem.id === `approval-${item.serverDraftId}`);
          if (alreadyAdded) return current;
          const now = new Date();
          return [{
            id: `approval-${item.serverDraftId}`,
            createdAt: now.toISOString(),
            scheduledAt: now.toISOString(),
            topic: item.topic,
            platform: item.platform,
            status: "queued" as UploadStatus,
            title: platformCopies[item.platform]?.title || item.topic,
            attempts: 0,
            lastError: ""
          }, ...current].slice(0, 100);
        });
      }

      if (!silent) {
        setMessage(nextStatus === "approved"
          ? "텔레그램 승인이 확인되어 업로드 대기열에 추가했습니다."
          : nextStatus === "rejected"
            ? "텔레그램에서 취소된 요청입니다."
            : "아직 텔레그램 승인을 기다리고 있습니다.");
      }
    } catch (error) {
      if (!silent) setMessage(error instanceof Error ? error.message : "승인 상태 확인에 실패했습니다.");
    }
  }

  async function syncAllPendingApprovals() {
    const targets = approvalItems.filter((item) => item.status === "pending" && item.serverDraftId);
    if (!targets.length) {
      setMessage("확인할 텔레그램 승인 요청이 없습니다.");
      return;
    }
    await Promise.all(targets.map((item) => syncApprovalStatus(item, true)));
    setMessage("텔레그램 승인 상태를 모두 확인했습니다.");
  }

  function updateApprovalStatus(id: string, status: ApprovalStatus) {
    setApprovalItems((current) =>
      current.map((item) => item.id === id ? { ...item, status } : item)
    );
  }

  function removeApprovalItem(id: string) {
    setApprovalItems((current) => current.filter((item) => item.id !== id));
  }

  async function copyText(value: string, field: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setMessage("클립보드에 복사했습니다.");
      window.setTimeout(() => setCopiedField(""), 1300);
    } catch {
      setMessage("복사하지 못했습니다. 브라우저 권한을 확인하세요.");
    }
  }

  function safeFileName(value: string) {
    return (value || "콘텐츠")
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\s+/g, "_")
      .slice(0, 70);
  }

  function platformLabel(key: PlatformKey) {
    if (key === "instagram") return "인스타그램 릴스";
    if (key === "youtube") return "유튜브 쇼츠";
    return "틱톡";
  }

  async function downloadPlatformText(key: PlatformKey) {
    const copy = platformCopies[key];
    const content = [
      `[${platformLabel(key)}]`,
      "",
      "[제목]",
      copy.title,
      "",
      "[설명·캡션]",
      copy.description,
      "",
      "[해시태그]",
      copy.hashtags
    ].join("\\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(topic)}_${key}_업로드문구.txt`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`${platformLabel(key)} 업로드 문구를 저장했습니다.`);
  }

  async function downloadUploadPackage() {
    if (!generated.cards.length) {
      setMessage("먼저 콘텐츠를 생성하세요.");
      return;
    }

    setMessage("플랫폼 업로드 패키지를 만들고 있습니다.");

    try {
      const zip = new JSZip();
      const root = zip.folder(`${safeFileName(topic)}_업로드패키지`);
      if (!root) throw new Error("ZIP 폴더를 만들지 못했습니다.");

      const metadata = {
        createdAt: new Date().toISOString(),
        topic,
        totalCards: generated.cards.length,
        secondsPerCard,
        estimatedDurationSeconds: generated.cards.length * secondsPerCard,
        platforms: platformCopies
      };

      root.file("업로드정보.json", JSON.stringify(metadata, null, 2));

      (Object.keys(platformCopies) as PlatformKey[]).forEach((key) => {
        const copy = platformCopies[key];
        root.file(
          `${key}_업로드문구.txt`,
          [
            `[${platformLabel(key)}]`,
            "",
            "[제목]",
            copy.title,
            "",
            "[설명·캡션]",
            copy.description,
            "",
            "[해시태그]",
            copy.hashtags
          ].join("\\n")
        );
      });

      const thumbnail = await cardPng(0);
      root.file("표지_썸네일.png", thumbnail.split(",")[1], { base64: true });

      if (lastVideoBlob) {
        root.file(lastVideoName || `${safeFileName(topic)}_릴스.webm`, lastVideoBlob);
      } else {
        root.file(
          "영상파일_안내.txt",
          "먼저 '음원 포함 릴스 저장' 버튼으로 영상을 만든 뒤 업로드 패키지를 다시 저장하면 영상 파일도 ZIP에 포함됩니다."
        );
      }

      const packageBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(packageBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFileName(topic)}_플랫폼업로드패키지.zip`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
      setMessage(lastVideoBlob
        ? "영상·썸네일·업로드 문구가 포함된 ZIP을 저장했습니다."
        : "썸네일과 업로드 문구 ZIP을 저장했습니다. 영상 생성 후 다시 저장하면 영상도 포함됩니다."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "업로드 패키지 저장에 실패했습니다.");
    }
  }

  function handleNarrationFile(file: File) {
    if (narrationUrl) URL.revokeObjectURL(narrationUrl);
    const url = URL.createObjectURL(file);
    setNarrationUrl(url);
    setNarrationName(file.name);
    setMessage("나레이션 파일을 불러왔습니다.");
  }

  function clearNarration() {
    if (narrationAudioRef.current) {
      narrationAudioRef.current.pause();
      narrationAudioRef.current.currentTime = 0;
    }
    if (narrationUrl) URL.revokeObjectURL(narrationUrl);
    setNarrationUrl("");
    setNarrationName("");
    if (narrationFileRef.current) narrationFileRef.current.value = "";
    setMessage("나레이션 파일을 제거했습니다.");
  }

  function toggleNarrationPreview() {
    const audio = narrationAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.volume = narrationVolume;
      audio.currentTime = 0;
      audio.play().catch(() => setMessage("나레이션을 재생하지 못했습니다."));
    } else {
      audio.pause();
    }
  }

  async function loadAudioBuffer(context: AudioContext, url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return context.decodeAudioData(arrayBuffer);
  }

  function currentVoice() {
    return availableVoices.find((voice) => voice.name === selectedVoiceName)
      || availableVoices.find((voice) => voice.lang.toLowerCase().startsWith("ko"))
      || availableVoices[0];
  }

  function narrationText(card: Card) {
    const details = card.details?.slice(0, 3).join(". ") || "";
    return [card.title, card.body, details].filter(Boolean).join(". ");
  }

  function speakCard(index: number) {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();
    const card = generated.cards[index];
    if (!card) return;

    const utterance = new SpeechSynthesisUtterance(narrationText(card));
    utterance.lang = currentVoice()?.lang || "ko-KR";
    utterance.voice = currentVoice() || null;
    utterance.rate = voiceRate;
    utterance.pitch = voicePitch;
    utterance.onstart = () => setPreviewSpeaking(true);
    utterance.onend = () => setPreviewSpeaking(false);
    utterance.onerror = () => setPreviewSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopVoicePreview() {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setPreviewSpeaking(false);
  }

  function handleMusicFile(file: File) {
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    const url = URL.createObjectURL(file);
    setMusicUrl(url);
    setMusicName(file.name);
    setMessage("배경음악을 불러왔습니다.");
    window.setTimeout(() => {
      if (musicAudioRef.current) {
        musicAudioRef.current.volume = musicVolume;
      }
    }, 0);
  }

  function clearMusic() {
    if (musicAudioRef.current) {
      musicAudioRef.current.pause();
      musicAudioRef.current.currentTime = 0;
    }
    if (musicUrl) URL.revokeObjectURL(musicUrl);
    setMusicUrl("");
    setMusicName("");
    if (musicFileRef.current) musicFileRef.current.value = "";
    setMessage("배경음악을 제거했습니다.");
  }

  function toggleMusicPreview() {
    const audio = musicAudioRef.current;
    if (!audio) return;

    if (audio.paused) {
      audio.volume = musicVolume;
      audio.play().catch(() => setMessage("배경음악을 재생하지 못했습니다."));
    } else {
      audio.pause();
    }
  }

  function wait(ms: number) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function imageFromDataUrl(dataUrl: string) {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("카드 이미지를 불러오지 못했습니다."));
      image.src = dataUrl;
    });
  }

  function drawReelFrame(
    context: CanvasRenderingContext2D,
    image: HTMLImageElement,
    progress: number,
    fade: number,
    width: number,
    height: number
  ) {
    context.save();
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.globalAlpha = fade;

    const zoom = 1 + progress * 0.055;
    const drawWidth = width * zoom;
    const drawHeight = height * zoom;
    const x = (width - drawWidth) / 2;
    const y = (height - drawHeight) / 2;

    context.drawImage(image, x, y, drawWidth, drawHeight);
    context.restore();
    const wmPadding = 42;
    const wmX = watermarkPosition.includes("right") ? width - wmPadding : wmPadding;
    const wmY = watermarkPosition.includes("bottom") ? height - wmPadding : wmPadding;
    const alignRight = watermarkPosition.includes("right");
    context.save();
    context.globalAlpha = Math.max(0.1, Math.min(1, watermarkOpacity / 100));
    context.textAlign = alignRight ? "right" : "left";
    context.textBaseline = watermarkPosition.includes("bottom") ? "bottom" : "top";
    context.font = `700 28px ${brandFontStack()}`;
    context.fillStyle = brandPrimaryColor;
    if (showBrandName && brandName.trim()) {
      context.fillText(brandName.trim(), wmX, wmY);
    }
    if (showBrandTagline && brandTagline.trim()) {
      context.globalAlpha *= 0.82;
      context.font = `500 17px ${brandFontStack()}`;
      const offset = watermarkPosition.includes("bottom") ? -36 : 36;
      context.fillText(brandTagline.trim(), wmX, wmY + offset);
    }
    context.restore();

  }

  async function exportReelVideo() {
    if (!generated.cards.length) {
      setMessage("영상으로 만들 카드가 없습니다.");
      return;
    }
    if (!("MediaRecorder" in window)) {
      setMessage("현재 브라우저는 영상 저장을 지원하지 않습니다. 크롬 또는 엣지를 사용하세요.");
      return;
    }

    setRenderingReel(true);
    setRenderProgress(0);
    setReelPlaying(false);
    setMessage("카드 이미지를 준비하고 있습니다.");

    try {
      const images: HTMLImageElement[] = [];
      for (let index = 0; index < generated.cards.length; index += 1) {
        const png = await cardPng(index);
        images.push(await imageFromDataUrl(png));
        setRenderProgress(Math.round(((index + 1) / generated.cards.length) * 20));
      }

      const canvas = document.createElement("canvas");
      canvas.width = 540;
      canvas.height = 960;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("영상 캔버스를 만들지 못했습니다.");

      const videoStream = canvas.captureStream(30);
      const totalDuration = generated.cards.length * secondsPerCard;
      const audioContext = new AudioContext();
      const destination = audioContext.createMediaStreamDestination();
      const scheduledSources: AudioBufferSourceNode[] = [];

      if (narrationUrl) {
        const narrationBuffer = await loadAudioBuffer(audioContext, narrationUrl);
        const narrationSource = audioContext.createBufferSource();
        const narrationGain = audioContext.createGain();
        narrationSource.buffer = narrationBuffer;
        narrationGain.gain.value = narrationVolume;
        narrationSource.connect(narrationGain).connect(destination);
        narrationSource.start(0);
        narrationSource.stop(Math.min(totalDuration, narrationBuffer.duration));
        scheduledSources.push(narrationSource);
      }

      if (musicUrl) {
        const musicBuffer = await loadAudioBuffer(audioContext, musicUrl);
        const musicSource = audioContext.createBufferSource();
        const musicGain = audioContext.createGain();
        musicSource.buffer = musicBuffer;
        musicSource.loop = true;
        musicGain.gain.value = musicVolume;
        musicSource.connect(musicGain).connect(destination);
        musicSource.start(0);
        musicSource.stop(totalDuration);
        scheduledSources.push(musicSource);
      }

      const mixedStream = new MediaStream([
        ...videoStream.getVideoTracks(),
        ...destination.stream.getAudioTracks()
      ]);

      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm"
      ];
      const mimeType = mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "";
      const recorder = new MediaRecorder(mixedStream, {
        mimeType: mimeType || undefined,
        videoBitsPerSecond: 6_000_000,
        audioBitsPerSecond: 192_000
      });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      const stopped = new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = () => reject(new Error("영상 녹화 중 오류가 발생했습니다."));
      });

      recorder.start(250);

      const fps = 30;
      const framesPerCard = Math.max(1, Math.round(secondsPerCard * fps));
      const transitionFrames = Math.max(1, Math.round(transitionSeconds * fps));
      const totalFrames = framesPerCard * images.length;

      for (let cardIndex = 0; cardIndex < images.length; cardIndex += 1) {
        for (let frame = 0; frame < framesPerCard; frame += 1) {
          const progress = frame / Math.max(1, framesPerCard - 1);
          const fadeIn = Math.min(1, frame / transitionFrames);
          const fadeOut = Math.min(1, (framesPerCard - 1 - frame) / transitionFrames);
          const fade = Math.min(fadeIn, fadeOut, 1);

          drawReelFrame(
            context,
            images[cardIndex],
            progress,
            cardIndex === 0 && frame < transitionFrames ? fadeIn : Math.max(0.08, fade),
            canvas.width,
            canvas.height
          );

          const currentFrame = cardIndex * framesPerCard + frame + 1;
          setRenderProgress(20 + Math.round((currentFrame / totalFrames) * 80));
          await wait(1000 / fps);
        }
      }

      recorder.stop();
      await stopped;
      scheduledSources.forEach((source) => {
        try { source.stop(); } catch {}
      });
      await audioContext.close();

      const blob = new Blob(chunks, { type: mimeType || "video/webm" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeTopic = (topic || "릴스").replace(/[\\/:*?"<>|]/g, "_");
      const videoFileName = `${safeTopic}_릴스.webm`;
      setLastVideoBlob(blob);
      setLastVideoName(videoFileName);
      link.href = url;
      link.download = videoFileName;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);

      setRenderProgress(100);
      setMessage(narrationUrl || musicUrl ? "음원이 포함된 릴스 영상 저장이 완료되었습니다." : "릴스 영상 저장이 완료되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "릴스 영상 저장에 실패했습니다.");
    } finally {
      setRenderingReel(false);
    }
  }

  function buildProject(): SavedProject {
    return {
      version: 1,
      savedAt: new Date().toISOString(),
      category,
      mode,
      audience,
      topic,
      commercialBrief,
      generated
    };
  }

  function saveProjectFile() {
    const project = buildProject();
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safeTopic = (topic || "새프로젝트").replace(/[\\/:*?"<>|]/g, "_");
    link.href = url;
    link.download = `${safeTopic}_AI콘텐츠프로젝트.json`;
    link.click();
    URL.revokeObjectURL(url);

    localStorage.setItem("ai-content-studio-project", JSON.stringify(project));
    setLastSavedAt(project.savedAt);
    setMessage("프로젝트 파일을 저장했습니다.");
  }

  async function loadProjectFile(file: File) {
    try {
      const project = JSON.parse(await file.text()) as SavedProject;
      if (!project?.generated?.cards?.length) {
        throw new Error("올바른 프로젝트 파일이 아닙니다.");
      }

      setCategory(project.category || "임신");
      setMode(project.mode || "auto");
      setAudience(project.audience || "일반 성인");
      setTopic(project.topic || "");
      if (project.commercialBrief) setCommercialBrief((current) => ({ ...current, ...project.commercialBrief }));
      setGenerated(project.generated);
      setEditingIndex(null);

      const savedAt = new Date().toISOString();
      const restored = { ...project, savedAt };
      localStorage.setItem("ai-content-studio-project", JSON.stringify(restored));
      setLastSavedAt(savedAt);
      setMessage("프로젝트를 불러왔습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "프로젝트를 불러오지 못했습니다.");
    } finally {
      if (projectFileRef.current) projectFileRef.current.value = "";
    }
  }

  function startNewProject() {
    const confirmed = window.confirm("현재 작업을 지우고 새 프로젝트를 시작할까요?");
    if (!confirmed) return;

    localStorage.removeItem("ai-content-studio-project");
    setCategory("임신");
    setMode("auto");
    setAudience("일반 성인");
    setTopic("");
    setGenerated(DEMO);
    setEditingIndex(null);
    setLastSavedAt("");
    setMessage("새 프로젝트를 시작했습니다.");
  }

  function moveCard(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= generated.cards.length) return;

    setGenerated((current) => {
      const nextCards = [...current.cards];
      [nextCards[index], nextCards[targetIndex]] = [nextCards[targetIndex], nextCards[index]];
      return { ...current, cards: nextCards };
    });

    setEditingIndex((current) => {
      if (current === index) return targetIndex;
      if (current === targetIndex) return index;
      return current;
    });

    setMessage(`${index + 1}장과 ${targetIndex + 1}장의 순서를 바꿨습니다.`);
  }

  function duplicateCard(index: number) {
    setGenerated((current) => {
      const sourceCard = current.cards[index];
      const copiedCard = {
        ...sourceCard,
        title: `${sourceCard.title} 복사본`
      };
      const nextCards = [...current.cards];
      nextCards.splice(index + 1, 0, copiedCard);
      return { ...current, cards: nextCards };
    });

    setEditingIndex(index + 1);
    setMessage(`${index + 1}장을 복제했습니다.`);
  }

  function deleteCard(index: number) {
    if (generated.cards.length <= 1) {
      setMessage("카드는 최소 1장 이상 남아 있어야 합니다.");
      return;
    }

    const confirmed = window.confirm(`${index + 1}장을 삭제할까요?`);
    if (!confirmed) return;

    setGenerated((current) => ({
      ...current,
      cards: current.cards.filter((_, cardIndex) => cardIndex !== index)
    }));

    setEditingIndex((current) => {
      if (current === index) return null;
      if (current !== null && current > index) return current - 1;
      return current;
    });

    setMessage(`${index + 1}장을 삭제했습니다.`);
  }

  function updateCard(index: number, patch: Partial<Card>) {
    setGenerated((current) => ({
      ...current,
      cards: current.cards.map((card, cardIndex) =>
        cardIndex === index ? { ...card, ...patch } : card
      )
    }));
  }

  async function rewriteSelectedCard(quickInstruction?: string) {
    const index = selectedCardIndex;
    const card = generated.cards[index];
    if (!card || cardRewriteLoading) return;

    const instruction = (quickInstruction || cardRewriteInstruction || "더 자연스럽고 읽기 쉽게 수정해줘").trim();
    setCardRewriteLoading(true);
    setLastRewriteReview(null);
    setMessage(`${index + 1}번 카드만 AI가 수정하고 있습니다...`);

    try {
      const response = await fetch("/api/rewrite-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          category,
          audience,
          instruction,
          index,
          card,
          previousCard: generated.cards[index - 1] || null,
          nextCard: generated.cards[index + 1] || null
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "카드 수정에 실패했습니다.");

      setCardHistory((current) => ({
        ...current,
        [index]: [...(current[index] || []), card].slice(-5)
      }));
      setLastRewriteBefore(card);
      setLastRewriteIndex(index);
      setLastRewriteReview(data.review || null);
      updateCard(index, data.card);
      setCardRewriteInstruction("");
      setMessage(`${index + 1}번 카드만 수정했습니다. 다른 카드는 그대로 유지했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "카드 수정 중 오류가 발생했습니다.");
    } finally {
      setCardRewriteLoading(false);
    }
  }

  function undoSelectedCardRewrite() {
    const index = selectedCardIndex;
    const history = cardHistory[index] || [];
    const previous = history[history.length - 1];
    if (!previous) {
      setMessage("되돌릴 AI 수정 이력이 없습니다.");
      return;
    }

    const currentCard = generated.cards[index];
    updateCard(index, previous);
    setCardHistory((current) => ({ ...current, [index]: history.slice(0, -1) }));
    setLastRewriteBefore(currentCard);
    setLastRewriteIndex(index);
    setLastRewriteReview({ score: 100, summary: "직전 AI 수정 전 내용으로 되돌렸습니다." });
    setMessage(`${index + 1}번 카드를 이전 내용으로 되돌렸습니다.`);
  }

  function linesToArray(value: string) {
    return value
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function updateCaption(value: string) {
    setGenerated((current) => ({ ...current, caption: value }));
  }

  function updateHashtags(value: string) {
    const hashtags = value
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => item.startsWith("#") ? item : `#${item}`);
    setGenerated((current) => ({ ...current, hashtags }));
  }

  function CardEditor({ card, index }: { card: Card; index: number }) {
    if (editingIndex !== index) return null;

  return (
      <div className="cardEditor">
        <div className="editorHeader">
          <strong>{index + 1}장 내용 수정</strong>
          <button type="button" onClick={() => setEditingIndex(null)}>편집 닫기</button>
        </div>

        <label className="editorField">
          작은 제목
          <input
            value={card.badge}
            onChange={(event) => updateCard(index, { badge: event.target.value })}
          />
        </label>

        <label className="editorField">
          큰 제목
          <textarea
            rows={2}
            value={card.title}
            onChange={(event) => updateCard(index, { title: event.target.value })}
          />
        </label>

        <label className="editorField">
          설명
          <textarea
            rows={3}
            value={card.body}
            onChange={(event) => updateCard(index, { body: event.target.value })}
          />
        </label>

        {card.type === "comparison" ? (
          <div className="editorTwoColumns">
            <label className="editorField">
              추천 선택 · 한 줄에 하나
              <textarea
                rows={5}
                value={card.goodItems.join("\n")}
                onChange={(event) => updateCard(index, { goodItems: linesToArray(event.target.value) })}
              />
            </label>
            <label className="editorField">
              주의할 선택 · 한 줄에 하나
              <textarea
                rows={5}
                value={card.cautionItems.join("\n")}
                onChange={(event) => updateCard(index, { cautionItems: linesToArray(event.target.value) })}
              />
            </label>
          </div>
        ) : card.type === "recipe" ? (
          <>
            <label className="editorField">
              재료 · 한 줄에 하나
              <textarea
                rows={3}
                value={card.details.join("\n")}
                onChange={(event) => updateCard(index, { details: linesToArray(event.target.value) })}
              />
            </label>
            <label className="editorField">
              조리 순서 · 한 줄에 하나
              <textarea
                rows={5}
                value={card.recipeSteps.join("\n")}
                onChange={(event) => updateCard(index, { recipeSteps: linesToArray(event.target.value) })}
              />
            </label>
          </>
        ) : (
          <label className="editorField">
            상세 항목 · 한 줄에 하나
            <textarea
              rows={6}
              value={card.details.join("\n")}
              onChange={(event) => updateCard(index, { details: linesToArray(event.target.value) })}
            />
          </label>
        )}

        <div className="designEditorSection">
          <strong>디자인 수정</strong>

          <label className="editorField">
            카드 색상
            <select
              value={card.designTone || ""}
              onChange={(event) =>
                updateCard(index, {
                  designTone: event.target.value
                    ? event.target.value as Card["designTone"]
                    : undefined
                })
              }
            >
              <option value="">자동 선택</option>
              <option value="green">초록</option>
              <option value="pink">분홍</option>
              <option value="blue">파랑</option>
              <option value="purple">보라</option>
              <option value="orange">주황</option>
              <option value="red">빨강</option>
            </select>
          </label>

          <label className="editorField">
            3D 일러스트
            <select
              value={card.visualKeyword || card.imageKeyword}
              onChange={(event) =>
                updateCard(index, { visualKeyword: event.target.value })
              }
            >
              {Object.entries(VISUALS).map(([key, item]) => (
                <option key={key} value={key}>
                  {item.emoji} {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="editorField">
            레이아웃
            <select
              value={card.layoutStyle || "standard"}
              onChange={(event) =>
                updateCard(index, {
                  layoutStyle: event.target.value as Card["layoutStyle"]
                })
              }
            >
              <option value="standard">기본형</option>
              <option value="imageTop">이미지 강조형</option>
              <option value="compact">내용 압축형</option>
            </select>
          </label>
        </div>

        <label className="editorField">
          하단 안내 문구
          <textarea
            rows={2}
            value={card.sourceNote}
            onChange={(event) => updateCard(index, { sourceNote: event.target.value })}
          />
        </label>

        <p className="editorHint">입력하는 즉시 카드에 반영됩니다. 수정 후 PNG를 저장하세요.</p>
      </div>
    );
  }

  function CardContent({ card, index }: { card: Card; index: number }) {
    if (card.type === "comparison") {
      return (
        <div className="compareGrid">
          <div className="compareBox good">
            <strong>추천 선택</strong>
            {card.goodItems.map((item, i) => <span key={i}>✓ {item}</span>)}
          </div>
          <div className="compareBox caution">
            <strong>주의할 선택</strong>
            {card.cautionItems.map((item, i) => <span key={i}>! {item}</span>)}
          </div>
        </div>
      );
    }

    if (card.type === "recipe") {
      return (
        <>
          {card.details.length > 0 && <div className="ingredient">{card.details.join(" · ")}</div>}
          <ol className="recipeList">
            {card.recipeSteps.map((step, i) => <li key={i}><b>{i + 1}</b><span>{step}</span></li>)}
          </ol>
        </>
      );
    }

    return (
      card.details?.length > 0 ? (
        <ul className="detailList">
          {card.details.map((detail, detailIndex) => (
            <li key={`${index}-${detailIndex}`}>{detail}</li>
          ))}
        </ul>
      ) : null
    );
  }

  function renderCard(card: Card, index: number, exportMode = false) {
    const visualKey = card.visualKeyword || card.imageKeyword;
    const baseVisual = VISUALS[visualKey] || VISUALS.checklist;
    const visual = { ...baseVisual, tone: card.designTone || baseVisual.tone };

    return (
      <div
        className={`contentCard storyCard story-${card.type} story-step-${index + 1} ${exportMode ? "carouselExport" : ""} ${card.type} ${index === 0 ? "hook" : ""} ${index === generated.cards.length - 1 ? "closing" : ""} ${isCommercialMode && commercialBrief.applyBrandStyle !== false ? "commercialBrandCard" : ""}`}
        style={isCommercialMode && commercialBrief.applyBrandStyle !== false ? ({ "--commercial-primary": brandPrimaryColor, "--commercial-secondary": brandSecondaryColor } as React.CSSProperties) : undefined}
        ref={(node) => {
          if (exportMode) exportCardRefs.current[index] = node;
          else cardRefs.current[index] = node;
        }}
      >
        <div className="topline">
          <span className="brand">{isCommercialMode ? (commercialBrief.brandName || brandName || "PRODUCT NOTE") : "AI HEALTH NOTE"}</span>
          <span className="count">{index + 1}/{generated.cards.length}</span>
        </div>

        <div className={`visualArea scene-${visual.tone}`}>
          <div className="blob blobOne" />
          <div className="blob blobTwo" />
          <div className="sceneSpark sparkOne">✦</div>
          <div className="sceneSpark sparkTwo">•</div>
          {isCommercialMode && commercialBrief.productImageDataUrl && [0, 2, 4, 7].includes(index) ? (
            <div className="productVisual">
              <img src={commercialBrief.productImageDataUrl} alt={commercialBrief.productName || "제품 이미지"} />
              <small>{commercialBrief.brandName || brandName}</small>
            </div>
          ) : (
            <div className="visual visual3d">
              {visual.secondary && <span className="sceneEmoji secondary">{visual.secondary}</span>}
              <span className="emoji mainEmoji">{visual.emoji}</span>
              {visual.tertiary && <span className="sceneEmoji tertiary">{visual.tertiary}</span>}
              <small>{visual.label}</small>
            </div>
          )}
        </div>

        <div className="copy">
          <span className="badge">{card.badge}</span>
          <h2>{card.title}</h2>
          <p>{card.body}</p>
          <CardContent card={card} index={index} />
        </div>

        {index === 0 && <div className="swipe">넘기면 음식·조리법·주의점까지 나옵니다 ↓</div>}
        {index > 0 && index < generated.cards.length - 1 && (
          <div className="progress">
            <span style={{ width: `${((index + 1) / generated.cards.length) * 100}%` }} />
          </div>
        )}
        {index === generated.cards.length - 1 && (
          <div className="saveCta">저장해 두고 필요할 때 다시 확인하세요</div>
        )}
        <div className="sourceNote">
          {card.sourceNote} · 자체 3D 일러스트
        </div>
      </div>
    );
  }

    const reelStoryboard = useMemo<ReelScenePlan[]>(() => {
    const roles = ["3초 훅", "궁금증", "핵심 정보", "비교·반전", "실천 방법", "구체적 팁", "주의사항", "저장·행동 유도"];
    return generated.cards.map((card, index) => {
      const cleanBody = (card.body || "").replace(/\s+/g, " ").trim();
      const subtitleLimit = reelStoryStyle === "informative" ? 44 : 32;
      let subtitle = (card.title || cleanBody || `장면 ${index + 1}`).trim();
      if (subtitle.length > subtitleLimit) subtitle = `${subtitle.slice(0, subtitleLimit).trim()}…`;

      let narration = cleanBody;
      if (card.details?.length) narration += ` ${card.details.slice(0, 2).join(". ")}.`;
      if (reelStoryStyle === "retention" && index < generated.cards.length - 1) {
        narration += index === 0 ? " 다음 장면에서 꼭 알아야 할 이유를 확인해 보세요." : " 다음 장면에서 이어서 확인해 보세요.";
      }
      if (reelStoryStyle === "sales" && index === generated.cards.length - 1) {
        narration += commercialBrief.purchaseLink ? " 자세한 내용은 구매 링크에서 확인하세요." : " 저장해 두고 필요할 때 다시 확인하세요.";
      }

      return {
        scene: index + 1,
        role: roles[index] || "정보 전달",
        subtitle,
        narration: narration.trim(),
        visual: card.imageSearchQuery || card.imageKeyword || "관련 이미지",
        duration: secondsPerCard
      };
    });
  }, [generated.cards, secondsPerCard, reelStoryStyle, commercialBrief.purchaseLink]);

  function buildReelScriptText() {
    const header = [
      `주제: ${topic || "콘텐츠"}`,
      `형식: 9:16 릴스`,
      `예상 길이: 약 ${Math.round(reelStoryboard.reduce((sum, scene) => sum + scene.duration, 0))}초`,
      `구성 방식: ${reelStoryStyle === "retention" ? "이탈 방지형" : reelStoryStyle === "sales" ? "판매 전환형" : "정보 전달형"}`,
      ""
    ];
    const scenes = reelStoryboard.flatMap((scene) => [
      `[장면 ${scene.scene} · ${scene.role} · ${scene.duration}초]`,
      `화면 자막: ${scene.subtitle}`,
      `나레이션: ${scene.narration}`,
      `이미지·영상 키워드: ${scene.visual}`,
      ""
    ]);
    return [...header, ...scenes].join("\n");
  }

  async function copyReelScript() {
    await navigator.clipboard.writeText(buildReelScriptText());
    setMessage("릴스 스토리보드와 나레이션을 복사했습니다.");
  }

  function downloadReelScript() {
    const blob = new Blob([buildReelScriptText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(topic || "content")}_reels_storyboard.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("릴스 스토리보드 파일을 저장했습니다.");
  }

  return (
    <main className={`app ${theme}`}>
      <section className="hero">
        <div>
          <p className="eyebrow">AI CONTENT STUDIO V38</p>
          <h1>구체적인 건강 캐러셀</h1>
          <p className="sub">원하는 작업만 상단 탭에서 선택해 간단하게 사용할 수 있습니다.</p>
        </div>
        <div className={`status ${status}`}>
          <span />
          {status === "checking" ? "AI 확인 중" : status === "online" ? "Ollama 연결됨" : "Ollama 연결 안 됨"}
        </div>
      </section>

      <section className="projectToolbar">
        <div className="projectStatus">
          <strong>프로젝트 저장</strong>
          <span>
            {lastSavedAt
              ? `자동 저장됨 · ${new Date(lastSavedAt).toLocaleString("ko-KR")}`
              : "수정하면 이 브라우저에 자동 저장됩니다."}
          </span>
        </div>

        <div className="projectActions">
          <button type="button" onClick={saveProjectFile}>파일로 저장</button>
          <button type="button" onClick={() => projectFileRef.current?.click()}>불러오기</button>
          <button type="button" className="newProjectButton" onClick={startNewProject}>새 프로젝트</button>
          <input
            ref={projectFileRef}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) loadProjectFile(file);
            }}
          />
        </div>
      </section>

      <nav className="studioMainTabs" aria-label="AI Content Studio 주요 메뉴">
        <button
          type="button"
          className={activeStudioTab === "create" ? "active" : ""}
          onClick={() => setActiveStudioTab("create")}
        >
          <strong>1. 콘텐츠 만들기</strong>
          <span>주제·제목·카드 편집</span>
        </button>
        <button
          type="button"
          className={activeStudioTab === "video" ? "active" : ""}
          onClick={() => setActiveStudioTab("video")}
        >
          <strong>2. 릴스 영상</strong>
          <span>미리보기·음성·저장</span>
        </button>
        <button
          type="button"
          className={activeStudioTab === "publish" ? "active" : ""}
          onClick={() => setActiveStudioTab("publish")}
        >
          <strong>3. 발행 준비</strong>
          <span>문구·예약·텔레그램</span>
        </button>
        <button
          type="button"
          className={activeStudioTab === "manage" ? "active" : ""}
          onClick={() => setActiveStudioTab("manage")}
        >
          <strong>4. 관리·통계</strong>
          <span>브랜드·계정·성과</span>
        </button>
        <button
          type="button"
          className={activeStudioTab === "system" ? "active" : ""}
          onClick={() => setActiveStudioTab("system")}
        >
          <strong>5. 설정·백업</strong>
          <span>진단·복원·초기화</span>
        </button>
      </nav>

      <div className="studioStepStrip">
        {[
          ["create", "1", "주제·카드"],
          ["video", "2", "릴스 영상"],
          ["publish", "3", "발행 준비"],
          ["manage", "4", "관리·성과"],
          ["system", "5", "백업·설정"]
        ].map(([tab, number, label]) => (
          <button
            key={tab}
            type="button"
            className={activeStudioTab === tab ? "active" : ""}
            onClick={() => setActiveStudioTab(tab as typeof activeStudioTab)}
          >
            <span>{number}</span><strong>{label}</strong>
          </button>
        ))}
      </div>

      <section className={`control studioTabPanel ${activeStudioTab === "create" ? "active" : ""}`}>
        <div className="categoryRow">
          {["건강", "임신", "반려동물", "피부"].map((item) => (
            <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>
              {item}
            </button>
          ))}
        </div>

        <div className="modeRow contentModeRow">
          <button className={mode === "auto" ? "active" : ""} onClick={() => setMode("auto")}>정보형</button>
          <button className={mode === "food" ? "active" : ""} onClick={() => setMode("food")}>식재료</button>
          <button className={mode === "symptom" ? "active" : ""} onClick={() => setMode("symptom")}>증상 해결</button>
          <button className={mode === "product" ? "active commercial" : ""} onClick={() => setMode("product")}>제품 소개</button>
          <button className={mode === "review" ? "active commercial" : ""} onClick={() => setMode("review")}>후기형</button>
          <button className={mode === "compare" ? "active commercial" : ""} onClick={() => setMode("compare")}>비교형</button>
          <button className={mode === "event" ? "active commercial" : ""} onClick={() => setMode("event")}>이벤트</button>
        </div>

        {isCommercialMode && (
          <div className="commercialBriefPanel">
            <div className="commercialBriefHeader">
              <div>
                <span>V33 광고 콘텐츠 모드</span>
                <strong>{mode === "product" ? "제품 소개" : mode === "review" ? "사용 후기" : mode === "compare" ? "제품 비교" : "이벤트·프로모션"}</strong>
              </div>
              <small>제공받은 사실만 입력하세요. AI가 확인되지 않은 효능이나 후기를 만들지 않도록 설계됩니다.</small>
            </div>
            <div className="commercialBriefGrid">
              <label>제품·서비스명<input value={commercialBrief.productName} onChange={(e) => updateCommercialBrief("productName", e.target.value)} placeholder="예: 장군 유산균" /></label>
              <label>브랜드명<input value={commercialBrief.brandName} onChange={(e) => updateCommercialBrief("brandName", e.target.value)} placeholder="예: 장군헬스" /></label>
              <label>가격·혜택<input value={commercialBrief.price} onChange={(e) => updateCommercialBrief("price", e.target.value)} placeholder="예: 29,900원 / 첫 구매 10%" /></label>
              <label>구매 링크<input value={commercialBrief.purchaseLink} onChange={(e) => updateCommercialBrief("purchaseLink", e.target.value)} placeholder="https://..." /></label>
              <label className="wide productImageField">제품 대표 이미지
                <div className="productImageUploadRow">
                  <input ref={productImageFileRef} type="file" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleProductImage(file); }} />
                  {commercialBrief.productImageDataUrl && <button type="button" onClick={clearProductImage}>이미지 제거</button>}
                </div>
                {commercialBrief.productImageDataUrl && <div className="productImagePreview"><img src={commercialBrief.productImageDataUrl} alt="제품 미리보기" /><span>1·3·5·8번 카드에 자동 배치</span></div>}
              </label>
              <label className="wide commercialBrandToggle"><input type="checkbox" checked={commercialBrief.applyBrandStyle !== false} onChange={(e) => updateCommercialBrief("applyBrandStyle", e.target.checked)} /> 현재 브랜드 색상 자동 적용</label>
              <label className="wide">검증된 특징<textarea value={commercialBrief.features} onChange={(e) => updateCommercialBrief("features", e.target.value)} placeholder="광고주가 제공한 핵심 특징을 줄바꿈으로 입력" /></label>
              {mode === "review" && <label className="wide">실제 사용 메모<textarea value={commercialBrief.reviewNotes} onChange={(e) => updateCommercialBrief("reviewNotes", e.target.value)} placeholder="직접 확인한 장점, 아쉬운 점, 사용 기간" /></label>}
              {mode === "compare" && <label className="wide">비교 대상·기준<textarea value={commercialBrief.compareTarget} onChange={(e) => updateCommercialBrief("compareTarget", e.target.value)} placeholder="예: 일반 제품과 비교 / 가격·성분·사용 편의성" /></label>}
              {mode === "event" && <label className="wide">이벤트 내용<textarea value={commercialBrief.eventBenefit} onChange={(e) => updateCommercialBrief("eventBenefit", e.target.value)} placeholder="기간, 할인, 쿠폰, 참여 방법, 유의사항" /></label>}
              <label>광고 목적<select value={commercialBrief.campaignGoal} onChange={(e) => updateCommercialBrief("campaignGoal", e.target.value)}><option>판매 전환</option><option>브랜드 인지도</option><option>리뷰 유도</option><option>이벤트 참여</option><option>팔로워 증가</option></select></label>
              <label>광고 표시<input value={commercialBrief.disclosure} onChange={(e) => updateCommercialBrief("disclosure", e.target.value)} placeholder="예: 광고·협찬 콘텐츠" /></label>
            </div>
          </div>
        )}

        <div className="audienceRow">
          <span className="fieldLabel compact">대상 독자</span>
          {["일반 성인", "임산부", "초보 보호자", "바쁜 직장인"].map((item) => (
            <button
              key={item}
              className={`audienceChip ${audience === item ? "active" : ""}`}
              onClick={() => setAudience(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>

        <label>
          {isCommercialMode ? "콘텐츠 방향" : "콘텐츠 주제"}
          <input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={isCommercialMode ? "예: 바쁜 직장인을 위한 간편한 장 건강 관리" : "예: 브로콜리 / 임신 중 변비 / 그린키위"} />
        </label>

        <button className="generate" onClick={generate} disabled={loading}>
          {loading ? "AI가 콘텐츠를 만드는 중... 처음 실행은 1~3분 걸릴 수 있습니다." : isCommercialMode ? "광고 콘텐츠 자동 생성" : "AI 콘텐츠 자동 생성"}
        </button>
        {message && <p className="message">{message}</p>}
      </section>

      {generated.planSummary && (
        <section className={`plannerPanel studioTabPanel ${activeStudioTab === "create" ? "active" : ""}`}>
          <div className="plannerHeader">
            <div>
              <span>V31-2 이탈 방지 AI WRITER</span>
              <h2>{generated.planSummary.hook}</h2>
            </div>
            <div className="plannerMeta">
              <span><b>타겟</b>{generated.planSummary.target}</span>
              <span><b>검색 의도</b>{generated.planSummary.intent}</span>
            </div>
          </div>

          <div className="plannerGrid">
            <div className="plannerBlock">
              <b>사람들이 궁금해할 핵심 질문</b>
              <div className="plannerQuestions">
                {(Array.isArray(generated.planSummary.questions) ? generated.planSummary.questions : []).map((question, i) => <span key={i}>Q{i + 1}. {question}</span>)}
              </div>
            </div>
            <div className="plannerBlock">
              <b>6장 스토리 흐름</b>
              <div className="storyFlow">
                {(Array.isArray(generated.planSummary.story) ? generated.planSummary.story : []).map((step, i) => <span key={i}><em>{i + 1}</em>{step}</span>)}
              </div>
            </div>
          </div>

          <div className="factChips plannerFacts">
            {(Array.isArray(generated.planSummary.keyFacts) ? generated.planSummary.keyFacts : []).map((fact, i) => <span key={i}>{fact}</span>)}
          </div>
        </section>
      )}

      {generated.quality && (
        <section className={`qualityPanel studioTabPanel ${activeStudioTab === "create" ? "active" : ""}`}>
          <div className="qualityScore">
            <span>콘텐츠 검수 점수</span>
            <strong>{generated.quality.score}<small>/100</small></strong>
          </div>
          <div>
            <b>통과 항목</b>
            <div className="qualityTags">
              {generated.quality.strengths.map((item, index) => <span key={index}>✓ {item}</span>)}
            </div>
          </div>
          <div>
            <b>자동 점검</b>
            <div className="qualityTags muted">
              {generated.quality.checks.map((item, index) => <span key={index}>{item}</span>)}
            </div>
          </div>
          {generated.quality.metrics && (
            <div className="qualityMetrics">
              <b>세부 점수</b>
              <div className="metricGrid">
                <span>훅 <strong>{generated.quality.metrics.hook}</strong></span>
                <span>흐름 <strong>{generated.quality.metrics.flow}</strong></span>
                <span>가독성 <strong>{generated.quality.metrics.readability}</strong></span>
                <span>안전성 <strong>{generated.quality.metrics.safety}</strong></span>
                <span>중복 방지 <strong>{generated.quality.metrics.uniqueness}</strong></span>
              </div>
              {!!generated.quality.improvements?.length && (
                <div className="qualityAdvice">
                  {generated.quality.improvements.map((item, index) => <p key={index}>• {item}</p>)}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      <section className={`toolbar studioTabPanel ${activeStudioTab === "create" ? "active" : ""}`}>
        <div>
          <strong>생성 결과</strong>
          <span>캐러셀 1080 × 1350(4:5) · 릴스 1080 × 1920(9:16) · 전체 백업·복원·진단·초기화·완성도 점검</span>
        </div>
        <div className="actions">
          <button onClick={async () => {
            await navigator.clipboard.writeText(`${generated.caption}\n\n${generated.hashtags.join(" ")}`);
            setMessage("캡션과 해시태그를 복사했습니다.");
          }}>캡션 복사</button>
          <button onClick={downloadZip} disabled={packagingCarousel || packagingComplete}>
            {packagingCarousel ? "캐러셀 생성 중..." : "📦 인스타 캐러셀"}
          </button>
          <button className="primary completePackageButton" onClick={downloadCompletePackage} disabled={packagingComplete || packagingCarousel}>
            {packagingComplete ? "전체 패키지 생성 중..." : "🚀 캐러셀+릴스 원클릭 패키지"}
          </button>
        </div>
      </section>

      <section className={`reelStudio studioTabPanel ${activeStudioTab === "video" ? "active" : ""}`}>
        <div className="reelStudioHeader">
          <div>
            <span className="reelEyebrow">V13 REELS MAKER</span>
            <h2>카드를 릴스 영상으로 만들기</h2>
            <p>장면 시간을 정한 뒤 미리보기하고 세로 영상으로 저장합니다.</p>
          </div>
          <div className="reelDuration">
            총 약 <strong>{Math.round(generated.cards.length * secondsPerCard)}초</strong>
          </div>
        </div>

        <div className="reelStoryboardPanel">
          <div className="reelStoryboardTop">
            <div>
              <span className="reelStoryboardBadge">V36 AI STORYBOARD</span>
              <h3>릴스 장면·자막·나레이션 자동 설계</h3>
              <p>카드 6장을 짧은 장면으로 재구성해 시청자가 중간에 이탈하지 않도록 연결합니다.</p>
            </div>
            <label>
              영상 구성
              <select value={reelStoryStyle} onChange={(event) => setReelStoryStyle(event.target.value as "retention" | "informative" | "sales")}>
                <option value="retention">이탈 방지형</option>
                <option value="informative">정보 전달형</option>
                <option value="sales">판매 전환형</option>
              </select>
            </label>
          </div>
          <div className="reelScenePlanList">
            {reelStoryboard.map((scene) => (
              <button key={scene.scene} type="button" className={reelCardIndex === scene.scene - 1 ? "active" : ""} onClick={() => setReelCardIndex(scene.scene - 1)}>
                <strong>{scene.scene}</strong>
                <span><b>{scene.role}</b><small>{scene.subtitle}</small></span>
                <em>{scene.duration}초</em>
              </button>
            ))}
          </div>
          <div className="reelStoryboardDetail">
            <div><b>현재 장면 자막</b><p>{reelStoryboard[reelCardIndex]?.subtitle || "-"}</p></div>
            <div><b>나레이션</b><p>{reelStoryboard[reelCardIndex]?.narration || "-"}</p></div>
            <div><b>이미지·영상 키워드</b><p>{reelStoryboard[reelCardIndex]?.visual || "-"}</p></div>
          </div>
          <div className="reelStoryboardActions">
            <button type="button" onClick={copyReelScript}>전체 스크립트 복사</button>
            <button type="button" className="primary" onClick={downloadReelScript}>스토리보드 TXT 저장</button>
          </div>
        </div>

        <div className="reelWorkspace">
          <div className="reelPreviewPhone">
            <div className="reelPreviewScreen">
              {generated.cards[reelCardIndex] && (() => {
                const previewCard = generated.cards[reelCardIndex];
                const previewVisualKey = previewCard.visualKeyword || previewCard.imageKeyword;
                const previewBaseVisual = VISUALS[previewVisualKey] || VISUALS.checklist;
                const previewVisual = {
                  ...previewBaseVisual,
                  tone: previewCard.designTone || previewBaseVisual.tone
                };
                return (
                  <div
                    className={`reelScene scene-${previewVisual.tone} ${reelPlaying ? "playing" : ""}`}
                    key={`${reelCardIndex}-${reelPlaying}`}
                    style={{ animationDuration: `${secondsPerCard}s` }}
                  >
                    <div className="reelGlow" />
                    <div className="reelVisual">
                      {previewVisual.secondary && <span>{previewVisual.secondary}</span>}
                      <b>{previewVisual.emoji}</b>
                      {previewVisual.tertiary && <span>{previewVisual.tertiary}</span>}
                    </div>
                    <div className="reelText">
                      <small>{previewCard.badge}</small>
                      <h3>{previewCard.title}</h3>
                      <p>{previewCard.body}</p>
                    </div>
                    <div className="reelCounter">
                      {reelCardIndex + 1}/{generated.cards.length}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="reelControls">
            <label>
              카드 한 장 표시 시간
              <select
                value={secondsPerCard}
                onChange={(event) => setSecondsPerCard(Number(event.target.value))}
                disabled={renderingReel}
              >
                <option value={2}>2초 · 빠르게</option>
                <option value={3}>3초 · 기본</option>
                <option value={4}>4초 · 읽기 편하게</option>
                <option value={5}>5초 · 설명형</option>
              </select>
            </label>

            <label>
              페이드 시간
              <select
                value={transitionSeconds}
                onChange={(event) => setTransitionSeconds(Number(event.target.value))}
                disabled={renderingReel}
              >
                <option value={0.4}>0.4초</option>
                <option value={0.6}>0.6초</option>
                <option value={0.8}>0.8초</option>
                <option value={1}>1초</option>
              </select>
            </label>

            <div className="audioControlPanel">
              <div className="audioPanelTitle">
                <strong>AI 음성</strong>
                <label className="switchLabel">
                  <input
                    type="checkbox"
                    checked={voiceEnabled}
                    onChange={(event) => {
                      setVoiceEnabled(event.target.checked);
                      if (!event.target.checked) stopVoicePreview();
                    }}
                  />
                  <span>{voiceEnabled ? "사용" : "사용 안 함"}</span>
                </label>
              </div>

              <label>
                목소리
                <select
                  value={selectedVoiceName}
                  onChange={(event) => setSelectedVoiceName(event.target.value)}
                  disabled={!voiceEnabled || renderingReel}
                >
                  {availableVoices.length === 0 && <option value="">브라우저 기본 음성</option>}
                  {availableVoices.map((voice) => (
                    <option key={`${voice.name}-${voice.lang}`} value={voice.name}>
                      {voice.lang.toLowerCase().startsWith("ko") ? "한국어 · " : ""}
                      {voice.name}
                    </option>
                  ))}
                </select>
              </label>

              <div className="audioRangeGrid">
                <label>
                  말하기 속도 {voiceRate.toFixed(1)}
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.1"
                    value={voiceRate}
                    onChange={(event) => setVoiceRate(Number(event.target.value))}
                    disabled={!voiceEnabled || renderingReel}
                  />
                </label>
                <label>
                  목소리 높이 {voicePitch.toFixed(1)}
                  <input
                    type="range"
                    min="0.7"
                    max="1.3"
                    step="0.1"
                    value={voicePitch}
                    onChange={(event) => setVoicePitch(Number(event.target.value))}
                    disabled={!voiceEnabled || renderingReel}
                  />
                </label>
              </div>

              <button
                type="button"
                className="audioPreviewButton"
                onClick={() => previewSpeaking ? stopVoicePreview() : speakCard(reelCardIndex)}
                disabled={!voiceEnabled || renderingReel}
              >
                {previewSpeaking ? "음성 중지" : "현재 장면 음성 듣기"}
              </button>
            </div>

            <div className="audioControlPanel">
              <div className="audioPanelTitle">
                <strong>저장용 나레이션</strong>
                <span>{narrationName || "선택된 나레이션 없음"}</span>
              </div>

              <p className="audioPanelHelp">
                휴대폰 녹음, 무료 TTS로 만든 MP3·WAV 파일을 넣으면 영상 저장 시 실제 음원으로 합쳐집니다.
              </p>

              <div className="musicButtonRow">
                <button
                  type="button"
                  onClick={() => narrationFileRef.current?.click()}
                  disabled={renderingReel}
                >
                  나레이션 선택
                </button>
                <button
                  type="button"
                  onClick={toggleNarrationPreview}
                  disabled={!narrationUrl || renderingReel}
                >
                  재생·정지
                </button>
                <button
                  type="button"
                  onClick={clearNarration}
                  disabled={!narrationUrl || renderingReel}
                >
                  제거
                </button>
              </div>

              <input
                ref={narrationFileRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleNarrationFile(file);
                }}
              />

              <label>
                나레이션 볼륨 {Math.round(narrationVolume * 100)}%
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.05"
                  value={narrationVolume}
                  onChange={(event) => setNarrationVolume(Number(event.target.value))}
                  disabled={!narrationUrl || renderingReel}
                />
              </label>

              <audio ref={narrationAudioRef} src={narrationUrl || undefined} preload="metadata" />
            </div>

            <div className="audioControlPanel">
              <div className="audioPanelTitle">
                <strong>배경음악</strong>
                <span>{musicName || "선택된 음악 없음"}</span>
              </div>

              <div className="musicButtonRow">
                <button
                  type="button"
                  onClick={() => musicFileRef.current?.click()}
                  disabled={renderingReel}
                >
                  음악 파일 선택
                </button>
                <button
                  type="button"
                  onClick={toggleMusicPreview}
                  disabled={!musicUrl || renderingReel}
                >
                  재생·정지
                </button>
                <button
                  type="button"
                  onClick={clearMusic}
                  disabled={!musicUrl || renderingReel}
                >
                  제거
                </button>
              </div>

              <input
                ref={musicFileRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.ogg"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleMusicFile(file);
                }}
              />

              <label>
                배경음악 볼륨 {Math.round(musicVolume * 100)}%
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={musicVolume}
                  onChange={(event) => setMusicVolume(Number(event.target.value))}
                  disabled={!musicUrl || renderingReel}
                />
              </label>

              <audio ref={musicAudioRef} src={musicUrl || undefined} loop preload="metadata" />
            </div>

            <div className="reelNavigation">
              <button
                type="button"
                onClick={() => setReelCardIndex((current) => Math.max(0, current - 1))}
                disabled={reelCardIndex === 0 || renderingReel}
              >
                이전 장면
              </button>
              <button
                type="button"
                className="reelPlayButton"
                onClick={() => {
                  if (!reelPlaying && reelCardIndex >= generated.cards.length - 1) {
                    setReelCardIndex(0);
                  }
                  setReelPlaying((current) => !current);
                }}
                disabled={renderingReel}
              >
                {reelPlaying ? "일시정지" : "미리보기 재생"}
              </button>
              <button
                type="button"
                onClick={() =>
                  setReelCardIndex((current) =>
                    Math.min(generated.cards.length - 1, current + 1)
                  )
                }
                disabled={reelCardIndex >= generated.cards.length - 1 || renderingReel}
              >
                다음 장면
              </button>
            </div>

            <button
              type="button"
              className="renderReelButton"
              onClick={exportReelVideo}
              disabled={renderingReel}
            >
              {renderingReel ? `영상 만드는 중 ${renderProgress}%` : "음원 포함 릴스 저장"}
            </button>

            {renderingReel && (
              <div className="renderProgress">
                <span style={{ width: `${renderProgress}%` }} />
              </div>
            )}

            <p className="reelFormatNote">
              선택한 나레이션과 배경음악이 실제 영상에 합쳐집니다. 무료 브라우저 방식이라 파일 형식은 WebM이며 크롬·엣지에서 저장됩니다.
            </p>
          </div>
        </div>
      </section>

      <section className={`platformStudio studioTabPanel ${activeStudioTab === "publish" ? "active" : ""}`}>
        <div className="platformHeader">
          <div>
            <span className="platformEyebrow">V16 PUBLISH KIT</span>
            <h2>플랫폼별 업로드 준비</h2>
            <p>제목·캡션·해시태그·표지·영상을 한 번에 정리합니다.</p>
          </div>
          <button type="button" className="packageDownloadButton" onClick={downloadUploadPackage}>
            전체 업로드 ZIP 저장
          </button>
        </div>

        <div className="platformTabs">
          {(["instagram", "youtube", "tiktok"] as PlatformKey[]).map((key) => (
            <button
              type="button"
              key={key}
              className={selectedPlatform === key ? "active" : ""}
              onClick={() => setSelectedPlatform(key)}
            >
              {platformLabel(key)}
            </button>
          ))}
        </div>

        <div className="platformEditor">
          <div className="platformField">
            <div className="platformFieldHeader">
              <strong>제목</strong>
              <span>{platformCopies[selectedPlatform].title.length}자</span>
            </div>
            <textarea readOnly value={platformCopies[selectedPlatform].title} rows={2} />
            <button
              type="button"
              onClick={() =>
                copyText(platformCopies[selectedPlatform].title, `${selectedPlatform}-title`)
              }
            >
              {copiedField === `${selectedPlatform}-title` ? "복사됨" : "제목 복사"}
            </button>
          </div>

          <div className="platformField wide">
            <div className="platformFieldHeader">
              <strong>설명·캡션</strong>
              <span>{platformCopies[selectedPlatform].description.length}자</span>
            </div>
            <textarea readOnly value={platformCopies[selectedPlatform].description} rows={8} />
            <button
              type="button"
              onClick={() =>
                copyText(platformCopies[selectedPlatform].description, `${selectedPlatform}-description`)
              }
            >
              {copiedField === `${selectedPlatform}-description` ? "복사됨" : "캡션 복사"}
            </button>
          </div>

          <div className="platformField">
            <div className="platformFieldHeader">
              <strong>해시태그</strong>
              <span>자동 정리</span>
            </div>
            <textarea readOnly value={platformCopies[selectedPlatform].hashtags} rows={5} />
            <button
              type="button"
              onClick={() =>
                copyText(platformCopies[selectedPlatform].hashtags, `${selectedPlatform}-hashtags`)
              }
            >
              {copiedField === `${selectedPlatform}-hashtags` ? "복사됨" : "해시태그 복사"}
            </button>
          </div>
        </div>

        <div className="platformFooter">
          <div className={`videoReadyBadge ${lastVideoBlob ? "ready" : ""}`}>
            {lastVideoBlob
              ? `영상 준비 완료 · ${lastVideoName}`
              : "영상 미생성 · 먼저 위에서 릴스 영상을 저장하세요"}
          </div>
          <button
            type="button"
            className="textDownloadButton"
            onClick={() => downloadPlatformText(selectedPlatform)}
          >
            현재 플랫폼 문구 TXT 저장
          </button>
        </div>
      </section>

      <section className={`systemStudio studioTabPanel ${activeStudioTab === "system" ? "active" : ""}`}>
        <div className="systemHeader">
          <div>
            <span className="systemEyebrow">V25 SYSTEM CENTER</span>
            <h2>백업·복원·시스템 진단</h2>
            <p>프로젝트 전체 데이터를 안전하게 보관하고 주요 기능이 정상인지 한 번에 확인합니다.</p>
          </div>
          <div className="systemVersionBadge">완성 버전 V25</div>
        </div>

        <div className="systemActionGrid">
          <article>
            <span>전체 백업</span>
            <strong>모든 설정과 기록 저장</strong>
            <p>프로젝트, 예약, 브랜드, 계정, 성과와 추천 기록을 JSON 파일 하나로 저장합니다.</p>
            <button type="button" onClick={exportFullBackup}>백업 파일 저장</button>
          </article>

          <article>
            <span>전체 복원</span>
            <strong>백업 파일 불러오기</strong>
            <p>저장해 둔 JSON 백업 파일로 기존 설정과 기록을 다시 복원합니다.</p>
            <label className="systemRestoreButton">
              백업 파일 선택
              <input
                ref={backupInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(event) => void importFullBackup(event.target.files?.[0] || null)}
              />
            </label>
          </article>

          <article>
            <span>시스템 진단</span>
            <strong>핵심 기능 상태 확인</strong>
            <p>AI 생성 API, 텔레그램, 계정, 브랜드, 자동화와 저장 상태를 점검합니다.</p>
            <button
              type="button"
              disabled={diagnosticRunning}
              onClick={() => void runSystemDiagnostics()}
            >
              {diagnosticRunning ? "진단 중..." : "전체 기능 진단"}
            </button>
          </article>

          <article className="systemDangerCard">
            <span>전체 초기화</span>
            <strong>모든 로컬 데이터 삭제</strong>
            <p>현재 브라우저에 저장된 Studio 데이터를 모두 삭제하고 처음 상태로 되돌립니다.</p>
            <button type="button" onClick={clearAllStudioData}>전체 데이터 초기화</button>
          </article>
        </div>

        <div className="systemStatsGrid">
          <div><span>생성 카드</span><strong>{generated?.cards?.length || 0}</strong></div>
          <div><span>업로드 대기열</span><strong>{uploadQueue.length}</strong></div>
          <div><span>등록 계정</span><strong>{socialAccounts.length}</strong></div>
          <div><span>성과 기록</span><strong>{contentMetrics.length}</strong></div>
          <div><span>브랜드 프리셋</span><strong>{brandPresets.length}</strong></div>
          <div><span>최적화 기록</span><strong>{optimizationHistory.length}</strong></div>
        </div>

        {diagnostics.length === 0 ? (
          <div className="systemDiagnosticEmpty">
            아직 시스템 진단을 실행하지 않았습니다.
          </div>
        ) : (
          <div className="systemDiagnosticPanel">
            <div className="systemDiagnosticHeader">
              <strong>진단 결과</strong>
              <div>
                <span className="diagOk">정상 {diagnosticSummary().ok}</span>
                <span className="diagWarning">확인 {diagnosticSummary().warning}</span>
                <span className="diagError">오류 {diagnosticSummary().error}</span>
              </div>
            </div>

            <div className="systemDiagnosticList">
              {diagnostics.map((item) => (
                <article key={item.id}>
                  <span className={`diagnosticDot ${item.status}`} />
                  <div>
                    <strong>{item.label}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <span className={`diagnosticStatus ${item.status}`}>
                    {item.status === "ok" ? "정상" : item.status === "warning" ? "확인 필요" : "오류"}
                  </span>
                </article>
              ))}
            </div>
          </div>
        )}

        <div className="systemCompletion">
          <div>
            <span>AI Content Studio 구축 진행률</span>
            <strong>100%</strong>
          </div>
          <div className="systemProgressTrack"><span /></div>
          <p>
            콘텐츠 기획·작성·편집·릴스 제작·음성·음악·업로드 패키지·텔레그램 승인·예약·캘린더·자동 생성·브랜드·성과·계정·최적화·백업 기능이 모두 포함되었습니다.
          </p>
        </div>

        {backupImportedAt && (
          <div className="systemImportedNotice">
            최근 복원: {new Date(backupImportedAt).toLocaleString("ko-KR")}
          </div>
        )}
      </section>

      <section className={`optimizationStudio studioTabPanel ${activeStudioTab === "manage" ? "active" : ""}`}>
        <div className="optimizationHeader">
          <div>
            <span className="optimizationEyebrow">V24 AI OPTIMIZATION</span>
            <h2>AI 콘텐츠 최적화 추천</h2>
            <p>기존 성과를 분석해 제목, 해시태그, 업로드 시간과 다음 콘텐츠 방향을 추천합니다.</p>
          </div>
          <div className="optimizationDataBadge">
            성과 데이터 <strong>{contentMetrics.length}</strong>건
          </div>
        </div>

        <div className="optimizationInputPanel">
          <label>
            분석할 플랫폼
            <select
              value={optimizationPlatform}
              onChange={(event) => setOptimizationPlatform(event.target.value as PlatformKey)}
            >
              <option value="instagram">인스타그램 릴스</option>
              <option value="youtube">유튜브 쇼츠</option>
              <option value="tiktok">틱톡</option>
            </select>
          </label>
          <label className="optimizationTopicField">
            최적화할 주제
            <input
              value={optimizationTopic}
              onChange={(event) => setOptimizationTopic(event.target.value)}
              placeholder="비워두면 현재 콘텐츠 주제를 사용합니다."
            />
          </label>
          <button
            type="button"
            disabled={optimizationLoading}
            onClick={() => void createOptimizationRecommendation()}
          >
            {optimizationLoading ? "분석 중..." : "최적화 추천 만들기"}
          </button>
        </div>

        {optimizationResult ? (
          <div className="optimizationResultGrid">
            <div className="optimizationCard titleRecommendation">
              <div className="optimizationCardHeader">
                <span>제목 추천</span>
                <small>{platformLabel(optimizationResult.platform)}</small>
              </div>
              <div className="recommendedTitleList">
                {optimizationResult.titleSuggestions.map((titleValue, index) => (
                  <article key={`${titleValue}-${index}`}>
                    <span>{index + 1}</span>
                    <strong>{titleValue}</strong>
                    <button type="button" onClick={() => applyRecommendedTitle(titleValue)}>적용</button>
                  </article>
                ))}
              </div>
            </div>

            <div className="optimizationCard">
              <div className="optimizationCardHeader">
                <span>해시태그 추천</span>
                <button type="button" onClick={copyRecommendedHashtags}>전체 복사</button>
              </div>
              <div className="recommendedHashtags">
                {optimizationResult.hashtagSuggestions.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            </div>

            <div className="optimizationCard bestTimeCard">
              <span>추천 업로드 시간</span>
              <strong>{optimizationResult.bestHour}</strong>
              <small>성과 기록의 참여율과 클릭 반응을 기준으로 계산</small>
            </div>

            <div className="optimizationCard directionCard">
              <span>다음 콘텐츠 방향</span>
              <strong>{optimizationResult.contentDirection}</strong>
            </div>

            <div className="optimizationReason">
              <strong>추천 근거</strong>
              <p>{optimizationResult.reason}</p>
            </div>
          </div>
        ) : (
          <div className="optimizationEmpty">
            플랫폼과 주제를 선택한 뒤 최적화 추천을 만들어 보세요.
          </div>
        )}

        <div className="optimizationHistorySection">
          <div className="optimizationHistoryHeader">
            <strong>최근 추천 기록</strong>
            <span>{optimizationHistory.length}건</span>
          </div>

          {optimizationHistory.length === 0 ? (
            <div className="optimizationHistoryEmpty">아직 추천 기록이 없습니다.</div>
          ) : (
            <div className="optimizationHistoryList">
              {optimizationHistory.slice(0, 8).map((item) => (
                <article key={item.id}>
                  <span className={`optimizationPlatform optimization-${item.platform}`}>
                    {platformLabel(item.platform)}
                  </span>
                  <div>
                    <strong>{item.sourceTopic}</strong>
                    <small>{new Date(item.createdAt).toLocaleString("ko-KR")} · 추천 시간 {item.bestHour}</small>
                  </div>
                  <button type="button" onClick={() => setOptimizationResult(item)}>보기</button>
                  <button type="button" className="delete" onClick={() => deleteOptimizationHistory(item.id)}>삭제</button>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="optimizationNotice">
          성과 데이터가 많을수록 추천 정확도가 높아집니다. 현재는 저장된 성과 기록을 로컬에서 분석하며 유료 API는 사용하지 않습니다.
        </div>
      </section>

      <section className={`accountStudio studioTabPanel ${activeStudioTab === "manage" ? "active" : ""}`}>
        <div className="accountHeader">
          <div>
            <span className="accountEyebrow">V23 MULTI ACCOUNT</span>
            <h2>멀티 계정 관리</h2>
            <p>플랫폼별 여러 계정을 등록하고 기본 발행 계정과 브랜드를 연결합니다.</p>
          </div>
          <div className="accountTotalBadge">
            전체 계정 <strong>{socialAccounts.length}</strong>개
          </div>
        </div>

        <div className="accountSummaryGrid">
          {accountSummary.map((summary) => (
            <article key={summary.platform}>
              <span className={`accountPlatform account-${summary.platform}`}>
                {platformLabel(summary.platform)}
              </span>
              <strong>{summary.total}개</strong>
              <small>활성 {summary.active}개</small>
              <p>
                기본: {summary.defaultAccount?.accountName || "미설정"}
              </p>
            </article>
          ))}
        </div>

        <div className="accountMainGrid">
          <div className="accountCreatePanel">
            <h3>새 계정 등록</h3>
            <div className="accountFieldGrid">
              <label>
                플랫폼
                <select value={accountPlatform} onChange={(event) => setAccountPlatform(event.target.value as PlatformKey)}>
                  <option value="instagram">인스타그램</option>
                  <option value="youtube">유튜브</option>
                  <option value="tiktok">틱톡</option>
                </select>
              </label>
              <label>
                계정 이름
                <input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="예: 건강정보 채널" />
              </label>
              <label>
                계정 아이디
                <input value={accountHandle} onChange={(event) => setAccountHandle(event.target.value)} placeholder="@account 또는 채널명" />
              </label>
              <label>
                콘텐츠 분야
                <input value={accountCategory} onChange={(event) => setAccountCategory(event.target.value)} placeholder="건강·임신" />
              </label>
              <label className="accountBrandField">
                연결할 브랜드 프리셋
                <select value={accountBrandPresetId} onChange={(event) => setAccountBrandPresetId(event.target.value)}>
                  <option value="">브랜드 연결 안 함</option>
                  {brandPresets.map((preset) => (
                    <option value={preset.id} key={preset.id}>{preset.name}</option>
                  ))}
                </select>
              </label>
              <label className="accountMemoField">
                메모
                <textarea rows={3} value={accountMemo} onChange={(event) => setAccountMemo(event.target.value)} placeholder="운영 목적이나 업로드 규칙을 기록하세요." />
              </label>
            </div>
            <button type="button" className="addAccountButton" onClick={addSocialAccount}>계정 등록</button>
          </div>

          <div className="accountPublishPanel">
            <h3>플랫폼별 발행 계정</h3>
            {(["instagram", "youtube", "tiktok"] as PlatformKey[]).map((platform) => {
              const accounts = socialAccounts.filter((account) => account.platform === platform && account.isActive);
              return (
                <label key={platform}>
                  <span>{platformLabel(platform)}</span>
                  <select
                    value={selectedAccountByPlatform[platform]}
                    onChange={(event) => setSelectedAccountByPlatform((current) => ({
                      ...current,
                      [platform]: event.target.value
                    }))}
                  >
                    <option value="">계정 선택 안 함</option>
                    {accounts.map((account) => (
                      <option value={account.id} key={account.id}>
                        {account.accountName}{account.handle ? ` · ${account.handle}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}

            <div className="accountCurrentSelection">
              <span>현재 콘텐츠 발행 대상</span>
              <strong>{platformLabel(selectedPlatform)}</strong>
              <p>{selectedAccountLabel(selectedPlatform)}</p>
            </div>
          </div>
        </div>

        <div className="accountListToolbar">
          <div>
            {(["all", "instagram", "youtube", "tiktok"] as const).map((platform) => (
              <button
                type="button"
                key={platform}
                className={accountFilter === platform ? "active" : ""}
                onClick={() => setAccountFilter(platform)}
              >
                {platform === "all" ? "전체" : platformLabel(platform)}
              </button>
            ))}
          </div>
          <span>{filteredAccounts.length}개 계정</span>
        </div>

        {filteredAccounts.length === 0 ? (
          <div className="accountEmpty">등록된 계정이 없습니다.</div>
        ) : (
          <div className="accountList">
            {filteredAccounts.map((account) => {
              const preset = brandPresets.find((item) => item.id === account.brandPresetId);
              return (
                <article key={account.id} className={!account.isActive ? "inactive" : ""}>
                  <div className="accountIdentity">
                    <span className={`accountPlatform account-${account.platform}`}>
                      {platformLabel(account.platform)}
                    </span>
                    <div>
                      <strong>{account.accountName}</strong>
                      <small>{account.handle || "아이디 미입력"} · {account.category}</small>
                    </div>
                  </div>

                  <div className="accountMeta">
                    <span>{account.isDefault ? "기본 계정" : "일반 계정"}</span>
                    <span>{account.isActive ? "활성" : "사용 중지"}</span>
                    <span>브랜드: {preset?.name || "연결 없음"}</span>
                  </div>

                  {account.memo && <p>{account.memo}</p>}

                  <div className="accountButtons">
                    {!account.isDefault && (
                      <button type="button" onClick={() => setDefaultSocialAccount(account.id)}>기본 설정</button>
                    )}
                    {account.brandPresetId && (
                      <button type="button" onClick={() => applyAccountBrand(account)}>브랜드 적용</button>
                    )}
                    <button type="button" onClick={() => toggleSocialAccount(account.id)}>
                      {account.isActive ? "사용 중지" : "다시 사용"}
                    </button>
                    <button type="button" className="delete" onClick={() => deleteSocialAccount(account.id)}>삭제</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="accountNotice">
          현재 단계에서는 계정 정보와 발행 대상을 관리합니다. 비밀번호나 로그인 토큰은 저장하지 않습니다.
          실제 자동 게시 연결은 각 플랫폼의 공식 인증 절차를 통해 추가해야 합니다.
        </div>
      </section>

      <section className={`contentLibraryStudio studioTabPanel ${activeStudioTab === "manage" ? "active" : ""}`}>
        <div className="contentLibraryHeader">
          <div><span>V37 CONTENT LIBRARY</span><h2>콘텐츠 라이브러리</h2><p>완성한 콘텐츠를 저장하고 다시 열거나 복제해 재활용합니다.</p></div>
          <button type="button" className="primary" onClick={saveCurrentToLibrary}>현재 콘텐츠 저장</button>
        </div>
        <div className="contentLibraryToolbar">
          <input value={librarySearch} onChange={(event) => setLibrarySearch(event.target.value)} placeholder="제목·주제 검색" />
          <select value={libraryCategory} onChange={(event) => setLibraryCategory(event.target.value)}>
            <option value="all">전체 카테고리</option>
            {[...new Set(contentLibrary.map((item) => item.category))].map((item) => <option key={item} value={item}>{item}</option>)}
          </select><span>{filteredLibraryItems.length}개</span>
        </div>
        {filteredLibraryItems.length === 0 ? <div className="contentLibraryEmpty">저장된 콘텐츠가 없습니다. 현재 콘텐츠를 저장해 보세요.</div> : (
          <div className="contentLibraryGrid">{filteredLibraryItems.map((item) => (
            <article key={item.id}>
              <div className="contentLibraryMeta"><span>{item.category}</span><span>{item.mode}</span><time>{new Date(item.updatedAt).toLocaleString("ko-KR")}</time></div>
              <h3>{item.title}</h3><p>{item.topic || item.generated.cards[0]?.body || "저장된 콘텐츠"}</p>
              <small>카드 {item.generated.cards.length}장 · {item.audience}</small>
              <div className="contentLibraryActions"><button type="button" className="primary" onClick={() => openLibraryItem(item)}>다시 열기</button><button type="button" onClick={() => duplicateLibraryItem(item)}>복제</button><button type="button" className="delete" onClick={() => deleteLibraryItem(item.id)}>삭제</button></div>
            </article>
          ))}</div>
        )}
        <div className="contentLibraryNotice">브라우저에 최대 50개까지 저장됩니다. 제품 원본 이미지는 저장 용량 보호를 위해 제외됩니다.</div>
      </section>

      <section className={`metricStudio studioTabPanel ${activeStudioTab === "manage" ? "active" : ""}`}>
        <div className="metricHeader">
          <div>
            <span className="metricEyebrow">V22 PERFORMANCE ANALYTICS</span>
            <h2>콘텐츠 성과 통계</h2>
            <p>플랫폼별 조회수, 반응, 저장, 공유와 클릭 성과를 직접 기록하고 비교합니다.</p>
          </div>
          <div className="metricHeaderButtons">
            <button type="button" onClick={importPublishedQueueToMetrics}>발행 완료 가져오기</button>
            <button type="button" onClick={exportMetricsCsv}>CSV 저장</button>
          </div>
        </div>

        <div className="metricSummaryGrid">
          <div><span>조회수</span><strong>{metricTotals.views.toLocaleString("ko-KR")}</strong></div>
          <div><span>좋아요</span><strong>{metricTotals.likes.toLocaleString("ko-KR")}</strong></div>
          <div><span>댓글</span><strong>{metricTotals.comments.toLocaleString("ko-KR")}</strong></div>
          <div><span>저장</span><strong>{metricTotals.saves.toLocaleString("ko-KR")}</strong></div>
          <div><span>공유</span><strong>{metricTotals.shares.toLocaleString("ko-KR")}</strong></div>
          <div><span>클릭</span><strong>{metricTotals.clicks.toLocaleString("ko-KR")}</strong></div>
        </div>

        <div className="metricPlatformGrid">
          {platformMetricSummary.map((summary) => (
            <article key={summary.platform}>
              <span className={`metricPlatformLabel metric-${summary.platform}`}>
                {platformLabel(summary.platform)}
              </span>
              <strong>{summary.views.toLocaleString("ko-KR")}회</strong>
              <small>콘텐츠 {summary.count}개</small>
              <div>
                <span>참여율 {summary.engagementRate.toFixed(2)}%</span>
                <span>클릭률 {summary.clickRate.toFixed(2)}%</span>
              </div>
            </article>
          ))}
        </div>

        {bestMetric && (
          <div className="bestMetricCard">
            <span>가장 반응이 좋은 콘텐츠</span>
            <strong>{bestMetric.title}</strong>
            <small>
              {platformLabel(bestMetric.platform)} · 조회수 {bestMetric.views.toLocaleString("ko-KR")}회 · 참여율 {metricEngagementRate(bestMetric).toFixed(2)}%
            </small>
          </div>
        )}

        <div className="metricInputPanel">
          <div className="metricInputTop">
            <label>
              플랫폼
              <select value={metricPlatform} onChange={(event) => setMetricPlatform(event.target.value as PlatformKey)}>
                <option value="instagram">인스타그램 릴스</option>
                <option value="youtube">유튜브 쇼츠</option>
                <option value="tiktok">틱톡</option>
              </select>
            </label>
            <label>
              발행 날짜
              <input type="datetime-local" value={metricPublishedAt} onChange={(event) => setMetricPublishedAt(event.target.value)} />
            </label>
            <label className="metricTitleField">
              콘텐츠 제목
              <input value={metricTitle} onChange={(event) => setMetricTitle(event.target.value)} placeholder="비워두면 현재 콘텐츠 제목 사용" />
            </label>
          </div>

          <div className="metricNumberGrid">
            {[
              ["조회수", metricViews, setMetricViews],
              ["좋아요", metricLikes, setMetricLikes],
              ["댓글", metricComments, setMetricComments],
              ["저장", metricSaves, setMetricSaves],
              ["공유", metricShares, setMetricShares],
              ["클릭", metricClicks, setMetricClicks]
            ].map(([label, value, setter]) => (
              <label key={String(label)}>
                {String(label)}
                <input
                  type="number"
                  min="0"
                  value={Number(value)}
                  onChange={(event) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(event.target.value))}
                />
              </label>
            ))}
          </div>

          <button type="button" className="saveMetricButton" onClick={addContentMetric}>성과 기록 저장</button>
        </div>

        <div className="metricListToolbar">
          <div>
            {(["all", "instagram", "youtube", "tiktok"] as const).map((platform) => (
              <button
                type="button"
                key={platform}
                className={metricFilter === platform ? "active" : ""}
                onClick={() => setMetricFilter(platform)}
              >
                {platform === "all" ? "전체" : platformLabel(platform)}
              </button>
            ))}
          </div>
          <span>{filteredMetrics.length}건</span>
        </div>

        {filteredMetrics.length === 0 ? (
          <div className="metricEmpty">아직 저장된 콘텐츠 성과가 없습니다.</div>
        ) : (
          <div className="metricList">
            {filteredMetrics.map((item) => (
              <article key={item.id}>
                <div className="metricItemTitle">
                  <span className={`metricPlatformLabel metric-${item.platform}`}>{platformLabel(item.platform)}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>{new Date(item.publishedAt).toLocaleString("ko-KR")}</small>
                  </div>
                </div>
                <div className="metricItemNumbers">
                  <span><b>{item.views.toLocaleString("ko-KR")}</b>조회</span>
                  <span><b>{item.likes.toLocaleString("ko-KR")}</b>좋아요</span>
                  <span><b>{item.comments.toLocaleString("ko-KR")}</b>댓글</span>
                  <span><b>{item.saves.toLocaleString("ko-KR")}</b>저장</span>
                  <span><b>{item.shares.toLocaleString("ko-KR")}</b>공유</span>
                  <span><b>{item.clicks.toLocaleString("ko-KR")}</b>클릭</span>
                </div>
                <div className="metricItemRate">
                  <strong>{metricEngagementRate(item).toFixed(2)}%</strong>
                  <span>참여율</span>
                  <button type="button" onClick={() => deleteContentMetric(item.id)}>삭제</button>
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="metricNotice">
          현재 단계에서는 각 플랫폼의 통계 숫자를 직접 입력합니다. 공식 API 연결 후에는 조회수와 반응을 자동으로 가져올 수 있습니다.
        </div>
      </section>

      <section className={`advertiserStudio studioTabPanel ${activeStudioTab === "manage" ? "active" : ""}`}>
        <div className="advertiserHeader">
          <div>
            <span className="brandEyebrow">V34 ADVERTISER CRM</span>
            <h2>광고주 · 제품 관리</h2>
            <p>광고주와 제품 정보를 저장해 다음 콘텐츠에서 한 번에 불러옵니다.</p>
          </div>
          <div className="advertiserCount"><b>{advertisers.length}</b><span>저장된 광고주</span></div>
        </div>

        <div className="advertiserGrid">
          <div className="advertiserFormPanel">
            <div className="advertiserFormGrid">
              <label>회사명<input value={advertiserCompany} onChange={(e) => setAdvertiserCompany(e.target.value)} placeholder="예: 주식회사 장군헬스" /></label>
              <label>브랜드명<input value={commercialBrief.brandName} onChange={(e) => updateCommercialBrief("brandName", e.target.value)} placeholder="예: 장군헬스" /></label>
              <label>담당자<input value={advertiserContactName} onChange={(e) => setAdvertiserContactName(e.target.value)} placeholder="예: 김담당" /></label>
              <label>연락처·이메일<input value={advertiserContactInfo} onChange={(e) => setAdvertiserContactInfo(e.target.value)} placeholder="전화번호 또는 이메일" /></label>
              <label>제품명<input value={commercialBrief.productName} onChange={(e) => updateCommercialBrief("productName", e.target.value)} placeholder="예: 장군 유산균" /></label>
              <label>가격·혜택<input value={commercialBrief.price} onChange={(e) => updateCommercialBrief("price", e.target.value)} placeholder="예: 29,900원 / 쿠폰 10%" /></label>
              <label className="wide">구매 링크<input value={commercialBrief.purchaseLink} onChange={(e) => updateCommercialBrief("purchaseLink", e.target.value)} placeholder="https://..." /></label>
              <label className="wide">검증된 특징<textarea value={commercialBrief.features} onChange={(e) => updateCommercialBrief("features", e.target.value)} placeholder="광고주가 제공한 사실만 입력" /></label>
              <label className="wide">관리 메모<textarea value={advertiserMemo} onChange={(e) => setAdvertiserMemo(e.target.value)} placeholder="계약 기간, 제작 수량, 주의사항 등" /></label>
            </div>
            <div className="advertiserActions">
              <button type="button" className="primary" onClick={saveAdvertiserProfile}>{selectedAdvertiserId ? "현재 정보 수정 저장" : "광고주 · 제품 저장"}</button>
              <button type="button" onClick={resetAdvertiserForm}>새로 입력</button>
            </div>
          </div>

          <div className="advertiserLibrary">
            <input className="advertiserSearch" value={advertiserSearch} onChange={(e) => setAdvertiserSearch(e.target.value)} placeholder="회사·브랜드·제품 검색" />
            <div className="advertiserList">
              {filteredAdvertisers.length === 0 ? (
                <div className="advertiserEmpty">저장된 광고주가 없습니다.</div>
              ) : filteredAdvertisers.map((item) => (
                <article key={item.id} className={selectedAdvertiserId === item.id ? "selected" : ""}>
                  <div>
                    <small>{item.companyName || "회사명 미입력"}</small>
                    <strong>{item.brandName || "브랜드 미입력"}</strong>
                    <span>{item.brief.productName || "제품명 미입력"}</span>
                    {item.brief.price && <em>{item.brief.price}</em>}
                  </div>
                  <div className="advertiserCardActions">
                    <button type="button" onClick={() => loadAdvertiserProfile(item)}>불러와서 생성</button>
                    <button type="button" onClick={() => deleteAdvertiserProfile(item.id)}>삭제</button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`brandStudio studioTabPanel ${activeStudioTab === "manage" ? "active" : ""}`}>
        <div className="brandHeader">
          <div>
            <span className="brandEyebrow">V21 BRAND SYSTEM</span>
            <h2>브랜드 관리</h2>
            <p>로고, 워터마크, 브랜드 색상과 글꼴을 저장해 모든 콘텐츠에 통일해서 적용합니다.</p>
          </div>
          <div className="brandPreviewBadge" style={{ background: brandSecondaryColor, color: brandPrimaryColor }}>
            {brandName || "브랜드 미리보기"}
          </div>
        </div>

        <div className="brandGrid">
          <div className="brandSettingsPanel">
            <div className="brandFieldGrid">
              <label>
                브랜드명
                <input value={brandName} onChange={(event) => setBrandName(event.target.value)} />
              </label>
              <label>
                슬로건
                <input value={brandTagline} onChange={(event) => setBrandTagline(event.target.value)} />
              </label>
              <label>
                대표 색상
                <div className="brandColorInput">
                  <input type="color" value={brandPrimaryColor} onChange={(event) => setBrandPrimaryColor(event.target.value)} />
                  <input value={brandPrimaryColor} onChange={(event) => setBrandPrimaryColor(event.target.value)} />
                </div>
              </label>
              <label>
                보조 색상
                <div className="brandColorInput">
                  <input type="color" value={brandSecondaryColor} onChange={(event) => setBrandSecondaryColor(event.target.value)} />
                  <input value={brandSecondaryColor} onChange={(event) => setBrandSecondaryColor(event.target.value)} />
                </div>
              </label>
              <label>
                브랜드 글꼴
                <select value={brandFontFamily} onChange={(event) => setBrandFontFamily(event.target.value as BrandPreset["fontFamily"])}>
                  <option value="system">기본 고딕</option>
                  <option value="serif">명조</option>
                  <option value="rounded">둥근 고딕</option>
                  <option value="mono">모노</option>
                </select>
              </label>
              <label>
                워터마크 위치
                <select value={watermarkPosition} onChange={(event) => setWatermarkPosition(event.target.value as BrandPreset["watermarkPosition"])}>
                  <option value="top-left">왼쪽 위</option>
                  <option value="top-right">오른쪽 위</option>
                  <option value="bottom-left">왼쪽 아래</option>
                  <option value="bottom-right">오른쪽 아래</option>
                </select>
              </label>
            </div>

            <label className="brandOpacity">
              워터마크 투명도 {watermarkOpacity}%
              <input
                type="range"
                min="10"
                max="100"
                value={watermarkOpacity}
                onChange={(event) => setWatermarkOpacity(Number(event.target.value))}
              />
            </label>

            <div className="brandToggleRow">
              <label><input type="checkbox" checked={showBrandName} onChange={(event) => setShowBrandName(event.target.checked)} /> 브랜드명 표시</label>
              <label><input type="checkbox" checked={showBrandTagline} onChange={(event) => setShowBrandTagline(event.target.checked)} /> 슬로건 표시</label>
            </div>

            <div className="brandLogoUpload">
              <div>
                <strong>브랜드 로고</strong>
                <small>PNG, JPG, WEBP 이미지를 사용할 수 있습니다.</small>
              </div>
              <div>
                <label className="brandUploadButton">
                  로고 선택
                  <input type="file" accept="image/*" onChange={(event) => handleBrandLogoFile(event.target.files?.[0] || null)} />
                </label>
                {brandLogoDataUrl && <button type="button" onClick={clearBrandLogo}>로고 제거</button>}
              </div>
            </div>
          </div>

          <div className="brandLivePreview" style={{ background: brandSecondaryColor, fontFamily: brandFontStack() }}>
            <div className="brandPreviewContent">
              <span style={{ color: brandPrimaryColor }}>BRAND PREVIEW</span>
              <h3>임신 28주, 꼭 알아둘 변화</h3>
              <p>브랜드 설정이 카드뉴스와 릴스에 동일하게 적용되는 모습을 확인합니다.</p>
            </div>

            <div
              className={`brandWatermarkPreview ${watermarkPosition}`}
              style={{ opacity: watermarkOpacity / 100, color: brandPrimaryColor }}
            >
              {brandLogoDataUrl && <img src={brandLogoDataUrl} alt="브랜드 로고" />}
              <div>
                {showBrandName && <strong>{brandName}</strong>}
                {showBrandTagline && <small>{brandTagline}</small>}
              </div>
            </div>
          </div>
        </div>

        <div className="brandPresetSection">
          <div className="brandPresetCreate">
            <input
              value={brandPresetName}
              onChange={(event) => setBrandPresetName(event.target.value)}
              placeholder="프리셋 이름"
            />
            <button type="button" onClick={saveBrandPreset}>현재 브랜드 저장</button>
          </div>

          {brandPresets.length === 0 ? (
            <div className="brandPresetEmpty">저장한 브랜드 프리셋이 없습니다.</div>
          ) : (
            <div className="brandPresetList">
              {brandPresets.map((preset) => (
                <article key={preset.id}>
                  <div className="brandPresetSwatch" style={{ background: preset.secondaryColor }}>
                    <span style={{ background: preset.primaryColor }} />
                  </div>
                  <div>
                    <strong>{preset.name}</strong>
                    <small>{preset.brandName}</small>
                  </div>
                  <button type="button" onClick={() => applyBrandPreset(preset)}>적용</button>
                  <button type="button" className="delete" onClick={() => deleteBrandPreset(preset.id)}>삭제</button>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="brandNotice">
          설정한 브랜드명과 슬로건은 릴스 영상 저장 시 워터마크로 포함됩니다.
        </div>
      </section>

      <section className={`automationStudio studioTabPanel ${activeStudioTab === "publish" ? "active" : ""}`}>
        <div className="automationHeader">
          <div>
            <span className="automationEyebrow">V20 AUTO WORKFLOW</span>
            <h2>AI 자동 생성 루틴</h2>
            <p>주제를 순서대로 생성하고 선택한 플랫폼의 업로드 대기열에 등록합니다.</p>
          </div>
          <div className={`automationSwitch ${automationEnabled ? "enabled" : ""}`}>
            <span>{automationEnabled ? "자동 실행 켜짐" : "자동 실행 꺼짐"}</span>
            <button type="button" onClick={() => setAutomationEnabled((value) => !value)}>
              {automationEnabled ? "끄기" : "켜기"}
            </button>
          </div>
        </div>

        <div className="automationGrid">
          <div className="automationSettings">
            <label>
              매일 실행 시간
              <input
                type="time"
                value={automationTime}
                onChange={(event) => setAutomationTime(event.target.value)}
              />
            </label>

            <label>
              등록할 플랫폼
              <select
                value={automationPlatform}
                onChange={(event) => setAutomationPlatform(event.target.value as PlatformKey)}
              >
                <option value="instagram">인스타그램 릴스</option>
                <option value="youtube">유튜브 쇼츠</option>
                <option value="tiktok">틱톡</option>
              </select>
            </label>

            <label className="automationTopicsLabel">
              순환할 주제
              <textarea
                rows={8}
                value={automationTopics}
                onChange={(event) => {
                  setAutomationTopics(event.target.value);
                  setAutomationNextIndex(0);
                }}
                placeholder={"주제를 한 줄에 하나씩 입력하세요.\n예: 임신 28주 증상"}
              />
            </label>

            <button
              type="button"
              className="automationRunButton"
              disabled={automationRunning}
              onClick={() => void runAutomationNow("manual")}
            >
              {automationRunning ? "자동 생성 중..." : "지금 한 번 실행"}
            </button>
          </div>

          <div className="automationStatusPanel">
            <div className="automationNextTopic">
              <span>다음 생성 주제</span>
              <strong>
                {automationTopicList().length
                  ? automationTopicList()[automationNextIndex % automationTopicList().length]
                  : "주제 없음"}
              </strong>
              <small>
                {platformLabel(automationPlatform)} · 매일 {automationTime}
              </small>
            </div>

            <div className="automationFlow">
              <div><b>1</b><span>주제 선택</span></div>
              <div><b>2</b><span>AI 콘텐츠 생성</span></div>
              <div><b>3</b><span>대기열 등록</span></div>
              <div><b>4</b><span>승인·발행 관리</span></div>
            </div>

            <div className="automationWarning">
              브라우저가 열려 있는 동안 예약 시간이 되면 자동 실행됩니다. 컴퓨터가 꺼져 있거나
              브라우저가 닫혀 있어도 실행되는 서버 자동화는 다음 단계에서 연결합니다.
            </div>
          </div>
        </div>

        <div className="automationLogSection">
          <div className="automationLogHeader">
            <strong>자동 생성 실행 기록</strong>
            <div>
              <span>{automationLogs.length}건</span>
              {automationLogs.length > 0 && (
                <button type="button" onClick={clearAutomationLogs}>기록 삭제</button>
              )}
            </div>
          </div>

          {automationLogs.length === 0 ? (
            <div className="automationLogEmpty">아직 실행 기록이 없습니다.</div>
          ) : (
            <div className="automationLogList">
              {automationLogs.slice(0, 10).map((log) => (
                <article key={log.id}>
                  <span className={`automationResult ${log.result}`}>
                    {log.result === "success" ? "성공" : "실패"}
                  </span>
                  <div>
                    <strong>{log.topic}</strong>
                    <small>
                      {platformLabel(log.platform)} · {new Date(log.createdAt).toLocaleString("ko-KR")}
                    </small>
                    <p>{log.message}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={`contentCalendarStudio studioTabPanel ${activeStudioTab === "publish" ? "active" : ""}`}>
        <div className="contentCalendarHeader">
          <div>
            <span className="calendarEyebrow">V19 CONTENT CALENDAR</span>
            <h2>콘텐츠 일정 캘린더</h2>
            <p>예약 발행과 대기 콘텐츠를 월간 일정으로 확인합니다.</p>
          </div>
          <div className="calendarSummary">
            <div><strong>{todayQueueItems.length}</strong><span>오늘</span></div>
            <div><strong>{weekQueueItems.length}</strong><span>7일 이내</span></div>
            <div><strong>{uploadQueue.filter((item) => item.status === "published").length}</strong><span>발행 완료</span></div>
          </div>
        </div>

        <div className="calendarToolbar">
          <div className="monthNavigation">
            <button
              type="button"
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
            >
              이전 달
            </button>
            <strong>
              {calendarMonth.getFullYear()}년 {calendarMonth.getMonth() + 1}월
            </strong>
            <button
              type="button"
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
            >
              다음 달
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
                setSelectedCalendarDate(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`);
              }}
            >
              오늘
            </button>
          </div>

          <select
            value={calendarPlatform}
            onChange={(event) => setCalendarPlatform(event.target.value as "all" | PlatformKey)}
          >
            <option value="all">모든 플랫폼</option>
            <option value="instagram">인스타그램 릴스</option>
            <option value="youtube">유튜브 쇼츠</option>
            <option value="tiktok">틱톡</option>
          </select>
        </div>

        <div className="calendarLayout">
          <div className="calendarBoard">
            <div className="calendarWeekdays">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="calendarGrid">
              {calendarDays.map((day) => {
                const isToday = day.key === (() => {
                  const now = new Date();
                  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                })();

                return (
                  <button
                    type="button"
                    key={day.key}
                    className={[
                      "calendarDay",
                      !day.inMonth ? "outside" : "",
                      selectedCalendarDate === day.key ? "selected" : "",
                      isToday ? "today" : ""
                    ].filter(Boolean).join(" ")}
                    onClick={() => setSelectedCalendarDate(day.key)}
                  >
                    <span className="calendarDateNumber">{day.date.getDate()}</span>
                    <div className="calendarDayItems">
                      {day.items.slice(0, 3).map((item) => (
                        <span className={`calendarEvent event-${item.platform}`} key={item.id}>
                          {platformLabel(item.platform)}
                        </span>
                      ))}
                      {day.items.length > 3 && (
                        <span className="calendarMore">+{day.items.length - 3}</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <aside className="calendarDetail">
            <div className="calendarDetailHeader">
              <strong>{selectedCalendarDate}</strong>
              <span>{selectedCalendarItems.length}건</span>
            </div>

            {selectedCalendarItems.length === 0 ? (
              <div className="calendarDetailEmpty">선택한 날짜에 예약된 콘텐츠가 없습니다.</div>
            ) : (
              <div className="calendarDetailList">
                {selectedCalendarItems.map((item) => (
                  <article key={item.id}>
                    <div>
                      <span className={`calendarPlatform platform-${item.platform}`}>
                        {platformLabel(item.platform)}
                      </span>
                      <strong>{item.topic}</strong>
                    </div>
                    <small>
                      {new Date(item.scheduledAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      {" · "}
                      {uploadStatusLabel(item.status)}
                    </small>
                    <div className="calendarDetailButtons">
                      <button type="button" onClick={() => setSelectedPlatform(item.platform)}>
                        플랫폼 선택
                      </button>
                      <button type="button" onClick={() => updateUploadStatus(item.id, "published")}>
                        발행 완료
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </aside>
        </div>

        <div className="calendarNotice">
          같은 플랫폼에 30분 이내로 중복 예약하면 자동으로 알려줍니다.
        </div>
      </section>

      <section className={`uploadQueueStudio studioTabPanel ${activeStudioTab === "publish" ? "active" : ""}`}>
        <div className="uploadQueueHeader">
          <div>
            <span className="uploadQueueEyebrow">V41 SUPABASE + YOUTUBE LIVE UPLOAD</span>
            <h2>자동 업로드 대기열</h2>
            <p>연결된 플랫폼만 실제 업로드를 실행하고, 미연결 플랫폼은 필요한 설정을 정확히 안내합니다.</p>
          </div>
          <div className="v40QueueHeaderButtons">
            <button type="button" className="processQueueButton" onClick={checkPlatformConnections} disabled={connectionChecking}>
              {connectionChecking ? "연결 확인 중..." : "플랫폼 연결 확인"}
            </button>
            <button type="button" className="processQueueButton" onClick={processDueUploads}>
              지금 발행할 항목 확인
            </button>
          </div>
        </div>

        <div className="v40ConnectionGrid">
          {(["instagram", "youtube", "tiktok"] as PlatformKey[]).map((key) => {
            const connection = platformConnections[key];
            return (
              <article key={key} className={`v40ConnectionCard ${connection.connected ? "connected" : "disconnected"}`}>
                <div><strong>{platformLabel(key)}</strong><span>{connection.connected ? "연결됨" : "설정 필요"}</span></div>
                <p>{connection.detail}</p>
              </article>
            );
          })}
        </div>

        <div className="queueComposer">
          <div className="queuePlatformSummary">
            <span>{platformLabel(selectedPlatform)}</span>
            <strong>{platformCopies[selectedPlatform].title}</strong>
            <small>
              영상 {lastVideoBlob ? "준비됨" : "미생성"} · 카드 {generated.cards.length}장 · {selectedAccountLabel(selectedPlatform)}
            </small>
          </div>

          <div className="queueScheduleControls">
            <div className="scheduleModeButtons">
              <button type="button" className={scheduleMode === "now" ? "active" : ""} onClick={() => setScheduleMode("now")}>
                바로 대기열
              </button>
              <button type="button" className={scheduleMode === "later" ? "active" : ""} onClick={() => setScheduleMode("later")}>
                예약 발행
              </button>
            </div>
            {scheduleMode === "later" && (
              <label>
                예약 날짜·시간
                <input type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} />
              </label>
            )}
            <button type="button" className="addQueueButton" onClick={addToUploadQueue}>
              {scheduleMode === "later" ? "예약 대기열에 추가" : "업로드 대기열에 추가"}
            </button>
          </div>
        </div>

        <div className="queueToolbar">
          <div className="queueFilters">
            {(["all", "queued", "scheduled", "uploading", "failed", "published"] as const).map((status) => (
              <button type="button" key={status} className={queueFilter === status ? "active" : ""} onClick={() => setQueueFilter(status)}>
                {status === "all" ? "전체" : uploadStatusLabel(status)}
              </button>
            ))}
          </div>
          <span>총 {uploadQueue.length}건</span>
        </div>

        <div className="uploadQueueList">
          {uploadQueue.filter((item) => queueFilter === "all" || item.status === queueFilter).length === 0 ? (
            <div className="uploadQueueEmpty">조건에 맞는 업로드 항목이 없습니다.</div>
          ) : uploadQueue.filter((item) => queueFilter === "all" || item.status === queueFilter).map((item) => (
            <article className="uploadQueueItem" key={item.id}>
              <div className="uploadQueueItemMain">
                <div>
                  <span className={`uploadStatus status-${item.status}`}>{uploadStatusLabel(item.status)}</span>
                  <strong>{item.topic}</strong>
                </div>
                <small>{platformLabel(item.platform)} · {new Date(item.scheduledAt).toLocaleString("ko-KR")}</small>
                {item.attempts > 0 && <p>시도 {item.attempts}회 {item.lastError && `· ${item.lastError}`}</p>}
              </div>
              <div className="uploadQueueButtons">
                {(item.status === "queued" || item.status === "scheduled" || item.status === "failed") && (
                  <button
                    type="button"
                    onClick={() => executeQueueUpload(item)}
                    disabled={executingQueueId === item.id}
                    title={platformConnections[item.platform].detail}
                  >
                    {executingQueueId === item.id ? "업로드 실행 중..." : item.status === "failed" ? "실제 업로드 재시도" : "실제 업로드 실행"}
                  </button>
                )}
                {item.status === "uploading" && <span className="v40ExecutingLabel">플랫폼 응답 확인 중</span>}
                <button type="button" className="delete" onClick={() => setUploadQueue((current) => current.filter((row) => row.id !== item.id))}>삭제</button>
              </div>
            </article>
          ))}
        </div>

        <div className="uploadQueueNotice">
          YouTube는 생성된 WebM 영상을 실제로 전송하며, 성공 응답을 받은 경우에만 발행 완료로 표시합니다. Supabase가 연결되어 있으면 영상 원본도 함께 보관합니다.
        </div>
      </section>

      <section className={`telegramStudio studioTabPanel ${activeStudioTab === "publish" ? "active" : ""}`}>
        <div className="telegramHeader">
          <div>
            <span className="telegramEyebrow">V39 TELEGRAM ACTION APPROVAL</span>
            <h2>텔레그램 승인센터</h2>
            <p>텔레그램의 승인·취소 버튼으로 결정하고 결과를 업로드 대기열에 연결합니다.</p>
          </div>
          <div className="telegramHeaderButtons">
            <button type="button" className="telegramCheckButton" onClick={checkTelegram}>
              연결 상태 확인
            </button>
            <button type="button" className="telegramCheckButton" onClick={syncAllPendingApprovals}>
              승인 결과 모두 확인
            </button>
          </div>
        </div>

        <div className="telegramConnection">
          <div className={`connectionBadge ${telegramStatus}`}>
            {telegramStatus === "ready" && "연결 준비 완료"}
            {telegramStatus === "missing" && "환경변수 설정 필요"}
            {telegramStatus === "error" && "연결 확인 실패"}
            {telegramStatus === "unknown" && "상태 확인 전"}
          </div>
          <p>
            서버 환경변수 <code>TELEGRAM_BOT_TOKEN</code>과 <code>TELEGRAM_CHAT_ID</code>를 사용합니다.
            토큰은 화면이나 브라우저에 노출되지 않습니다.
          </p>
        </div>

        <div className="telegramSendGrid">
          <div className="telegramPreview">
            <span>{platformLabel(selectedPlatform)}</span>
            <h3>{platformCopies[selectedPlatform].title}</h3>
            <p>{platformCopies[selectedPlatform].description.slice(0, 280)}</p>
            <small>
              카드 {generated.cards.length}장 · 예상 {generated.cards.length * secondsPerCard}초
            </small>
          </div>

          <div className="telegramActions">
            <label>
              승인 요청 메모
              <textarea
                rows={4}
                value={approvalNote}
                onChange={(event) => setApprovalNote(event.target.value)}
                placeholder="예: 오늘 오후 8시 인스타그램에 올릴 예정"
              />
            </label>
            <button
              type="button"
              className="telegramSendButton"
              onClick={sendTelegramApproval}
              disabled={telegramSending}
            >
              {telegramSending ? "전송 중..." : "텔레그램으로 승인 요청 보내기"}
            </button>
          </div>
        </div>

        <div className="approvalQueue">
          <div className="approvalQueueHeader">
            <strong>승인·발행 기록</strong>
            <span>{approvalItems.length}건</span>
          </div>

          {approvalItems.length === 0 ? (
            <div className="approvalEmpty">
              텔레그램으로 승인 요청을 보내면 이곳에 기록됩니다.
            </div>
          ) : (
            <div className="approvalList">
              {approvalItems.map((item) => (
                <article className="approvalItem" key={item.id}>
                  <div className="approvalItemMain">
                    <div>
                      <span className={`approvalStatus status-${item.status}`}>
                        {approvalStatusLabel(item.status)}
                      </span>
                      <strong>{item.topic}</strong>
                    </div>
                    <small>
                      {platformLabel(item.platform)} · {new Date(item.createdAt).toLocaleString("ko-KR")}
                    </small>
                    {item.note && <p>{item.note}</p>}
                    {item.syncMessage && <p>{item.syncMessage}</p>}
                  </div>
                  <div className="approvalButtons">
                    {item.serverDraftId && item.status === "pending" && (
                      <button type="button" onClick={() => syncApprovalStatus(item)}>
                        텔레그램 결과 확인
                      </button>
                    )}
                    <button type="button" onClick={() => updateApprovalStatus(item.id, "approved")}>
                      수동 승인
                    </button>
                    <button type="button" onClick={() => updateApprovalStatus(item.id, "rejected")}>
                      수정 필요
                    </button>
                    <button type="button" onClick={() => updateApprovalStatus(item.id, "published")}>
                      발행 완료
                    </button>
                    <button type="button" className="delete" onClick={() => removeApprovalItem(item.id)}>
                      삭제
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className={`focusedCardStudio studioTabPanel ${activeStudioTab === "create" ? "active" : ""}`}>
        <div className="focusedCardHeader">
          <div>
            <span className="focusedEyebrow">STEP 2 · 카드 확인과 수정</span>
            <h2>카드를 한 장씩 크게 보면서 편집하세요</h2>
            <p>왼쪽 카드 목록에서 선택하고 오른쪽에서 내용을 바로 수정할 수 있습니다.</p>
          </div>
          <div className="focusedProgress">
            <strong>{generated?.cards?.length ? selectedCardIndex + 1 : 0}</strong>
            <span>/ {generated?.cards?.length || 0}</span>
          </div>
        </div>

        {!generated?.cards?.length ? (
          <div className="focusedEmpty">먼저 위에서 주제를 입력하고 AI 콘텐츠를 생성하세요.</div>
        ) : (
          <div className="focusedCardLayout">
            <aside className="focusedCardList">
              <div className="focusedCardListTitle">
                <strong>카드 목록</strong>
                <span>{generated.cards.length}장</span>
              </div>
              <div className="focusedCardThumbs">
                {generated.cards.map((card, index) => (
                  <button
                    key={`${card.title}-${index}`}
                    type="button"
                    className={selectedCardIndex === index ? "active" : ""}
                    onClick={() => setSelectedCardIndex(index)}
                  >
                    <span>{index + 1}</span>
                    <div>
                      <strong>{card.title || `카드 ${index + 1}`}</strong>
                      <small>{card.badge || card.type}</small>
                    </div>
                  </button>
                ))}
              </div>
            </aside>

            <div className="focusedCardMain">
              <div className="focusedPreviewWrap">
                <div className="focusedPreviewScale">
                  {renderCard(generated.cards[selectedCardIndex], selectedCardIndex)}
                </div>
              </div>

              <div className="focusedCardActions">
                <button
                  type="button"
                  disabled={selectedCardIndex === 0}
                  onClick={() => {
                    moveCard(selectedCardIndex, -1);
                    setSelectedCardIndex(Math.max(0, selectedCardIndex - 1));
                  }}
                >
                  ← 앞으로
                </button>
                <button
                  type="button"
                  disabled={selectedCardIndex === generated.cards.length - 1}
                  onClick={() => {
                    moveCard(selectedCardIndex, 1);
                    setSelectedCardIndex(Math.min(generated.cards.length - 1, selectedCardIndex + 1));
                  }}
                >
                  뒤로 →
                </button>
                <button type="button" onClick={() => duplicateCard(selectedCardIndex)}>복제</button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    deleteCard(selectedCardIndex);
                    setSelectedCardIndex(Math.max(0, selectedCardIndex - 1));
                  }}
                >
                  삭제
                </button>
              </div>

              <div className="focusedEditPanel">
                <label>
                  카드 제목
                  <input
                    value={generated.cards[selectedCardIndex]?.title || ""}
                    onChange={(event) => updateCard(selectedCardIndex, { title: event.target.value })}
                  />
                </label>

                <label>
                  본문
                  <textarea
                    rows={5}
                    value={generated.cards[selectedCardIndex]?.body || ""}
                    onChange={(event) => updateCard(selectedCardIndex, { body: event.target.value })}
                  />
                </label>

                <div className="focusedEditGrid">
                  <label>
                    상단 배지
                    <input
                      value={generated.cards[selectedCardIndex]?.badge || ""}
                      onChange={(event) => updateCard(selectedCardIndex, { badge: event.target.value })}
                    />
                  </label>
                  <label>
                    이미지 키워드
                    <input
                      value={generated.cards[selectedCardIndex]?.imageKeyword || ""}
                      onChange={(event) => updateCard(selectedCardIndex, { imageKeyword: event.target.value, visualKeyword: event.target.value })}
                    />
                  </label>
                </div>

                <div className="aiCardRewritePanel">
                  <div className="aiRewriteHeader">
                    <div>
                      <span>V32 · 선택 카드 AI 수정</span>
                      <strong>{selectedCardIndex + 1}번 카드만 다시 씁니다</strong>
                    </div>
                    <button
                      type="button"
                      className="undoRewrite"
                      disabled={!cardHistory[selectedCardIndex]?.length || cardRewriteLoading}
                      onClick={undoSelectedCardRewrite}
                    >
                      ↶ 되돌리기 {cardHistory[selectedCardIndex]?.length ? `(${cardHistory[selectedCardIndex].length})` : ""}
                    </button>
                  </div>

                  <div className="quickRewriteButtons">
                    {[
                      ["더 강하게", "제목과 첫 문장을 더 강하게 만들되 낚시성 표현은 쓰지 마"],
                      ["더 쉽게", "어려운 표현을 빼고 누구나 이해할 수 있게 쉽게 써줘"],
                      ["더 짧게", "핵심만 남기고 제목과 본문을 더 짧게 줄여줘"],
                      ["더 전문적으로", "신뢰감 있는 전문가 톤으로 구체적으로 다듬어줘"],
                      ["광고 느낌 줄이기", "광고처럼 보이는 표현을 줄이고 정보형 콘텐츠처럼 바꿔줘"],
                      ["저장 유도 강화", "실용성을 높이고 자연스러운 저장 유도 문장을 넣어줘"]
                    ].map(([label, instruction]) => (
                      <button
                        key={label}
                        type="button"
                        disabled={cardRewriteLoading}
                        onClick={() => rewriteSelectedCard(instruction)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="customRewriteRow">
                    <input
                      value={cardRewriteInstruction}
                      onChange={(event) => setCardRewriteInstruction(event.target.value)}
                      placeholder="예: 30대 엄마가 이해하기 쉽게 바꿔줘"
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                          event.preventDefault();
                          rewriteSelectedCard();
                        }
                      }}
                    />
                    <button type="button" disabled={cardRewriteLoading} onClick={() => rewriteSelectedCard()}>
                      {cardRewriteLoading ? "AI 수정 중..." : "✦ 이 카드만 AI 수정"}
                    </button>
                  </div>

                  {lastRewriteIndex === selectedCardIndex && lastRewriteBefore && (
                    <div className="rewriteComparison">
                      <div>
                        <span>수정 전</span>
                        <strong>{lastRewriteBefore.title}</strong>
                        <p>{lastRewriteBefore.body}</p>
                      </div>
                      <div>
                        <span>수정 후 {lastRewriteReview ? `· ${lastRewriteReview.score}점` : ""}</span>
                        <strong>{generated.cards[selectedCardIndex]?.title}</strong>
                        <p>{generated.cards[selectedCardIndex]?.body}</p>
                      </div>
                      {lastRewriteReview?.summary && <small>{lastRewriteReview.summary}</small>}
                    </div>
                  )}
                </div>

                <div className="focusedPrimaryActions">
                  <button type="button" onClick={() => downloadOne(selectedCardIndex)}>
                    이 카드 PNG 저장
                  </button>
                  <button
                    type="button"
                    disabled={selectedCardIndex === generated.cards.length - 1}
                    onClick={() => setSelectedCardIndex(Math.min(generated.cards.length - 1, selectedCardIndex + 1))}
                  >
                    다음 카드 보기 →
                  </button>
                  <button type="button" className="goVideo" onClick={() => setActiveStudioTab("video")}>
                    릴스 영상으로 이동
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {generated.cards.length > 0 && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            left: "-12000px",
            top: 0,
            width: "1080px",
            pointerEvents: "none",
            zIndex: -1
          }}
        >
          {generated.cards.map((card, index) => (
            <div key={`export-card-${index}`} style={{ width: "1080px", height: "1350px", overflow: "hidden" }}>
              {renderCard(card, index, true)}
            </div>
          ))}
        </div>
      )}

      <section className={`captionBox editableCaption studioTabPanel ${activeStudioTab === "create" ? "active" : ""}`}>
        <div className="captionTitle">
          <h3>캡션 직접 수정</h3>
          <span>수정 내용은 ZIP의 caption.txt와 hashtags.txt에 각각 바로 반영됩니다.</span>
        </div>
        <label className="editorField">
          본문
          <textarea
            rows={7}
            value={generated.caption}
            onChange={(event) => updateCaption(event.target.value)}
          />
        </label>
        <label className="editorField">
          해시태그
          <textarea
            rows={3}
            value={generated.hashtags.join(" ")}
            onChange={(event) => updateHashtags(event.target.value)}
          />
        </label>
      </section>
    </main>
  );
}
