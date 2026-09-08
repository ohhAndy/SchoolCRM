"use client";

import React from "react";
import { MapPin, Clock, Calendar, MessageSquare } from "lucide-react";
import { format, parseISO } from "date-fns";
import { FormData, LocationOption } from "../types";

interface Step4ReviewProps {
  formData: FormData;
  selectedLocation?: LocationOption;
  effectiveAdultSwimmerName: string;
  onEditLocation: () => void;
  updateField: (field: keyof FormData, value: unknown) => void;
}

export function Step4Review({
  formData,
  selectedLocation,
  effectiveAdultSwimmerName,
  onEditLocation,
  updateField,
}: Step4ReviewProps) {
  const isAdult = formData.participantType === "adult";
  const isMultiChild = !isAdult && formData.children.length > 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 mb-1">
          Review & Submit
        </h2>
        <p className="text-slate-500 text-sm">
          Please double check your trial details before submitting.
        </p>
      </div>

      <div className="glass-card p-6 space-y-4 border border-slate-200/80">
        {/* Location preview */}
        <div className="pb-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center text-brand-500 shrink-0 mt-0.5">
              <MapPin size={18} />
            </div>
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                Selected Location
              </span>
              <p className="text-slate-900 font-bold text-base">
                {selectedLocation?.name || "Not selected"}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {selectedLocation?.address}, {selectedLocation?.city}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onEditLocation}
            className="text-xs text-brand-600 font-semibold hover:underline cursor-pointer"
          >
            Change
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              {isAdult ? "Contact Information" : "Parent / Guardian"}
            </span>
            <p className="text-slate-800 font-semibold mt-1">
              {formData.contactName}
            </p>
            <p className="text-slate-600 text-sm font-mono mt-0.5">
              {formData.contactPhone}
            </p>
            {formData.contactEmail && (
              <p className="text-slate-500 text-sm">{formData.contactEmail}</p>
            )}
          </div>

          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              {isAdult
                ? "Adult Swimmer"
                : isMultiChild
                  ? `Swimmers (${formData.children.length} Siblings)`
                  : "Child Swimmer"}
            </span>

            {isAdult ? (
              <div className="mt-1">
                <p className="text-slate-800 font-semibold">
                  {effectiveAdultSwimmerName}, age {formData.swimmerAge}
                </p>
                {formData.skillLevelOrGoal && (
                  <p className="text-xs text-brand-600 bg-brand-50 px-2 py-1 rounded-md inline-block mt-1 font-medium">
                    {formData.skillLevelOrGoal}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 mt-1.5">
                {formData.children.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-between text-xs sm:text-sm"
                  >
                    <span className="font-semibold text-slate-800">
                      {c.name}, age {c.age}
                    </span>
                    {c.skillLevel && (
                      <span className="text-[11px] text-brand-700 bg-brand-100/70 px-2 py-0.5 rounded font-medium">
                        {c.skillLevel.split(" (")[0]}
                      </span>
                    )}
                  </div>
                ))}

                {isMultiChild && (
                  <div className="mt-2 text-xs flex items-center gap-1.5 text-brand-700 font-medium bg-brand-50 px-2.5 py-1.5 rounded-lg border border-brand-100">
                    <Clock size={13} className="shrink-0 text-brand-600" />
                    <span>
                      Timing:{" "}
                      <strong>
                        {formData.siblingPreference === "simultaneous"
                          ? "Same Time (Simultaneous Lessons)"
                          : "Flexible Schedule"}
                      </strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4 grid sm:grid-cols-2 gap-4">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Requested Trial Dates
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.preferredDates.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium border border-brand-100"
                >
                  <Calendar size={14} />
                  {format(parseISO(d), "EEEE, MMM d")}
                </span>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Preferred Time Window(s)
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {(() => {
                const timeLabels: Record<string, string> = {
                  weekday_early: "Weekday Early (3:30 PM – 5:30 PM)",
                  weekday_late: "Weekday Evening (5:30 PM – 8:00 PM)",
                  weekend_morning: "Weekend Morning (9:00 AM – 12:00 PM)",
                  weekend_afternoon: "Weekend Afternoon (12:00 PM – 3:30 PM)",
                  morning: "Morning (9:00 AM – 12:00 PM)",
                  afternoon: "Afternoon (12:00 PM – 4:00 PM)",
                  evening: "After School / Evening (4:00 PM – 8:00 PM)",
                  flexible: "Flexible / Any Time",
                };

                const prefs =
                  formData.timePreferences && formData.timePreferences.length > 0
                    ? formData.timePreferences
                    : [formData.timePreference || "flexible"];

                return prefs.map((pref) => (
                  <span
                    key={pref}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-800 rounded-lg text-sm font-medium border border-slate-200"
                  >
                    <Clock size={14} className="text-brand-500" />
                    {timeLabels[pref] || pref}
                  </span>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="form-label">
          <MessageSquare size={14} className="inline mr-1.5" />
          Additional Notes or Requests (Optional)
        </label>
        <textarea
          id="notes"
          className="form-input min-h-[90px] resize-y"
          placeholder={
            isAdult
              ? "Any specific goals, comfort level with water, or schedule requests?"
              : "Any specific requests, medical notes, or swimming experience details?"
          }
          value={formData.notes}
          onChange={(e) => updateField("notes", e.target.value)}
        />
      </div>
    </div>
  );
}
