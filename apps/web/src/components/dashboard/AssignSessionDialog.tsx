"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  User,
  Users,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { clientFetch } from "@/lib/api/_fetch/client";
import { bookTrialRequestSession } from "@/lib/api/client/trial-requests";
import type { TrialRequestItem } from "@/lib/api/client/trial-requests";
import { formatTimeRange } from "@/lib/schedule/slots";

export interface RosterStudent {
  id: string;
  type: "student" | "makeup" | "trial";
  name: string;
  studentId: string | null;
  level: string | null; // Actual system level (e.g., "Level 1", "Level 2")
  age: number | null;
  status: string | null;
  ratio: string;
  notes: string | null;
  isSkipped?: boolean;
}

export interface DailyClass {
  id: string; // Session ID
  offeringId: string;
  termId: string;
  termName?: string;
  title: string;
  type: "regular" | "flexible";
  time: string; // e.g. "10:00-10:30"
  instructors: Array<{
    id?: string;
    staffUserId?: string;
    staffName?: string;
    firstName?: string;
    lastName?: string;
  }>;
  capacity: number;
  filled: number;
  roster: RosterStudent[];
}

interface AssignSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: TrialRequestItem | null;
  onSuccess: () => void;
}

function parseRequestContext(notes: string | null) {
  if (!notes) {
    return {
      skillLevel: null,
      isSibling: false,
      siblingSummary: null,
      timingPreference: null,
      timePreference: null,
    };
  }

  const skillMatch = notes.match(/\[Skill Level:\s*([^\]]+)\]/i);
  const siblingMatch = notes.match(/\[Sibling Trial\s*[^:]*:\s*([^\]]+)\]/i);
  const timingMatch = notes.match(/\[Timing Preference:\s*([^\]]+)\]/i);
  const timePrefMatch = notes.match(/\[Time Preference:\s*([^\]]+)\]/i);

  return {
    skillLevel: skillMatch ? skillMatch[1].trim() : null,
    isSibling: !!siblingMatch,
    siblingSummary: siblingMatch ? siblingMatch[1].trim() : null,
    timingPreference: timingMatch ? timingMatch[1].trim() : null,
    timePreference: timePrefMatch ? timePrefMatch[1].trim() : null,
  };
}

export function AssignSessionDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: AssignSessionDialogProps) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [classRatio, setClassRatio] = useState<string>("3:1");
  const [bookingNote, setBookingNote] = useState<string>("");
  const [onlyOpenSpots, setOnlyOpenSpots] = useState<boolean>(false);

  const [classes, setClasses] = useState<DailyClass[]>([]);
  const [loadingClasses, setLoadingClasses] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const requestContext = useMemo(
    () => parseRequestContext(request?.notes ?? null),
    [request?.notes],
  );

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === selectedSessionId),
    [classes, selectedSessionId],
  );

  // Initialize date when dialog opens with a request
  useEffect(() => {
    if (request && open) {
      const initialDate =
        request.preferredDates && request.preferredDates.length > 0
          ? request.preferredDates[0]
          : new Date().toISOString().split("T")[0];

      setSelectedDate(initialDate);
      setSelectedSessionId("");
      setClassRatio("3:1");
      setBookingNote("");
      setOnlyOpenSpots(false);
    }
  }, [request, open]);

  // Load available sessions for chosen date
  const loadScheduleForDate = useCallback(
    async (dateStr: string) => {
      if (!dateStr) return;
      try {
        setLoadingClasses(true);
        setFetchError(null);
        setSelectedSessionId("");

        const locationParam = request?.locationId
          ? `?locationId=${request.locationId}`
          : "";
        const res = await clientFetch(
          `/terms/schedule/date/${dateStr}${locationParam}`,
        );
        const data = await res.json();

        if (data && Array.isArray(data.classes)) {
          // Only regular classes allow trials
          const regularClasses = data.classes.filter(
            (c: DailyClass) => c.type === "regular",
          );
          setClasses(regularClasses);
        } else {
          setClasses([]);
        }
      } catch (err) {
        console.error("Failed to load classes for date:", err);
        setFetchError(
          "Could not load classes for this date. Verify term schedule exists.",
        );
        setClasses([]);
      } finally {
        setLoadingClasses(false);
      }
    },
    [request?.locationId],
  );

  useEffect(() => {
    if (selectedDate && open) {
      loadScheduleForDate(selectedDate);
    }
  }, [selectedDate, open, loadScheduleForDate]);

  // Group classes by time slot
  const timeSlotGroups = useMemo(() => {
    const map = new Map<string, DailyClass[]>();
    for (const cls of classes) {
      const list = map.get(cls.time) || [];
      list.push(cls);
      map.set(cls.time, list);
    }

    const sortedKeys = Array.from(map.keys()).sort();

    return sortedKeys
      .map((timeKey) => {
        let slotClasses = map.get(timeKey) || [];

        if (onlyOpenSpots) {
          slotClasses = slotClasses.filter(
            (c) => Math.max(0, c.capacity - c.filled) > 0,
          );
        }

        const totalSeats = slotClasses.reduce((sum, c) => sum + c.capacity, 0);
        const filledSeats = slotClasses.reduce((sum, c) => sum + c.filled, 0);
        const openSeats = Math.max(0, totalSeats - filledSeats);

        // Check if parent's time preference overlaps this time
        let isPreferred = false;
        if (requestContext.timePreference) {
          const pref = requestContext.timePreference.toLowerCase();
          const fmt = formatTimeRange(timeKey).toLowerCase();
          isPreferred = pref.includes(timeKey) || pref.includes(fmt);
        }

        return {
          timeKey,
          formattedTime: formatTimeRange(timeKey),
          classes: slotClasses,
          totalSeats,
          openSeats,
          isFull: openSeats === 0,
          isPreferred,
        };
      })
      .filter((group) => group.classes.length > 0);
  }, [classes, onlyOpenSpots, requestContext.timePreference]);

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request || !selectedSessionId) {
      toast.error("Please select an available class session");
      return;
    }

    try {
      setSubmitting(true);
      await bookTrialRequestSession(request.id, {
        classSessionId: selectedSessionId,
        classRatio,
        notes: bookingNote.trim() || undefined,
      });

      toast.success(
        `Trial confirmed for ${request.childName}! Request marked as approved.`,
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to book trial session",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-w-5xl max-h-[85vh] h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <form onSubmit={handleConfirmBooking} className="flex flex-col h-full overflow-hidden">
          {/* Top Sticky Header */}
          <DialogHeader className="px-8 py-4.5 border-b border-slate-200 bg-white shrink-0">
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>Assign Trial Class Session</span>
            </DialogTitle>
          </DialogHeader>

          {/* Scrollable Body Content */}
          <div className="px-8 py-6 overflow-y-auto flex-1 space-y-6 min-h-0 pb-10">
            {/* Swimmer & Parent Information Card */}
            {request && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4 shadow-2xs">
                {/* Row 1: Swimmer info & Parent contact */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-lg font-bold text-slate-900">
                      {request.childName}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      Age {request.childAge}
                    </span>
                    {requestContext.skillLevel && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-700 border-blue-200 text-xs font-semibold px-2.5 py-0.5"
                      >
                        Target Level: {requestContext.skillLevel}
                      </Badge>
                    )}
                    {request.location && (
                      <Badge variant="outline" className="bg-white text-slate-600 text-xs px-2.5 py-0.5">
                        {request.location.name}
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-slate-600 flex items-center gap-2">
                    <span>
                      Parent: <strong className="text-slate-800">{request.parentName}</strong>
                    </span>
                    <span className="text-slate-300">•</span>
                    <a
                      href={`tel:${request.parentPhone}`}
                      className="text-blue-600 hover:text-blue-800 font-mono font-medium hover:underline"
                    >
                      {request.parentPhone}
                    </a>
                  </div>
                </div>

                {/* Row 2: Preferred Dates & Requested Time */}
                <div className="pt-3.5 border-t border-slate-200/70 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {request.preferredDates && request.preferredDates.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                        <CalendarDays size={13} className="text-blue-500" />
                        Requested Dates:
                      </span>
                      {request.preferredDates.map((dateStr) => {
                        const isSelected = selectedDate === dateStr;
                        return (
                          <button
                            key={dateStr}
                            type="button"
                            onClick={() => setSelectedDate(dateStr)}
                            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 text-white shadow-xs"
                                : "bg-white text-slate-700 border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                          >
                            {dateStr}
                          </button>
                        );
                      })}
                    </div>
                  ) : <div />}

                  {requestContext.timePreference && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500">Requested Time:</span>
                      <span className="font-semibold text-slate-800 bg-white px-2.5 py-0.5 rounded border border-slate-200">
                        {requestContext.timePreference}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sibling Highlight Banner - Standalone spacious card, generous padding */}
            {requestContext.isSibling && (
              <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-50 via-purple-50/80 to-indigo-50/40 border border-purple-200 text-slate-800 space-y-4 shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0 shadow-2xs">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base text-purple-950">
                          Sibling Group Trial
                        </span>
                        <Badge className="bg-purple-200 text-purple-900 hover:bg-purple-200 text-xs font-semibold border-purple-300 px-3 py-0.5">
                          {requestContext.timingPreference || "Same Time Slot"}
                        </Badge>
                      </div>
                      <p className="text-xs text-purple-700 font-medium mt-0.5">
                        Concurrent classes requested for siblings at the exact same time slot
                      </p>
                    </div>
                  </div>
                </div>

                {requestContext.siblingSummary && (
                  <div className="pt-3.5 border-t border-purple-200/70">
                    <div className="text-xs font-semibold text-purple-900 mb-2.5">
                      Swimmers in this sibling group:
                    </div>
                    <div className="flex flex-wrap items-center gap-2.5">
                      {requestContext.siblingSummary.split("&").map((item, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-white border border-purple-200/80 text-purple-950 font-medium text-xs shadow-2xs"
                        >
                          <User size={13} className="text-purple-600 shrink-0" />
                          <span>{item.trim()}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Date Picker & Filter Controls Bar */}
            <div className="px-6 py-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs shadow-2xs">
              <div className="flex items-center gap-3">
                <Label htmlFor="session-date" className="font-bold text-slate-700 whitespace-nowrap text-xs sm:text-sm">
                  Schedule Date:
                </Label>
                <Input
                  id="session-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-40 h-9 text-xs bg-white border-slate-200"
                />
                {classes.length > 0 && (
                  <span className="text-slate-500 text-xs ml-1 hidden sm:inline">
                    ({classes.length} classes across {timeSlotGroups.length} time slots)
                  </span>
                )}
              </div>

              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none bg-white hover:bg-slate-100/80 px-3.5 py-1.5 rounded-lg border border-slate-200 transition-colors">
                <input
                  type="checkbox"
                  checked={onlyOpenSpots}
                  onChange={(e) => setOnlyOpenSpots(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <Filter size={13} className="text-slate-500" />
                Only show classes with open spots
              </label>
            </div>

            {/* Time Slot Grouped Schedule */}
            <div className="space-y-6">
              {loadingClasses ? (
                <div className="space-y-3 pt-1">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : fetchError ? (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2.5">
                  <AlertCircle size={18} className="shrink-0 text-amber-600" />
                  <span>{fetchError}</span>
                </div>
              ) : timeSlotGroups.length === 0 ? (
                <div className="p-10 rounded-xl border border-dashed border-slate-300 text-center space-y-1.5 text-slate-500">
                  <Clock className="w-9 h-9 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No classes found on this date.</p>
                  <p className="text-xs text-slate-400">
                    {onlyOpenSpots
                      ? "Try unchecking 'Only show classes with open spots' or select another date."
                      : "Select another date or check the term schedule for regular classes."}
                  </p>
                </div>
              ) : (
                timeSlotGroups.map((group) => (
                  <div key={group.timeKey} className="space-y-3">
                    {/* Time Slot Section Header */}
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2.5">
                        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                          <Clock size={15} className="text-blue-600" />
                          {group.formattedTime}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs bg-slate-100 text-slate-700 font-medium border-slate-200/60 px-2.5 py-0.5"
                        >
                          {group.classes.length} {group.classes.length === 1 ? "class" : "classes"} concurrent
                        </Badge>
                        {group.isPreferred && (
                          <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[11px] gap-1 px-2.5 py-0.5">
                            <Sparkles size={11} />
                            Parent Preferred Time
                          </Badge>
                        )}
                      </div>

                      <div>
                        {group.openSeats > 0 ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                            {group.openSeats} {group.openSeats === 1 ? "spot" : "spots"} open
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                            All classes full
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Classes Grid with generous padding and margins */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {group.classes.map((cls) => {
                        const isSelected = selectedSessionId === cls.id;
                        const seatsLeft = Math.max(0, cls.capacity - cls.filled);
                        const isFull = seatsLeft === 0;

                        const coachName =
                          cls.instructors && cls.instructors.length > 0
                            ? cls.instructors
                                .map(
                                  (i) =>
                                    i.staffName ||
                                    (i.firstName
                                      ? `${i.firstName} ${i.lastName ?? ""}`.trim()
                                      : "Instructor"),
                                )
                                .join(", ")
                            : "Unassigned";

                        return (
                          <div
                            key={cls.id}
                            onClick={() => setSelectedSessionId(cls.id)}
                            className={`p-4 sm:p-4.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-3.5 ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-sm"
                                : isFull
                                  ? "border-slate-200 bg-slate-50/50 opacity-65 hover:opacity-100"
                                  : "border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs"
                            }`}
                          >
                            {/* Class Top Row: Title, Coach, Capacity Badge & Radio */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">
                                  {cls.title}
                                </h4>
                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                  <User size={13} className="text-slate-400 shrink-0" />
                                  <span>Coach: <strong className="text-slate-700">{coachName}</strong></span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant={
                                    isFull
                                      ? "destructive"
                                      : seatsLeft === 1
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className={`text-xs font-semibold px-2.5 py-0.5 ${
                                    !isFull && seatsLeft > 1
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : !isFull && seatsLeft === 1
                                        ? "bg-amber-50 text-amber-800 border-amber-200"
                                        : ""
                                  }`}
                                >
                                  {cls.filled}/{cls.capacity} filled • {isFull ? "Full" : `${seatsLeft} open`}
                                </Badge>

                                <div className="pt-0.5">
                                  {isSelected ? (
                                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                                      <CheckCircle2 size={16} />
                                    </div>
                                  ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-blue-400 transition-colors" />
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Enrolled Students Roster (Cleanly spaced chips) */}
                            <div className="pt-3 border-t border-slate-100/90 space-y-2">
                              {cls.roster.length === 0 ? (
                                <p className="text-xs text-slate-400 italic py-0.5">
                                  Empty class — all {cls.capacity} spots open.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-semibold text-slate-500">
                                    Current Students ({cls.roster.length}):
                                  </div>

                                  <div className="flex flex-wrap gap-1.5">
                                    {cls.roster.map((student) => (
                                      <div
                                        key={student.id}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-800 text-xs border border-slate-200/80 shadow-2xs"
                                      >
                                        <span className="font-semibold text-slate-900">
                                          {student.name}
                                        </span>

                                        {student.age !== null && (
                                          <span className="text-[11px] text-slate-500 font-medium">
                                            (age {student.age})
                                          </span>
                                        )}

                                        {student.level ? (
                                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/70">
                                            {student.level}
                                          </span>
                                        ) : (
                                          <span className="text-[10px] text-slate-400 italic">
                                            No level
                                          </span>
                                        )}

                                        {student.type === "trial" && (
                                          <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                            Trial
                                          </span>
                                        )}
                                        {student.type === "makeup" && (
                                          <span className="text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                                            Makeup
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Trial Booking Configuration Section (Ratio & Note) */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Booking Configuration
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select the lesson ratio and record any internal staff notes for this trial session
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="class-ratio" className="text-xs font-bold text-slate-700">
                    Instructor-to-Student Ratio
                  </Label>
                  <Select value={classRatio} onValueChange={setClassRatio}>
                    <SelectTrigger id="class-ratio" className="h-11 text-sm bg-slate-50/70 border-slate-200 rounded-lg">
                      <SelectValue placeholder="Select ratio" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3:1">3:1</SelectItem>
                      <SelectItem value="2:1">2:1</SelectItem>
                      <SelectItem value="1:1">1:1</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="booking-note" className="text-xs font-bold text-slate-700">
                    Internal Staff Note (Optional)
                  </Label>
                  <Input
                    id="booking-note"
                    placeholder="e.g., Confirmed with parent for Saturday"
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    className="h-11 text-sm bg-slate-50/70 border-slate-200 rounded-lg"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Fixed Sticky Footer Bar: Spacious & Uncramped */}
          <div className="px-8 py-5 border-t border-slate-200 bg-white shrink-0 flex flex-wrap items-center justify-between gap-5 shadow-xs">
            <div className="min-w-0">
              {selectedClass ? (
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-2xs">
                    <CheckCircle2 size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {selectedClass.title}
                      </span>
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold border-emerald-300 shrink-0 px-2.5 py-0.5">
                        {formatTimeRange(selectedClass.time)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate mt-0.5">
                      Ready to assign {request?.childName} • {classRatio} ratio
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3.5 text-slate-500">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      No class session selected
                    </p>
                    <p className="text-xs text-slate-500">
                      Select an available class slot above to assign this trial session
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-5 shrink-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={submitting}
                className="h-11 px-6 text-sm font-semibold cursor-pointer border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!selectedSessionId || submitting}
                className="bg-[#1c82c5] hover:bg-[#156a9e] text-white text-sm font-semibold h-11 px-8 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Booking &amp; Approve Request
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
