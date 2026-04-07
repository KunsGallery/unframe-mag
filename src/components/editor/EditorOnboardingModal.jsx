import React, { useEffect, useMemo, useState } from "react";
import {
  Sparkles,
  PenSquare,
  Plus,
  SlidersHorizontal,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

const STORAGE_KEY = "uf_editor_onboarding_hidden_v1";

function SlideCard({ icon: Icon, eyebrow, title, body, points, accent = "#004aad" }) {
  return (
    <div className="grid md:grid-cols-[0.95fr_1.05fr] gap-6 md:gap-8 items-stretch">
      <div className="rounded-[28px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        <div className="aspect-[4/3] relative p-6 md:p-8 bg-linear-to-br from-[#004aad]/8 via-transparent to-black/5 dark:to-white/5">
          <div
            className="absolute right-5 top-5 w-16 h-16 rounded-full blur-2xl opacity-60"
            style={{ background: accent }}
          />
          <div className="relative h-full flex flex-col">
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.28em] italic text-zinc-500">
              <Icon size={14} />
              <span>{eyebrow}</span>
            </div>

            <div className="mt-6 rounded-[24px] border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 p-5 shadow-sm">
              <div className="h-3 w-24 rounded-full bg-[#004aad]/20" />
              <div className="mt-4 space-y-3">
                <div className="h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 w-[82%]" />
                <div className="h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 w-[68%]" />
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 w-full" />
                <div className="mt-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 w-[88%]" />
                <div className="mt-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-800 w-[72%]" />
              </div>

              <div className="mt-5 flex gap-2">
                <div className="h-9 px-4 rounded-xl bg-[#004aad] text-white text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center">
                  Action
                </div>
                <div className="h-9 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center text-zinc-500">
                  Secondary
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#004aad]" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-center">
        <div className="text-[10px] font-black uppercase tracking-[0.34em] italic text-[#004aad]">
          {eyebrow}
        </div>

        <h2 className="mt-4 text-3xl md:text-4xl font-black italic tracking-[-0.04em] leading-[0.96] text-zinc-950 dark:text-white break-keep">
          {title}
        </h2>

        <p className="mt-5 text-[16px] md:text-[17px] leading-[1.8] text-zinc-600 dark:text-zinc-300 break-keep">
          {body}
        </p>

        <div className="mt-6 space-y-3">
          {points.map((point, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3"
            >
              <div className="w-2 h-2 rounded-full bg-[#004aad] mt-2 shrink-0" />
              <div className="text-[14px] md:text-[15px] leading-[1.7] text-zinc-700 dark:text-zinc-200 break-keep">
                {point}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EditorOnboardingModal({
  isOpen,
  onClose,
  isDarkMode,
  onNeverShowAgain,
}) {
  const slides = useMemo(
    () => [
      {
        icon: PenSquare,
        eyebrow: "Start Writing",
        title: "제목을 쓰고, 바로 본문을 시작하세요",
        body:
          "U# 에디터는 일반 문단처럼 자연스럽게 쓸 수 있도록 설계되었습니다. 작성 중인 내용은 자동으로 저장되며, 현재 상태는 상단 배지와 저장 표시로 확인할 수 있습니다.",
        points: [
          "제목과 부제목을 먼저 입력하고 바로 본문으로 넘어갈 수 있습니다.",
          "작성 중 내용은 자동 저장되며, 마지막 저장 시각이 표시됩니다.",
          "발행 전까지는 draft 상태로 안전하게 유지됩니다.",
        ],
      },
      {
        icon: Plus,
        eyebrow: "Insert Blocks",
        title: "필요한 블록은 문서 흐름 안에서 바로 추가합니다",
        body:
          "상단 툴바보다 중요한 것은 흐름을 끊지 않는 삽입 경험입니다. 왼쪽 + 버튼이나 / 메뉴를 통해 이미지, 갤러리, 컬럼, 표 등을 빠르게 추가할 수 있습니다.",
        points: [
          "문단 왼쪽 + 버튼으로 자주 쓰는 블록을 바로 삽입할 수 있습니다.",
          "/ 메뉴를 사용하면 이미지, 갤러리, 슬라이드, 컬럼, 표를 빠르게 찾을 수 있습니다.",
          "삽입은 위치 중심으로 작동하므로 문서 흐름이 자연스럽습니다.",
        ],
      },
      {
        icon: SlidersHorizontal,
        eyebrow: "Edit Blocks",
        title: "블록을 선택하면 필요한 도구만 바로 나타납니다",
        body:
          "이미지, 갤러리, 슬라이드, 컬럼, 표는 선택 상태에 따라 빠른 편집 바가 나타납니다. 자주 쓰는 설정은 즉시 조정하고, 더 자세한 옵션은 Inspector에서 다룰 수 있습니다.",
        points: [
          "이미지는 크기와 정렬을 빠르게 조절할 수 있습니다.",
          "갤러리와 슬라이드는 비율, 열 수, 포커스 위치를 조절할 수 있습니다.",
          "컬럼과 표도 선택 상태에서 더 직관적으로 편집할 수 있습니다.",
        ],
      },
      {
        icon: ShieldCheck,
        eyebrow: "Safe Publishing",
        title: "발행 후 수정도 원본을 바로 덮지 않고 안전하게 진행됩니다",
        body:
          "발행된 글을 수정할 때는 revision draft에서 작업한 뒤, 확인 후 다시 발행하는 구조입니다. 즉 수정 과정 자체가 하나의 안전 장치로 작동합니다.",
        points: [
          "발행글 수정은 revision draft에서 진행됩니다.",
          "원본을 바로 덮지 않기 때문에 실수에 훨씬 안전합니다.",
          "수정 후 발행하면 검토된 내용만 원본에 반영됩니다.",
        ],
      },
    ],
    []
  );

  const [step, setStep] = useState(0);

  useEffect(() => {
    if (isOpen) setStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const current = slides[step];
  const isLast = step === slides.length - 1;

  return (
    <div className="fixed inset-0 z-[120]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="absolute inset-0 p-4 md:p-8 flex items-center justify-center">
        <div
          className={[
            "relative w-full max-w-6xl rounded-[32px] border shadow-2xl overflow-hidden",
            isDarkMode
              ? "bg-zinc-950 border-zinc-800"
              : "bg-[#f8f7f4] border-zinc-200",
          ].join(" ")}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/85 dark:bg-zinc-950/85 text-zinc-500 hover:text-black dark:hover:text-white flex items-center justify-center transition"
            aria-label="Close onboarding"
          >
            <X size={18} />
          </button>

          <div className="p-6 md:p-10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.36em] italic text-[#004aad]">
                  Editor Guide
                </div>
                <div className="mt-2 text-sm font-black italic text-zinc-500">
                  처음엔 핵심만, 필요할 때 다시 열어볼 수 있습니다.
                </div>
              </div>

              <div className="flex items-center gap-2">
                {slides.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setStep(idx)}
                    className={[
                      "h-2.5 rounded-full transition-all",
                      idx === step
                        ? "w-8 bg-[#004aad]"
                        : "w-2.5 bg-zinc-300 dark:bg-zinc-700",
                    ].join(" ")}
                    aria-label={`Go to slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>

            <SlideCard {...current} />

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={onNeverShowAgain}
                className="text-[11px] font-black uppercase tracking-[0.24em] italic text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
              >
                다시 보지 않기
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.max(0, prev - 1))}
                  disabled={step === 0}
                  className={[
                    "h-11 px-4 rounded-xl border flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] italic transition",
                    step === 0
                      ? "opacity-40 cursor-not-allowed border-zinc-200 dark:border-zinc-800 text-zinc-400"
                      : "border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                  ].join(" ")}
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                {!isLast ? (
                  <button
                    type="button"
                    onClick={() => setStep((prev) => Math.min(slides.length - 1, prev + 1))}
                    className="h-11 px-5 rounded-xl bg-[#004aad] text-white flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] italic hover:opacity-95 transition"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-11 px-5 rounded-xl bg-[#004aad] text-white flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] italic hover:opacity-95 transition"
                  >
                    <Sparkles size={16} />
                    Start Editing
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldOpenEditorOnboarding() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== "1";
  } catch {
    return true;
  }
}

export function hideEditorOnboardingForever() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {}
}