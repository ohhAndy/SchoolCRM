"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateEnrollmentSkips } from "@/lib/api/client/enrollments";

interface Attendance {
  id: string;
  status: string;
  date: string;
}

interface ManageSkipsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollment: {
    id: string;
    studentName: string;
    offering: {
      id: string;
      title: string;
      weekday: number | null;
      startTime: string | null;
      endTime: string | null;
      term: { name: string };
      sessions: Array<{ id: string; date: string }>;
    };
    attendedSessions: Attendance[]; // Sessions with attendance records
    skippedSessionIds: string[]; // Currently skipped sessions
  };
  onSuccess: () => void;
}

export function ManageSkipsDialog({
  open,
  onOpenChange,
  enrollment,
  onSuccess,
}: ManageSkipsDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [selectedSkips, setSelectedSkips] = useState<Set<string>>(new Set());

  // Initialize selected skips from props
  useEffect(() => {
    if (open) {
      setSelectedSkips(new Set(enrollment.skippedSessionIds));
    }
  }, [open, enrollment]);

  const toggleSkip = (sessionId: string) => {
    const newSkips = new Set(selectedSkips);
    if (newSkips.has(sessionId)) {
      newSkips.delete(sessionId);
    } else {
      newSkips.add(sessionId);
    }
    setSelectedSkips(newSkips);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      await updateEnrollmentSkips(enrollment.id, Array.from(selectedSkips));
      toast.success("Skips updated successfully");
      onSuccess();
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Failed to update skips");
    } finally {
      setLoading(false);
    }
  };

  function formatDateUTC(dateStr: string) {
    if (!dateStr) return "";
    return dateStr.split("T")[0];
  }

  // Map attendance by session ID for easy lookup
  const attendanceMap = new Map<string, string>();
  enrollment.attendedSessions.forEach((a) => {
    // If we have access to sessionId directly, great. Otherwise we might need to match by date if sessionId isn't passed in attendedSessions properly.
    // In GuardianView/StudentView we mapped it.
    // Note: The types in `GuardianViewClient` mapped `id` to `classSession.id`.
    attendanceMap.set(a.id, a.status);
  });

  const sortedSessions = [...enrollment.offering.sessions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Manage Skips</DialogTitle>
          <DialogDescription>
            Manage skips for {enrollment.studentName} in{" "}
            {enrollment.offering.title}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-2">
          <div className="space-y-1">
            {sortedSessions.map((session) => {
              const attendanceStatus = attendanceMap.get(session.id);
              const isSkipped = selectedSkips.has(session.id);
              const hasAttendance = !!attendanceStatus;

              return (
                <div
                  key={session.id}
                  className={`flex items-center gap-3 p-2 rounded border ${
                    isSkipped
                      ? "bg-gray-100 border-gray-200"
                      : hasAttendance
                        ? "bg-blue-50 border-blue-100"
                        : "bg-white border-transparent"
                  }`}
                >
                  <Checkbox
                    id={`skip-${session.id}`}
                    checked={isSkipped}
                    onCheckedChange={() => toggleSkip(session.id)}
                    disabled={hasAttendance} // Cannot skip if marked present/absent? Ideally yes, or show warning.
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={`skip-${session.id}`}
                      className={`text-sm font-medium ${
                        hasAttendance ? "cursor-not-allowed" : "cursor-pointer"
                      }`}
                    >
                      {formatDateUTC(session.date)}
                    </label>
                  </div>
                  {hasAttendance && (
                    <Badge variant="secondary" className="text-xs">
                      {attendanceStatus}
                    </Badge>
                  )}
                  {isSkipped && !hasAttendance && (
                    <Badge variant="outline" className="text-xs bg-gray-200">
                      Skipped
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
