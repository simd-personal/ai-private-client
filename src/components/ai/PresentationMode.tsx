"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PresentationMode } from "@/lib/schemas/ai-strategy-room";

interface PresentationModeProps {
  data: PresentationMode;
  showSpeakerNotes?: boolean;
  onClose?: () => void;
}

export function PresentationModeViewer({
  data,
  showSpeakerNotes = false,
  onClose,
}: PresentationModeProps) {
  const [index, setIndex] = useState(0);
  const slides = data.slides;
  const slide = slides[index];

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, slides.length - 1));
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, onClose]);

  if (!slide) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-navy print:relative print:bg-white" data-testid="presentation-page">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4 print:hidden">
        <span className="text-sm text-champagne">
          Slide {slide.slideNumber} of {slides.length}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={goPrev}
            disabled={index === 0}
            className="text-white hover:bg-white/10"
            data-testid="presentation-prev-button"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            disabled={index === slides.length - 1}
            className="text-white hover:bg-white/10"
            data-testid="presentation-next-button"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-8 print:p-12">
        <div className="w-full max-w-3xl rounded-2xl border border-champagne/20 bg-[#faf9f7] p-10 shadow-2xl print:border-gray-200 print:shadow-none" data-testid="presentation-slide">
          <p className="mb-2 text-xs uppercase tracking-widest text-champagne print:text-gray-400">
            Private Client Property Desk
          </p>
          <h2 className="font-serif text-3xl text-navy md:text-4xl">
            {slide.title}
          </h2>
          {slide.subtitle && (
            <p className="mt-3 text-lg text-gray-600">{slide.subtitle}</p>
          )}
          <ul className="mt-8 space-y-3">
            {slide.bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 text-gray-700"
              >
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                {bullet}
              </li>
            ))}
          </ul>
        </div>

        {showSpeakerNotes && slide.speakerNote && (
          <div className="mt-6 w-full max-w-3xl rounded-xl border border-white/10 bg-white/5 p-4 print:hidden">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-champagne">
              Speaker Note
            </p>
            <p className="text-sm text-white/80">{slide.speakerNote}</p>
          </div>
        )}
      </div>
    </div>
  );
}

interface PresentationModeButtonProps {
  leadId: string;
  tenantSlug?: string;
}

export function PresentBriefButton({
  leadId,
  tenantSlug,
}: PresentationModeButtonProps) {
  const href = tenantSlug
    ? `/a/${tenantSlug}/admin/leads/${leadId}/present`
    : `/admin/leads/${leadId}/present`;

  return (
    <a
      href={href}
      className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-navy px-5 text-xs font-medium text-white shadow-lg shadow-navy/20 transition-all hover:bg-navy-light"
    >
      Present This Brief
    </a>
  );
}
