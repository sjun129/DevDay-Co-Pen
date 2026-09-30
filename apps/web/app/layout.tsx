import type { Metadata } from "next";
import { Geist_Mono, Nanum_Gothic, Nanum_Myeongjo, Noto_Serif_KR } from "next/font/google";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 에디터 글꼴 선택지 (lib/editor/formats.ts). 한글 글리프가 커서 미리 불러오지 않는다.
const nanumGothic = Nanum_Gothic({
  variable: "--font-nanum-gothic",
  weight: ["400", "700", "800"],
  preload: false,
});
const nanumMyeongjo = Nanum_Myeongjo({
  variable: "--font-nanum-myeongjo",
  weight: ["400", "700", "800"],
  preload: false,
});
const notoSerifKr = Noto_Serif_KR({
  variable: "--font-noto-serif-kr",
  preload: false,
});

export const metadata: Metadata = {
  title: "Co-Pen",
  description: "AI가 커서를 가진 팀원으로 참여하는 실시간 협업 에디터",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const fontVariables = [geistMono, nanumGothic, nanumMyeongjo, notoSerifKr].map((font) => font.variable).join(" ");
  return (
    <html lang="ko" className={`${fontVariables} h-full`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
