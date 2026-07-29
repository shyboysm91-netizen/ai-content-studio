import { NextRequest, NextResponse } from "next/server";

const DEFAULT_API = "http://127.0.0.1:7860";

function normalizeApi(value?: string) {
  return String(value || DEFAULT_API).trim().replace(/\/+$/, "");
}

export async function GET() {
  const api = normalizeApi(process.env.LOCAL_IMAGE_API_URL);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(`${api}/sdapi/v1/options`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store"
    });
    clearTimeout(timer);

    if (!response.ok) {
      return NextResponse.json(
        { online: false, error: `로컬 이미지 AI 응답 오류: ${response.status}` },
        { status: 503 }
      );
    }

    return NextResponse.json({ online: true, api });
  } catch {
    return NextResponse.json(
      {
        online: false,
        api,
        error: "로컬 이미지 AI가 실행되지 않았습니다."
      },
      { status: 503 }
    );
  }
}

export async function POST(request: NextRequest) {
  const api = normalizeApi(process.env.LOCAL_IMAGE_API_URL);
  const body = await request.json();

  const prompt = String(body.prompt || "").trim();
  const negativePrompt = String(
    body.negativePrompt ||
    "text, letters, watermark, logo, extra fingers, malformed hands, distorted face, duplicate person, low quality, blurry"
  ).trim();

  if (!prompt) {
    return NextResponse.json({ error: "이미지 설명이 없습니다." }, { status: 400 });
  }

  // 8GB RAM + 내장 GPU의 첫 테스트를 위한 보수적인 기본값.
  const width = Math.min(512, Math.max(256, Number(body.width) || 384));
  const height = Math.min(640, Math.max(320, Number(body.height) || 512));
  const steps = Math.min(12, Math.max(1, Number(body.steps) || 4));
  const cfgScale = Math.min(9, Math.max(1, Number(body.cfgScale) || 2));
  const seed = Number.isFinite(Number(body.seed)) ? Number(body.seed) : -1;

  try {
    const startedAt = Date.now();
    const response = await fetch(`${api}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        negative_prompt: negativePrompt,
        width,
        height,
        steps,
        cfg_scale: cfgScale,
        seed,
        batch_size: 1,
        n_iter: 1,
        sampler_name: "Euler a",
        save_images: false
      }),
      cache: "no-store"
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || `이미지 AI 응답 오류: ${response.status}`);
    }

    const data = JSON.parse(text);
    const base64 = Array.isArray(data.images) ? data.images[0] : "";
    if (!base64) {
      throw new Error("이미지 AI가 결과를 반환하지 않았습니다.");
    }

    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64}`,
      elapsedSeconds: Math.max(1, Math.round((Date.now() - startedAt) / 1000)),
      settings: { width, height, steps, cfgScale }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "로컬 이미지 생성에 실패했습니다.",
        hint: "이미지 AI를 --api 옵션으로 실행했는지 확인하세요."
      },
      { status: 500 }
    );
  }
}
