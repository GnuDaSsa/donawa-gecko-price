"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function HeaderBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      className="header-back-button"
      onClick={() => router.back()}
      aria-label="이전 화면으로 돌아가기"
    >
      <ChevronLeft size={17} aria-hidden="true" />
      <span>뒤로</span>
    </button>
  );
}
