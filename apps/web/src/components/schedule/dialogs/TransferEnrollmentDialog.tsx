"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ArrowRight } from "lucide-react";
import {
  transferEnrollment,
  getAvailableClassesForTransfer,
} from "@/lib/api/client/schedule";

import { FULL_DAY_LABELS } from "@/lib/schedule/slots";

interface TransferEnrollmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: {
    id: string;
    studentId: string;
    studentName: string;
    offeringId: string;
    offering: {
      id: string;
      title: string;
      weekday: number | null;
      startTime: string | null;
      endTime: string | null;
      termId: string;
      term: {
        id: string;
        name: string;
      };
    };
  };
  attendedSessions: Array<{ id: string; date: string; status: string }>;
  onSuccess: () => void;
}

interface AvailableClass {
  id: string;
  title: string;
  weekday: number | null;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  termId: string;
  term: { id: string; name: string };
  _count: { enrollments: number };
  sessions: Array<{ id: string; date: string }>;
}

export function TransferEnrollmentDialog({
  open,
  onOpenChange,
  enrollment,
  attendedSessions,
  onSuccess,
}: TransferEnrollmentDialogProps) {
  const router = useRouter();

  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>(
    [],
  );
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [selectedSkips, setSelectedSkips] = useState<Set<string>>(new Set());
  const [transferNotes, setTransferNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingClasses, setFetchingClasses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedClass = availableClasses.find((c) => c.id === selectedClassId);
  const attendedCount = attendedSessions.length;
  const isFull = selectedClass
    ? selectedClass._count.enrollments >= selectedClass.capacity
    : false;

  const fetchAvailableClasses = useCallback(async () => {
    try {
      setFetchingClasses(true);
      setError(null);
      const classes = await getAvailableClassesForTransfer(
        enrollment.offering.termId,
        enrollment.offeringId,
        levelFilter === "all" ? undefined : levelFilter,
      );
      setAvailableClasses(classes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch classes");
    } finally {
      setFetchingClasses(false);
    }
  }, [enrollment.offering.termId, enrollment.offeringId, levelFilter]);

  const autoSuggestSkips = useCallback(() => {
    if (!selectedClass) return;

    // Suggest skipping the first N sessions (where N = attended sessions count)
    const suggestedSkips = new Set<string>();
    const sortedSessions = [...selectedClass.sessions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    for (let i = 0; i < Math.min(attendedCount, sortedSessions.length); i++) {
      suggestedSkips.add(sortedSessions[i].id);
    }

    setSelectedSkips(suggestedSkips);
  }, [selectedClass, attendedCount]);

  // Reset dialog state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedClassId("");
      setSelectedSkips(new Set());
      setTransferNotes("");
      setError(null);
    }
  }, [open]);

  // Fetch available classes when dialog opens or level filter changes
  useEffect(() => {
    if (open) {
      fetchAvailableClasses();
    }
  }, [open, fetchAvailableClasses]);

  // Auto-suggest skips when class is selected
  useEffect(() => {
    if (selectedClass) {
      autoSuggestSkips();
    }
  }, [selectedClass, autoSuggestSkips]);

  function handleLevelFilterChange(value: string) {
    setLevelFilter(value);
  }

  function toggleSkip(sessionId: string) {
    const newSkips = new Set(selectedSkips);
    if (newSkips.has(sessionId)) {
      newSkips.delete(sessionId);
    } else {
      newSkips.add(sessionId);
    }
    setSelectedSkips(newSkips);
  }

  async function handleTransfer() {
    if (!selectedClassId) return;

    try {
      setLoading(true);
      setError(null);

      await transferEnrollment(enrollment.id, {
        targetOfferingId: selectedClassId,
        skippedSessionIds: Array.from(selectedSkips),
        transferNotes: transferNotes || undefined,
      });

      onSuccess();
      onOpenChange(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transfer failed");
    } finally {
      setLoading(false);
    }
  }

  function formatDateUTC(dateStr: string) {
    if (!dateStr) return "";
    // Return YYYY-MM-DD directly from ISO string part
    return dateStr.split("T")[0];
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Transfer Enrollment - {enrollment.studentName}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6">
          {/* Current Enrollment Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Current Class</h3>
            <div className="text-sm space-y-1">
              <div>
                <strong>Class:</strong> {enrollment.offering.title}
              </div>
              <div>
                <strong>Term:</strong> {enrollment.offering.term.name}
              </div>
              <div>
                <strong>Schedule:</strong>{" "}
                {FULL_DAY_LABELS[enrollment.offering.weekday ?? 0]}{" "}
                {enrollment.offering.startTime}-{enrollment.offering.endTime}
              </div>
              <div>
                <strong>Classes Attended:</strong> {attendedCount}
              </div>
            </div>
          </div>

          {/* Class Selection */}
          <div className="space-y-3">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Select Target Class</Label>
                <Select
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  disabled={fetchingClasses}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        fetchingClasses
                          ? "Loading classes..."
                          : "Select a class"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {availableClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.title} - {FULL_DAY_LABELS[cls.weekday ?? 0]}{" "}
                        {cls.startTime}-{cls.endTime} ({cls._count.enrollments}/
                        {cls.capacity})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Select
                value={levelFilter}
                onValueChange={handleLevelFilterChange}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  <SelectItem value="ps">Preschool</SelectItem>
                  <SelectItem value="sw">Swimmer</SelectItem>
                  <SelectItem value="adult">Adult</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isFull && (
              <div className="flex items-center gap-2 text-amber-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Warning: Target class is at full capacity</span>
              </div>
            )}
          </div>

          {/* Date Comparison & Skip Selection */}
          {selectedClass && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Select Classes to Skip</h3>
                <Badge variant="secondary">
                  {selectedSkips.size} skipped,{" "}
                  {selectedClass.sessions.length - selectedSkips.size} remaining
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Old Schedule with Attendance */}
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-3">
                    Previous Schedule
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {attendedSessions.map((session) => (
                      <div
                        key={session.id}
                        className="text-sm p-2 bg-gray-50 rounded"
                      >
                        <div className="font-medium">
                          {formatDateUTC(session.date)}
                        </div>
                        <div className="text-xs text-gray-600">
                          Status:{" "}
                          <Badge variant="outline" className="text-xs">
                            {session.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* New Schedule with Skip Selection */}
                <div className="border rounded-lg p-3">
                  <h4 className="font-medium text-sm mb-3">
                    New Schedule (Select to Skip)
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedClass.sessions
                      .sort(
                        (a, b) =>
                          new Date(a.date).getTime() -
                          new Date(b.date).getTime(),
                      )
                      .map((session, index) => {
                        const isSkipped = selectedSkips.has(session.id);
                        const isSuggested = index < attendedCount;

                        return (
                          <div
                            key={session.id}
                            className={`flex items-center gap-2 p-2 rounded ${
                              isSkipped ? "bg-gray-100" : "bg-blue-50"
                            }`}
                          >
                            <Checkbox
                              id={`skip-${session.id}`}
                              checked={isSkipped}
                              onCheckedChange={() => toggleSkip(session.id)}
                            />
                            <label
                              htmlFor={`skip-${session.id}`}
                              className="flex-1 text-sm cursor-pointer"
                            >
                              {formatDateUTC(session.date)}
                              {isSuggested && !isSkipped && (
                                <span className="text-xs text-gray-500 ml-2">
                                  (suggested)
                                </span>
                              )}
                            </label>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>

              <p className="text-xs text-gray-600">
                💡 First {attendedCount} dates are auto-suggested to skip based
                on classes already attended
              </p>
            </div>
          )}

          {/* Transfer Notes */}
          <div className="space-y-2">
            <Label>Transfer Notes (Optional)</Label>
            <Input
              placeholder="Add any notes about this transfer..."
              value={transferNotes}
              onChange={(e) => setTransferNotes(e.target.value)}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedClassId || loading}
          >
            {loading ? "Transferring..." : "Confirm Transfer"}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
