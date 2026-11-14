import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { getSiteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/lib/site";

import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

const DEFAULT_OG_IMAGE = {
  url: "/geckos/gecko-1.jpg",
  width: 1200,
  height: 1200,
  alt: "도나와 크레스티드 게코 모프 가격 비교",
};

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: SITE_TITLE,
    template: "%s | 도나와",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "크레스티드 게코",
    "게코 가격",
    "모프",
    "릴리화이트",
    "아잔틱",
    "카푸치노",
    "파충류 분양",
    "최저 호가",
  ],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "ko_KR",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE.url],
  },
  robots: {
    index: true,
    follow: true,
  },
  formatDetection: {
    telephone: false,
    address: false,
    email: false,
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
