"use client";

import { Check, Share2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * 지금 보고 있는 표의 링크를 그대로 퍼가게 해 주는 버튼.
 *
 * 폰에서는 OS 공유 시트(카톡·문자·디스코드)를 열고, 안 되는 브라우저에서는
 * 문구와 링크를 클립보드에 복사한다. 복사가 막힌 환경에서는 직접 긁어 갈 수 있게
 * 주소를 담은 입력칸을 띄운다.
 */
export function ShareButton({ title, text, url }: { title: string; text: string; url: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualRef = useRef<HTMLInputElement | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  useEffect(() => {
    if (state === "manual") {
      manualRef.current?.focus();
      manualRef.current?.select();
    }
  }, [state]);

  function markCopied() {
    setState("copied");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setState("idle"), 2400);
  }

  async function copyPayload(): Promise<boolean> {
    const payload = text ? `${text}\n${url}` : url;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        return true;
      }
    } catch {
      // 아래 예비 경로로 넘어간다.
    }

    try {
      const area = document.createElement("textarea");
      area.value = payload;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.top = "-1000px";
      document.body.appendChild(area);
      area.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(area);
      return copied;
    } catch {
      return false;
    }
  }

  async function handleClick() {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // 공유 시트를 못 열면 복사로 넘어간다.
      }
    }

    if (await copyPayload()) {
      markCopied();
      return;
    }

    setState("manual");
  }

  if (state === "manual") {
    return (
      <span className="share-button share-button--manual">
        <input
          ref={manualRef}
          aria-label="공유할 링크"
          className="share-button__input"
          readOnly
          value={url}
          onBlur={() => setState("idle")}
        />
        <span className="share-button__hint">길게 눌러 복사</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      className="share-button"
      data-state={state}
      onClick={handleClick}
      aria-live="polite"
    >
      {state === "copied" ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Share2 size={14} aria-hidden="true" />
      )}
      {state === "copied" ? "링크 복사됨" : "이 표 공유"}
    </button>
  );
}
