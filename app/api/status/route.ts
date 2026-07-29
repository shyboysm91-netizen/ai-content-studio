import { NextResponse } from "next/server";

export async function GET() {
  const base = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  try {
    const response = await fetch(`${base}/api/tags`, { cache: "no-store" });
    if (!response.ok) throw new Error("Ollama 응답 오류");
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
