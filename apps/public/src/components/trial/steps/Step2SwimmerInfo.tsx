"use client";

import React from "react";
import {
  User,
  Calendar,
  Waves,
  CheckCircle2,
  Clock,
  Trash2,
  Plus,
} from "lucide-react";
import {
  FormData,
  ChildSwimmer,
  CHILD_LEVEL_OPTIONS,
  ADULT_GOAL_OPTIONS,
  MAX_CHILDREN,
} from "../types";

interface Step2SwimmerInfoProps {
  formData: FormData;
  fieldErrors: Record<string, string>;
  updateField: (field: keyof FormData, value: unknown) => void;
  addChild: () => void;
  removeChild: (id: string) => void;
  updateChild: (id: string, field: keyof ChildSwimmer, value: string) => void;
}

export function Step2SwimmerInfo({
  formData,
  fieldErrors,
  updateField,
  addChild,
  removeChild,
  updateChild,
}: Step2SwimmerInfoProps) {
  const isAdult = formData.participantType === "adult";
  const isMultiChild = !isAdult && formData.children.length > 1;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 mb-1">
          {isAdult
            ? "About Your Swimming Goals"
            : isMultiChild
              ? "About Your Children"
              : "About Your Child"}
        </h2>
        <p className="text-slate-500 text-sm">
          {isAdult
            ? "Help our adult coaches understand your current comfort level and goals."
            : isMultiChild
              ? "Tell us about each child so our coaches can match them into the right skill groups."
              : "This helps our coaches place your child in the ideal skill and age group."}
        </p>
      </div>

      {/* ============ ADULT SWIMS ============ */}
      {isAdult ? (
        <div className="space-y-5">
          {/* Adult self-booking toggle */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.isSelfBooking}
                onChange={(e) => updateField("isSelfBooking", e.target.checked)}
                className="w-4 h-4 text-brand-600 rounded border-slate-300 focus:ring-brand-500 cursor-pointer"
              />
              <span className="text-sm font-semibold text-slate-800">
                I am booking this trial for myself (
                {formData.contactName || "Self"})
              </span>
            </label>
            {!formData.isSelfBooking && (
              <p className="text-xs text-slate-500">
                Unchecked: You are booking on behalf of another adult family
                member or friend.
              </p>
            )}
          </div>

          {/* Swimmer Name */}
          {!formData.isSelfBooking && (
            <div>
              <label htmlFor="swimmerName" className="form-label">
                <User size={14} className="inline mr-1.5" />
                Adult Swimmer&apos;s Full Name *
              </label>
              <input
                type="text"
                id="swimmerName"
                className="form-input"
                placeholder="e.g. David Miller"
                value={formData.swimmerName}
                onChange={(e) => updateField("swimmerName", e.target.value)}
              />
              {fieldErrors.swimmerName && (
                <p className="form-error">{fieldErrors.swimmerName}</p>
              )}
            </div>
          )}

          {/* Age */}
          <div>
            <label htmlFor="swimmerAge" className="form-label">
              <Calendar size={14} className="inline mr-1.5" />
              Swimmer&apos;s Age (Years) *
            </label>
            <input
              type="number"
              id="swimmerAge"
              className="form-input"
              placeholder="e.g. 28"
              min="18"
              max="99"
              value={formData.swimmerAge}
              onChange={(e) => updateField("swimmerAge", e.target.value)}
            />
            {fieldErrors.swimmerAge && (
              <p className="form-error">{fieldErrors.swimmerAge}</p>
            )}
            <p className="text-xs text-slate-400 mt-1">
              Adult programs are tailored for participants ages 18+.
            </p>
          </div>

          {/* Experience / Goal Selector */}
          <div>
            <label className="form-label mb-2">
              <Waves size={14} className="inline mr-1.5 text-brand-500" />
              Primary Goal / Experience (Optional)
            </label>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {ADULT_GOAL_OPTIONS.map((opt) => {
                const isSelected = formData.skillLevelOrGoal === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      updateField(
                        "skillLevelOrGoal",
                        isSelected ? "" : opt,
                      )
                    }
                    className={`p-3 rounded-xl border text-left text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                      isSelected
                        ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold ring-1 ring-brand-200"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span>{opt}</span>
                      {isSelected && (
                        <CheckCircle2
                          size={14}
                          className="text-brand-600 shrink-0 ml-1.5"
                        />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ============ YOUTH / MULTI-CHILD ============ */
        <div className="space-y-6">
          {/* Sibling Schedule Preference Box (shown when 2+ children) */}
          {isMultiChild && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-brand-50/70 via-white to-blue-50/50 border border-brand-200 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-500 text-white flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <h4 className="font-bold text-sm sm:text-base text-slate-900">
                    Sibling Scheduling Preference
                  </h4>
                  <p className="text-xs text-slate-500">
                    How would you like their trial lessons arranged?
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    updateField("siblingPreference", "simultaneous")
                  }
                  className={`p-3.5 rounded-xl border-2 text-left transition-all relative cursor-pointer ${
                    formData.siblingPreference === "simultaneous"
                      ? "border-brand-500 bg-white ring-2 ring-brand-100 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Clock
                        size={16}
                        className={
                          formData.siblingPreference === "simultaneous"
                            ? "text-brand-600"
                            : "text-slate-400"
                        }
                      />
                      <span className="font-bold text-sm text-slate-900">
                        Same Time (Simultaneous)
                      </span>
                    </div>
                    {formData.siblingPreference === "simultaneous" && (
                      <CheckCircle2
                        size={16}
                        className="text-brand-600 shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Side-by-side lessons at the same hour and day so you only
                    make one trip.
                  </p>
                  <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                    Recommended for Families
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => updateField("siblingPreference", "flexible")}
                  className={`p-3.5 rounded-xl border-2 text-left transition-all relative cursor-pointer ${
                    formData.siblingPreference === "flexible"
                      ? "border-brand-500 bg-white ring-2 ring-brand-100 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Waves
                        size={16}
                        className={
                          formData.siblingPreference === "flexible"
                            ? "text-brand-600"
                            : "text-slate-400"
                        }
                      />
                      <span className="font-bold text-sm text-slate-900">
                        Flexible Schedule
                      </span>
                    </div>
                    {formData.siblingPreference === "flexible" && (
                      <CheckCircle2
                        size={16}
                        className="text-brand-600 shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                    Either same time or whatever open slots have the best coach
                    availability.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Children List */}
          <div className="space-y-4">
            {formData.children.map((child, idx) => {
              const isFirst = idx === 0;
              const nameError = fieldErrors[`child_${child.id}_name`];
              const ageError = fieldErrors[`child_${child.id}_age`];

              return (
                <div
                  key={child.id}
                  className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-2xs space-y-4 relative"
                >
                  {/* Header of child card */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                        {formData.children.length > 1
                          ? `Child ${idx + 1}${
                              child.name ? ` (${child.name})` : ""
                            }`
                          : "Child Information"}
                      </h3>
                    </div>

                    {!isFirst && (
                      <button
                        type="button"
                        onClick={() => removeChild(child.id)}
                        className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>

                  {/* Name & Age Inputs */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">
                        <User size={14} className="inline mr-1.5" />
                        Child&apos;s Full Name *
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g. Emma Smith"
                        value={child.name}
                        onChange={(e) =>
                          updateChild(child.id, "name", e.target.value)
                        }
                      />
                      {nameError && <p className="form-error">{nameError}</p>}
                    </div>

                    <div>
                      <label className="form-label">
                        <Calendar size={14} className="inline mr-1.5" />
                        Child&apos;s Age (Years) *
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="e.g. 6"
                        min="0"
                        max="17"
                        value={child.age}
                        onChange={(e) =>
                          updateChild(child.id, "age", e.target.value)
                        }
                      />
                      {ageError && <p className="form-error">{ageError}</p>}
                    </div>
                  </div>

                  {/* Skill level selector for this child */}
                  <div>
                    <label className="form-label mb-2 text-xs text-slate-600">
                      <Waves
                        size={13}
                        className="inline mr-1.5 text-brand-500"
                      />
                      Current Swimming Level (Optional)
                    </label>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {CHILD_LEVEL_OPTIONS.map((opt) => {
                        const isSelected = child.skillLevel === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() =>
                              updateChild(
                                child.id,
                                "skillLevel",
                                isSelected ? "" : opt,
                              )
                            }
                            className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all cursor-pointer ${
                              isSelected
                                ? "border-brand-500 bg-brand-50 text-brand-700 font-semibold ring-1 ring-brand-200"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{opt}</span>
                              {isSelected && (
                                <CheckCircle2
                                  size={13}
                                  className="text-brand-600 shrink-0 ml-1"
                                />
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add Child / Sibling Button */}
            {formData.children.length < MAX_CHILDREN && (
              <button
                type="button"
                onClick={addChild}
                className="w-full py-3.5 px-4 border-2 border-dashed border-brand-300 hover:border-brand-500 rounded-2xl text-brand-600 hover:text-brand-700 hover:bg-brand-50/50 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>+ Add Another Child (Sibling)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
