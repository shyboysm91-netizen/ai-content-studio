import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function getConfig() {
  return {
    base: (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").replace(/\/$/, ""),
    model: process.env.OLLAMA_MODEL || "gemma3:4b"
  };
}

export async function GET() {
  const { base, model } = getConfig();

  try {
    const response = await fetch(`${base}/api/tags`, {
      cache: "no-store",
      signal: AbortSignal.timeout(7000)
    });

    if (!response.ok) {
      return NextResponse.json(
        { ok: false, configured: true, model, error: `Ollama 응답 오류 (${response.status})` },
        { status: 503 }
      );
    }

    const data = await response.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    const modelReady = models.some((item: { name?: string; model?: string }) =>
      [item?.name, item?.model].some((value) => typeof value === "string" && value.startsWith(model))
    );

    return NextResponse.json({ ok: true, configured: true, model, modelReady, models });
  } catch {
    const isLocalAddress = /127\.0\.0\.1|localhost/.test(base);
    const deployedOnVercel = Boolean(process.env.VERCEL);
    const error = deployedOnVercel && isLocalAddress
      ? "Vercel 서버에서는 PC의 localhost Ollama에 직접 연결할 수 없습니다. OLLAMA_BASE_URL에 외부 연결 주소가 필요합니다."
      : "Ollama에 연결하지 못했습니다. Ollama 실행 상태와 OLLAMA_BASE_URL을 확인하세요.";

    return NextResponse.json(
      { ok: false, configured: Boolean(process.env.OLLAMA_BASE_URL), model, error },
      { status: 503 }
    );
  }
}
