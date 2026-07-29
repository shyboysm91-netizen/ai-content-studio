import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(){const base=process.env.OLLAMA_BASE_URL||"http://127.0.0.1:11434";try{const r=await fetch(`${base}/api/tags`,{cache:"no-store",signal:AbortSignal.timeout(5000)});if(!r.ok)return NextResponse.json({ok:false},{status:503});const d=await r.json();return NextResponse.json({ok:true,models:d.models||[]})}catch{return NextResponse.json({ok:false,error:"Ollama 연결 실패"},{status:503})}}
