"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { getLevels, Level } from "@/lib/api/client/curriculum";
import { ReportCardForm } from "@/components/report-cards/ReportCardForm";
import { StaffRole } from "@/lib/auth/permissions";
import { useRouter } from "next/navigation";
import { RosterItem } from "./DailyClassRosterTypes";
import { DailyClassRosterMobile } from "./DailyClassRosterMobile";
import { DailyClassRosterDesktop } from "./DailyClassRosterDesktop";

export type { RosterItem } from "./DailyClassRosterTypes";

type Props = {
  roster: RosterItem[];
  onLevelUpdate?: (
    studentId: string,
    levelId: string,
    levelName: string,
  ) => Promise<void>;
  onAttendanceUpdate?: (item: RosterItem, status: string) => Promise<void>;
  onRemarksUpdate?: (item: RosterItem, remarks: string) => Promise<void>;
  onReportCardUpdate?: (enrollmentId: string, status: string) => Promise<void>;
  userRole: StaffRole;
  termName?: string;
  instructorName?: string;
};

export function DailyClassRoster({
  roster,
  onLevelUpdate,
  onAttendanceUpdate,
  onRemarksUpdate,
  userRole,
  termName,
}: Props) {
  const router = useRouter();
  const [levels, setLevels] = useState<Level[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const [activeReportCardEnrollment, setActiveReportCardEnrollment] =
    useState<RosterItem | null>(null);

  useEffect(() => {
    getLevels().then(setLevels);
  }, []);

  const groupedLevels = levels.reduce(
    (acc, lvl) => {
      const category = lvl.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(lvl);
      return acc;
    },
    {} as Record<string, Level[]>,
  );

  const handleLevelUpdate = async (
    studentId: string,
    levelId: string,
    levelName: string,
  ) => {
    if (!onLevelUpdate) return;
    setUpdating(`level-${studentId}`);
    try {
      await onLevelUpdate(studentId, levelId, levelName);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update level");
    } finally {
      setUpdating(null);
    }
  };

  const handleStatusUpdate = async (item: RosterItem, status: string) => {
    if (!onAttendanceUpdate) return;
    setUpdating(`status-${item.id}`);
    try {
      await onAttendanceUpdate(item, status);
    } catch (e) {
      console.error(e);
      toast.error("Failed to update status");
    } finally {
      setUpdating(null);
    }
  };

  const handleRemarksSave = async (item: RosterItem, text: string) => {
    if (!onRemarksUpdate) return;
    await onRemarksUpdate(item, text);
  };

  const sharedProps = {
    roster,
    userRole,
    updating,
    groupedLevels,
    handleLevelUpdate,
    handleStatusUpdate,
    handleRemarksSave,
    setActiveReportCardEnrollment,
    onLevelUpdate,
  };

  return (
    <div className="space-y-4">
      <DailyClassRosterMobile {...sharedProps} />
      <DailyClassRosterDesktop {...sharedProps} />

      {/* Dialog for Report Card Form */}
      {activeReportCardEnrollment && (
        <Dialog
          open={activeReportCardEnrollment !== null}
          onOpenChange={(open) => !open && setActiveReportCardEnrollment(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Report Card</DialogTitle>
            <ReportCardForm
              enrollmentId={activeReportCardEnrollment.id}
              studentLevelId={
                levels.find((l) => l.name === activeReportCardEnrollment.level)
                  ?.id || undefined
              }
              studentName={activeReportCardEnrollment.name}
              termName={termName || "Current Term"}
              onClose={() => {
                setActiveReportCardEnrollment(null);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
