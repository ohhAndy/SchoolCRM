"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { FormData, LocationOption } from "../types";

interface TrialSuccessViewProps {
  formData: FormData;
  selectedLocation?: LocationOption;
  effectiveAdultSwimmerName: string;
}

export function TrialSuccessView({
  formData,
  selectedLocation,
  effectiveAdultSwimmerName,
}: TrialSuccessViewProps) {
  const isAdult = formData.participantType === "adult";
  const isMultiChild = !isAdult && formData.children.length > 1;
  const isSwimTeam =
    formData.locationSlug.toLowerCase().includes("angus") ||
    formData.locationSlug.toLowerCase().includes("swim-team") ||
    selectedLocation?.name.toLowerCase().includes("swim team") === true;

  return (
    <div className="text-center py-12 animate-fade-in">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-teal-50 flex items-center justify-center">
        <CheckCircle2 size={40} className="text-teal-500" />
      </div>
      <h2 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 mb-3">
        {isSwimTeam ? "Swim Team Request Received!" : "Trial Request Submitted!"}
      </h2>
      <p className="text-slate-600 max-w-md mx-auto mb-8 text-base">
        {isSwimTeam ? (
          <>
            Thank you! We&apos;ve received your request of interest for our{" "}
            <strong className="text-slate-900">
              Competitive Swim Team
            </strong>. Our coaching coordinators will call you shortly at{" "}
            <strong className="text-slate-900">{formData.contactPhone}</strong>{" "}
            to learn about your swimmer and coordinate an evaluation.
          </>
        ) : (
          <>
            Thank you! We&apos;ve received your request for our{" "}
            <strong className="text-slate-900">
              {selectedLocation?.name || "Swan Swim School"}
            </strong>{" "}
            facility and will contact you as soon as possible to confirm your trial
            slot.
          </>
        )}
      </p>
      <div className="glass-card p-6 max-w-md mx-auto text-left space-y-3.5 border border-slate-200/80">
        <div className="flex justify-between text-sm pb-2 border-b border-slate-100">
          <span className="text-slate-500">Program Type</span>
          <span className="font-semibold text-brand-600">
            {isSwimTeam
              ? "Competitive Swim Team Tryout"
              : isAdult
                ? "Adult Swim Program"
                : isMultiChild
                  ? `Youth Program (${formData.children.length} Siblings)`
                  : "Youth / Child Program"}
          </span>
        </div>
        <div className="flex justify-between text-sm pb-2 border-b border-slate-100">
          <span className="text-slate-500">Selected Location</span>
          <span className="font-medium text-slate-800">
            {selectedLocation?.name} ({selectedLocation?.city})
          </span>
        </div>

        {isAdult ? (
          <div className="flex justify-between text-sm pb-2 border-b border-slate-100">
            <span className="text-slate-500">Swimmer</span>
            <span className="font-medium text-slate-800">
              {effectiveAdultSwimmerName}, age {formData.swimmerAge}
            </span>
          </div>
        ) : (
          <div className="pb-2 border-b border-slate-100">
            <span className="text-slate-500 text-sm block mb-1.5">
              {isMultiChild ? "Swimmers" : "Child Swimmer"}
            </span>
            <div className="space-y-1.5">
              {formData.children.map((c) => (
                <div
                  key={c.id}
                  className="flex justify-between items-center text-sm bg-slate-50 px-2.5 py-1.5 rounded-md"
                >
                  <span className="font-medium text-slate-800">
                    {c.name}, age {c.age}
                  </span>
                  {c.skillLevel && (
                    <span className="text-xs text-brand-600 truncate max-w-[170px]">
                      {c.skillLevel.split(" (")[0]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {isMultiChild && (
          <div className="flex justify-between text-sm pb-2 border-b border-slate-100">
            <span className="text-slate-500">Timing Preference</span>
            <span className="font-semibold text-brand-600">
              {formData.siblingPreference === "simultaneous"
                ? "Same Time (Simultaneous)"
                : "Flexible"}
            </span>
          </div>
        )}

        {isAdult && formData.skillLevelOrGoal && (
          <div className="flex justify-between text-sm pb-2 border-b border-slate-100">
            <span className="text-slate-500">Primary Goal</span>
            <span className="font-medium text-slate-700 text-right max-w-[200px] truncate">
              {formData.skillLevelOrGoal}
            </span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span className="text-slate-500">Scheduling</span>
          <span className="font-medium text-slate-800 text-right">
            {formData.preferredDates.length > 0
              ? formData.preferredDates
                  .map((d) => format(parseISO(d), "MMM d"))
                  .join(", ")
              : "Coordinators will call to schedule"}
          </span>
        </div>
      </div>
    </div>
  );
}
