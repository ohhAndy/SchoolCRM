"use client";

import React, { useState, useEffect } from "react";
import {
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Info,
  Loader2,
  Users,
} from "lucide-react";
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
} from "date-fns";
import { FormData, TrialDate, LocationOption, MAX_DATES } from "../types";

interface Step3DateSelectionProps {
  formData: FormData;
  availableDates: TrialDate[];
  loadingDates: boolean;
  fieldErrors: Record<string, string>;
  selectedLocation?: LocationOption;
  toggleDate: (dateStr: string) => void;
  removeDate: (dateStr: string) => void;
  clearAllDates: () => void;
  updateField?: (field: keyof FormData, value: unknown) => void;
}

export function Step3DateSelection({
  formData,
  availableDates,
  loadingDates,
  fieldErrors,
  selectedLocation,
  toggleDate,
  removeDate,
  clearAllDates,
  updateField,
}: Step3DateSelectionProps) {
  const isMultiChild =
    formData.participantType === "child" && formData.children.length > 1;

  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date());

  // Automatically sync calendar to month with available dates if current month has none
  useEffect(() => {
    if (availableDates.length > 0) {
      const todayPrefix = format(new Date(), "yyyy-MM");
      const hasDatesThisMonth = availableDates.some((d) =>
        d.date.startsWith(todayPrefix),
      );
      if (!hasDatesThisMonth) {
        const firstDate = parseISO(availableDates[0].date + "T12:00:00");
        setCurrentMonth(firstDate);
      }
    }
  }, [availableDates]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => addMonths(prev, 1));
  };

  const handleToday = () => {
    setCurrentMonth(new Date());
  };

  const canGoPrev = !isBefore(
    startOfMonth(subMonths(currentMonth, 1)),
    startOfMonth(new Date()),
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({
    start: calendarStart,
    end: calendarEnd,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl text-slate-900 mb-1">
          Pick Your Preferred Dates
        </h2>
        <p className="text-slate-500 text-sm">
          Select up to {MAX_DATES} dates that work best for your schedule at{" "}
          <strong>{selectedLocation?.name || "our facility"}</strong>.
        </p>
      </div>

      {/* Sibling Schedule Notification Banner */}
      {isMultiChild && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
          <Users size={18} className="text-blue-600 shrink-0" />
          <p className="text-blue-800 text-xs sm:text-sm">
            <strong>
              Scheduling for {formData.children.length} children:
            </strong>{" "}
            Dates selected below will apply to all siblings. Our coordinators
            will arrange{" "}
            <span className="font-semibold underline">
              {formData.siblingPreference === "simultaneous"
                ? "simultaneous (same time)"
                : "flexible"}
            </span>{" "}
            lessons for your visit.
          </p>
        </div>
      )}

      {loadingDates ? (
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50/50 rounded-2xl border border-slate-200">
          <Loader2 size={32} className="text-brand-500 animate-spin mb-3" />
          <span className="text-slate-600 font-medium">
            Loading available trial schedule...
          </span>
        </div>
      ) : availableDates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-slate-200 p-8">
          <Calendar size={44} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-700 font-semibold text-lg">
            No specific trial dates listed right now for{" "}
            {selectedLocation?.name || "this location"}.
          </p>
          <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
            Please feel free to proceed and submit the form. Our scheduling
            coordinators will contact you to arrange a custom trial session.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Calendar Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            {/* Calendar Header Bar */}
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 shadow-2xs">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-xl sm:text-2xl text-slate-900 tracking-tight">
                    {format(currentMonth, "MMMM yyyy")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select up to {MAX_DATES} available trial dates
                  </p>
                </div>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleToday}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-2xs cursor-pointer"
                >
                  Today
                </button>
                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    disabled={!canGoPrev}
                    aria-label="Previous month"
                    className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next month"
                    className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex items-center flex-wrap gap-4 text-xs text-slate-600 px-4 sm:px-5 py-2.5 bg-slate-50/60 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 inline-block" />
                <span className="font-medium text-slate-700">Open for Trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-brand-600 ring-2 ring-brand-200 inline-block" />
                <span className="font-medium text-slate-700">
                  Selected (Max {MAX_DATES})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                <span className="text-slate-400">Unavailable / Past</span>
              </div>
            </div>

            {/* Weekday Header */}
            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/40 text-center">
              {[
                { short: "Sun", full: "Sunday" },
                { short: "Mon", full: "Monday" },
                { short: "Tue", full: "Tuesday" },
                { short: "Wed", full: "Wednesday" },
                { short: "Thu", full: "Thursday" },
                { short: "Fri", full: "Friday" },
                { short: "Sat", full: "Saturday" },
              ].map((w) => (
                <div
                  key={w.short}
                  className="py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  <span className="sm:hidden">{w.short}</span>
                  <span className="hidden sm:inline">{w.full}</span>
                </div>
              ))}
            </div>

            {/* Calendar Days Matrix */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 p-2 sm:p-4 bg-slate-50/30">
              {calendarDays.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const inCurrentMonth = isSameMonth(day, currentMonth);
                const isPast = isBefore(
                  startOfDay(day),
                  startOfDay(new Date()),
                );
                const isAvailable = availableDates.some(
                  (a) => a.date === dateStr,
                );
                const isSelected = formData.preferredDates.includes(dateStr);
                const isMaxReached =
                  formData.preferredDates.length >= MAX_DATES;

                if (!inCurrentMonth) {
                  return (
                    <div
                      key={dateStr}
                      className="min-h-[72px] sm:min-h-[96px] md:min-h-[105px] p-2 rounded-xl flex flex-col justify-between opacity-30 pointer-events-none select-none bg-slate-50/40 border border-transparent"
                    >
                      <span className="text-xs sm:text-sm font-semibold text-slate-400">
                        {format(day, "d")}
                      </span>
                    </div>
                  );
                }

                if (isSelected) {
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => toggleDate(dateStr)}
                      className="min-h-[72px] sm:min-h-[96px] md:min-h-[105px] p-2 sm:p-3 rounded-xl flex flex-col justify-between text-left transition-all relative select-none bg-brand-600 text-white shadow-md ring-2 ring-brand-400 ring-offset-2 scale-[1.02] cursor-pointer"
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="text-base sm:text-lg md:text-xl font-extrabold text-white">
                          {format(day, "d")}
                        </span>
                        <div className="w-5 h-5 rounded-full bg-white/25 backdrop-blur-xs flex items-center justify-center text-white">
                          <Check size={12} strokeWidth={3} />
                        </div>
                      </div>
                      <div className="w-full">
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-white/20 backdrop-blur-xs text-white">
                          Selected
                        </span>
                      </div>
                    </button>
                  );
                }

                if (isAvailable && !isPast) {
                  const disabledDueToMax = isMaxReached && !isSelected;
                  return (
                    <button
                      key={dateStr}
                      type="button"
                      onClick={() => toggleDate(dateStr)}
                      disabled={disabledDueToMax}
                      className={`min-h-[72px] sm:min-h-[96px] md:min-h-[105px] p-2 sm:p-3 rounded-xl flex flex-col justify-between text-left transition-all relative select-none ${
                        disabledDueToMax
                          ? "bg-white border border-slate-200 opacity-60 cursor-not-allowed"
                          : "bg-white border-2 border-emerald-300 hover:border-brand-500 hover:bg-brand-50/40 hover:shadow-md cursor-pointer group"
                      }`}
                    >
                      <div className="flex items-start justify-between w-full">
                        <span className="text-base sm:text-lg md:text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {format(day, "d")}
                        </span>
                        <span className="relative flex h-2.5 w-2.5 mt-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                        </span>
                      </div>
                      <div className="w-full">
                        <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-1.5 sm:px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/60 group-hover:bg-brand-100 group-hover:text-brand-800 group-hover:border-brand-300 transition-colors">
                          <span className="hidden sm:inline">Open</span> Trial
                        </span>
                      </div>
                    </button>
                  );
                }

                // Unavailable or past
                return (
                  <div
                    key={dateStr}
                    className="min-h-[72px] sm:min-h-[96px] md:min-h-[105px] p-2 sm:p-3 rounded-xl flex flex-col justify-between select-none bg-slate-50/60 border border-slate-100 text-slate-400 cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between w-full">
                      <span className="text-sm sm:text-base font-medium text-slate-400">
                        {format(day, "d")}
                      </span>
                      {isToday(day) && (
                        <span className="text-[9px] font-semibold text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded">
                          Today
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium">
                      {isPast ? "Past" : "No Slots"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selection Summary Tray */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-brand-50/80 via-white to-teal-50/50 border border-brand-100 shadow-2xs space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm sm:text-base">
                  Your Selected Dates
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    formData.preferredDates.length === MAX_DATES
                      ? "bg-amber-100 text-amber-800 border border-amber-200"
                      : formData.preferredDates.length > 0
                        ? "bg-brand-100 text-brand-700 border border-brand-200"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {formData.preferredDates.length} of {MAX_DATES} selected
                </span>
              </div>

              {formData.preferredDates.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllDates}
                  className="text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Selected Date Pills */}
            {formData.preferredDates.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-1">
                Click any day marked with &ldquo;Open Trial&rdquo; on the
                calendar above to choose your preferred date (select 1 to{" "}
                {MAX_DATES}).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {formData.preferredDates.map((dateStr) => (
                  <div
                    key={dateStr}
                    className="inline-flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-white border border-brand-200 shadow-2xs text-slate-800 text-xs sm:text-sm font-semibold group hover:border-brand-400 transition-all"
                  >
                    <CalendarDays size={14} className="text-brand-500" />
                    <span>
                      {format(
                        parseISO(dateStr + "T12:00:00"),
                        "EEEE, MMM d, yyyy",
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeDate(dateStr)}
                      aria-label={`Remove date ${dateStr}`}
                      className="w-5 h-5 rounded-md hover:bg-red-50 hover:text-red-600 text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-start gap-2 pt-1 border-t border-slate-100 text-xs text-slate-500">
              <Info size={14} className="text-brand-500 shrink-0 mt-0.5" />
              <span>
                Lessons run for a regular class time. Selecting multiple options
                gives our coordinators maximum flexibility to assess your
                swimmer&apos;s level and recommend the right class.
              </span>
            </div>
          </div>

          {/* ============ TIME PREFERENCE & OPERATING HOURS (OPTION A) ============ */}
          {(() => {
            const selectedDayTypes = formData.preferredDates.map((dateStr) => {
              const d = parseISO(dateStr + "T12:00:00");
              const day = d.getDay(); // 0 is Sun, 6 is Sat
              return day === 0 || day === 6 ? "weekend" : "weekday";
            });

            const hasWeekdays = selectedDayTypes.includes("weekday");
            const hasWeekends = selectedDayTypes.includes("weekend");

            const allTimeOptions = [
              {
                id: "weekday_early",
                label: "Weekday Early",
                sublabel: "3:30 PM – 5:30 PM (After School)",
                icon: "🎒",
                category: "weekday",
              },
              {
                id: "weekday_late",
                label: "Weekday Evening",
                sublabel: "5:30 PM – 8:00 PM (Dinner / Late)",
                icon: "🚗",
                category: "weekday",
              },
              {
                id: "weekend_morning",
                label: "Weekend Morning",
                sublabel: "9:00 AM – 12:00 PM",
                icon: "🌅",
                category: "weekend",
              },
              {
                id: "weekend_afternoon",
                label: "Weekend Afternoon",
                sublabel: "12:00 PM – 3:30 PM",
                icon: "☀️",
                category: "weekend",
              },
              {
                id: "flexible",
                label: "Flexible / Any Time",
                sublabel: "First available matching opening",
                icon: "🔄",
                category: "both",
              },
            ];

            const visibleOptions = allTimeOptions.filter((opt) => {
              if (opt.id === "flexible") return true;
              if (hasWeekdays && !hasWeekends) return opt.category === "weekday";
              if (!hasWeekdays && hasWeekends) return opt.category === "weekend";
              return true; // if both or no dates selected yet
            });

            const currentPrefs = Array.isArray(formData.timePreferences)
              ? formData.timePreferences
              : formData.timePreference
                ? [formData.timePreference]
                : ["flexible"];

            const handleTimePrefToggle = (optId: string) => {
              if (optId === "flexible") {
                updateField?.("timePreferences", ["flexible"]);
                updateField?.("timePreference", "flexible");
                return;
              }

              let updated = currentPrefs.filter((p) => p !== "flexible");
              if (updated.includes(optId)) {
                updated = updated.filter((p) => p !== optId);
                if (updated.length === 0) {
                  updated = ["flexible"];
                }
              } else {
                updated.push(optId);
              }

              updateField?.("timePreferences", updated);
              updateField?.("timePreference", updated[0] as any);
            };

            return (
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div>
                    <label className="block text-sm font-bold text-slate-900">
                      Preferred Time Window(s)
                    </label>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {hasWeekdays && !hasWeekends
                        ? "Showing weekday after-school windows for your selected dates. Select all that fit."
                        : !hasWeekdays && hasWeekends
                          ? "Showing weekend windows for your selected dates. Select all that fit."
                          : hasWeekdays && hasWeekends
                            ? "You selected both weekday and weekend dates. Select all time windows that work for your family."
                            : "Let our placement coordinators know which time windows fit your family's schedule."}
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-brand-600 bg-brand-50 px-2 py-0.5 rounded-md self-start sm:self-auto border border-brand-100/80">
                    Select all that apply
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {visibleOptions.map((opt) => {
                    const isSelected = currentPrefs.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleTimePrefToggle(opt.id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "border-brand-500 bg-brand-50/70 shadow-xs ring-2 ring-brand-400/20"
                            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50/60"
                        }`}
                      >
                        <span className="text-lg shrink-0 mt-0.5">{opt.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs sm:text-sm font-bold text-slate-900">
                              {opt.label}
                            </span>
                            {isSelected && (
                              <div className="w-4 h-4 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0">
                                <Check size={10} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {opt.sublabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Operating Hours Reminder Banner */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/80 flex items-start gap-2.5 text-xs text-amber-900">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-950">
                      Swan Swim School Lesson Operating Hours:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-amber-800">
                      <p>• <strong>Weekdays (Mon–Fri):</strong> 3:30 PM – 8:00 PM</p>
                      <p>• <strong>Saturday:</strong> 9:00 AM – 5:00 PM</p>
                      <p>• <strong>Sunday:</strong> 9:00 AM – 3:30 PM</p>
                    </div>
                    <p className="text-[11px] text-amber-700 italic pt-0.5">
                      Weekday lessons operate after 3:30 PM. For morning sessions, please select weekend dates.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {fieldErrors.preferredDates && (
            <p className="form-error font-medium">
              {fieldErrors.preferredDates}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
