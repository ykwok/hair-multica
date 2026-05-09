"use client";

import { useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  className?: string;
}

export function ComparisonSlider({
  beforeImage,
  afterImage,
  beforeLabel = "原图",
  afterLabel = "AI 效果",
  className,
}: ComparisonSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const onMouseDown = useCallback(() => setIsDragging(true), []);
  const onMouseUp = useCallback(() => setIsDragging(false), []);
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      handleMove(e.clientX);
    },
    [isDragging, handleMove]
  );
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      handleMove(e.touches[0].clientX);
    },
    [handleMove]
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden rounded-xl select-none", className)}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchMove={onTouchMove}
      onTouchEnd={onMouseUp}
    >
      {/* After image (full width) */}
      <img src={afterImage} alt="After" className="h-64 w-full object-cover" draggable={false} />

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Before"
          className="h-64 w-full object-cover"
          draggable={false}
        />
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
        {beforeLabel}
      </div>
      <div className="bg-primary/80 absolute top-3 right-3 rounded-md px-2 py-1 text-xs text-white">
        {afterLabel}
      </div>

      {/* Slider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
        style={{ left: `${sliderPosition}%`, transform: "translateX(-50%)" }}
      >
        {/* Handle */}
        <div
          className="absolute top-1/2 left-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize items-center justify-center rounded-full bg-white shadow-md"
          onMouseDown={onMouseDown}
          onTouchStart={onMouseDown}
        >
          <div className="flex gap-0.5">
            <div className="bg-primary h-3 w-0.5 rounded-full" />
            <div className="bg-primary h-3 w-0.5 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
