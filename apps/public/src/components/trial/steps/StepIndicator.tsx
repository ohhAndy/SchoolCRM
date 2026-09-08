"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

interface StepIndicatorProps {
  steps: Array<{ num: number; label: string }>;
  step: number;
}

export function StepIndicator({ steps, step }: StepIndicatorProps) {
  return (
    <div className="w-full mb-8 sm:mb-10">
      <div className="flex items-center">
        {steps.map((s, i) => (
          <div
            key={s.num}
            className="relative flex-1 flex flex-col items-center"
          >
            {/* Connecting line to the next step */}
            {i < steps.length - 1 && (
              <div
                className={`absolute top-5 -translate-y-1/2 left-[calc(50%+1.5rem)] w-[calc(100%-3rem)] sm:left-[calc(50%+2rem)] sm:w-[calc(100%-4rem)] h-0.5 rounded-full transition-colors ${
                  step > s.num ? "bg-teal-400" : "bg-slate-200"
                }`}
              />
            )}

            <div
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.num
                  ? "bg-teal-500 text-white shadow-sm"
                  : step === s.num
                    ? "bg-brand-500 text-white ring-4 ring-brand-100 shadow"
                    : "bg-slate-100 text-slate-400"
              }`}
            >
              {step > s.num ? <CheckCircle2 size={18} /> : s.num}
            </div>
            <span
              className={`mt-2 text-xs font-semibold text-center hidden sm:block ${
                step >= s.num ? "text-brand-600" : "text-slate-400"
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
