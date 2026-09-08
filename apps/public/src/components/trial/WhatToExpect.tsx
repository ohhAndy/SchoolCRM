import React from "react";
import { CheckCircle2, Clock, MapPin, Smile, Sparkles, Shield, Flame } from "lucide-react";

export function WhatToExpect() {
  const steps = [
    {
      step: "01",
      title: "Arrive 10 Minutes Early",
      desc: "Check in at the front desk. Our friendly staff will show you to our change rooms and answer any initial questions.",
      icon: Clock,
      color: "bg-brand-50 text-brand-600",
    },
    {
      step: "02",
      title: "Meet Your Supervisor",
      desc: "You will meet our deck supervisor, who will introduce your swimmer to their instructor and help them get settled before heading into the pool.",
      icon: Smile,
      color: "bg-teal-50 text-teal-600",
    },
    {
      step: "03",
      title: "Skill Assessment Class",
      desc: "Your swimmer joins a regular class where our coaches assess their comfort, water skills, and level to recommend the right class fit.",
      icon: Sparkles,
      color: "bg-amber-50 text-amber-600",
    },
    {
      step: "04",
      title: "Skill Recommendation & Placement",
      desc: "Receive direct feedback from our team, a personalized level recommendation, and class time options that fit your schedule.",
      icon: CheckCircle2,
      color: "bg-indigo-50 text-indigo-600",
    },
  ];

  const whatToBring = [
    "Bathing Suit",
    "Towel",
    "Pool Shoes / Flip Flops",
    "Goggles (sold on site)",
    "Swim Cap (sold on site)",
    "Swim Diaper (for toddlers under 3)",
  ];

  return (
    <div className="mt-20 pt-16 border-t border-slate-200">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 text-teal-600 text-xs font-semibold uppercase tracking-wider mb-3">
          <Sparkles size={15} />
          First Time Visiting?
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          What to Expect on Your Trial Day
        </h2>
        <p className="text-slate-600 text-sm sm:text-base">
          We make your first visit smooth, fun, and completely stress-free.
        </p>
      </div>

      {/* 4 Steps */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {steps.map((s) => (
          <div
            key={s.step}
            className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/70 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-extrabold text-slate-400 tracking-wider">
                  STEP {s.step}
                </span>
                <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center`}>
                  <s.icon size={18} />
                </div>
              </div>
              <h3 className="font-display font-bold text-base text-slate-900 mb-2">
                {s.title}
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed">
                {s.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* What to bring box */}
      <div className="bg-brand-50/60 rounded-2xl p-6 sm:p-8 border border-brand-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <h4 className="font-bold text-slate-900 text-base mb-1">
            What to Bring with You:
          </h4>
          <p className="text-slate-600 text-xs sm:text-sm">
            Just the essentials — we provide all flotation aids, kickboards, and teaching equipment. Goggles and swim caps are also available for purchase on site at the front desk.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {whatToBring.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white rounded-lg text-xs font-semibold text-slate-800 border border-brand-100 shadow-sm"
            >
              <CheckCircle2 size={14} className="text-teal-600" />
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
