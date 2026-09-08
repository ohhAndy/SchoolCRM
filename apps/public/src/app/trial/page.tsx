import type { Metadata } from "next";
import { Droplets } from "lucide-react";
import { TrialForm } from "@/components/trial/TrialForm";
import { WhatToExpect } from "@/components/trial/WhatToExpect";

export const metadata: Metadata = {
  title: "Book a Free Trial — Swan Swim School",
  description:
    "Book a free trial swim lesson at Swan Swim School. Fill out a quick form and we'll get back to you as soon as possible.",
};

export default function TrialPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 overflow-hidden">
        <div className="absolute top-20 right-10 w-72 h-72 bg-brand-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            viewBox="0 0 1440 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-auto block"
            preserveAspectRatio="none"
          >
            <path
              d="M0,32 C480,80 960,0 1440,32 L1440,80 L0,80 Z"
              fill="white"
            />
          </svg>
        </div>

        <div className="section-container relative z-10 text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white/90 text-sm font-medium mb-6">
            <Droplets size={16} />
            No Commitment Required
          </span>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
            Book a Free Trial Lesson
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Tell us about the swimmer and select your preferred branch & dates.
            We will confirm your trial slot as soon as possible!
          </p>
        </div>
      </section>

      {/* Form Section & What to Expect */}
      <section className="py-16 bg-white">
        <div className="section-container max-w-4xl">
          <div className="max-w-4xl mx-auto">
            <TrialForm />
          </div>
          <WhatToExpect />
        </div>
      </section>
    </>
  );
}

