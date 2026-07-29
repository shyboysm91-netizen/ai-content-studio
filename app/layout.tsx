import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Content Studio V4",
  description: "Ollama 기반 카드뉴스·릴스 자동 제작"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
