import { NextRequest, NextResponse } from "next/server";

type PexelsPhoto = {
  id: number;
  alt?: string;
  photographer?: string;
  url?: string;
  src?: {
    portrait?: string;
    large2x?: string;
    large?: string;
    medium?: string;
  };
};

export async function POST(request: NextRequest) {
  const apiKey = process.env.PEXELS_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: "PEXELS_API_KEY가 없습니다.",
        setupRequired: true
      },
      { status: 400 }
    );
  }

  const body = await request.json();
  const queries = Array.isArray(body.queries)
    ? body.queries.map(String).map((value: string) => value.trim()).filter(Boolean).slice(0, 8)
    : [];

  if (queries.length === 0) {
    return NextResponse.json({ error: "검색어가 없습니다." }, { status: 400 });
  }

  try {
    const results = await Promise.all(
      queries.map(async (query: string, index: number) => {
        const params = new URLSearchParams({
          query,
          orientation: "portrait",
          size: "medium",
          per_page: "8",
          page: "1"
        });

        const response = await fetch(`https://api.pexels.com/v1/search?${params.toString()}`, {
          headers: { Authorization: apiKey },
          cache: "no-store"
        });

        if (!response.ok) {
          const detail = await response.text();
          throw new Error(`Pexels 검색 실패 (${response.status}): ${detail}`);
        }

        const data = await response.json();
        const photos: PexelsPhoto[] = Array.isArray(data.photos) ? data.photos : [];
        if (photos.length === 0) {
          return { query, photo: null };
        }

        // 같은 검색어를 반복해도 카드마다 사진이 조금씩 달라지도록 선택
        const photo = photos[index % photos.length];
        const source = photo.src?.portrait || photo.src?.large2x || photo.src?.large || photo.src?.medium;

        return {
          query,
          photo: source
            ? {
                imageUrl: `/api/image-proxy?url=${encodeURIComponent(source)}`,
                photographer: String(photo.photographer || "Pexels"),
                photoPage: String(photo.url || ""),
                alt: String(photo.alt || query)
              }
            : null
        };
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "사진 검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
