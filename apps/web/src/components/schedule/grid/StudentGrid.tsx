"use client";

import type {
  MakeupLite,
  RosterResponse,
  TrialLite,
} from "@school/shared-types";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { StudentRow } from "./StudentRow";
import { MakeupRow } from "./MakeupRow";
import { TrialRow } from "./TrialRow";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { CurrentUser } from "@/lib/auth/user";
import { hasPermission } from "@/lib/auth/permissions";

import { Row } from "./grid-types";

function buildRow(rosters: RosterResponse[]): Row[] {
  const map = new Map<string, Row>();
  for (const r of rosters) {
    const dayKey = r.session.date.slice(0, 10) + "T04:00:00.000Z";
    for (const p of r.roster) {
      const cur = map.get(p.enrollmentId) ?? {
        id: p.enrollmentId,
        name: p.studentName,
        paymentStatus: p.paymentStatus,
        balance: p.balance,
        invoiceNumber: p.invoiceNumber,
        classRatio: p.classRatio,
        studentId: p.studentId,
        code: p.shortCode ?? null,
        level: p.studentLevel,
        levelId: (p as { studentLevelId?: string | null }).studentLevelId || null,
        birthdate: p.studentBirthDate,
        skippedSessionIds: p.skippedSessionIds,
        marks: {} as Record<string, string>,
        markMeta: {} as Record<string, { notes: string | null }>,
        enrollmentId: p.enrollmentId,
        remarks: p.notes ?? null,
        reportCardStatus: p.reportCardStatus,
        nextTermStatus: p.nextTermStatus,
        enrollmentStatus: p.enrollmentStatus,
      };

      const s = p.attendance?.status;
      const mark =
        s === "present"
          ? "P"
          : s === "absent"
            ? "A"
            : s === "excused"
              ? "E"
              : "";
      if (mark) {
        cur.marks[dayKey] = mark;
        cur.markMeta[dayKey] = { notes: p.attendance?.notes ?? null };
      }
      map.set(p.enrollmentId, cur);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function buildMakeUps(rosters: RosterResponse[]): Record<string, MakeupLite[]> {
  const makeUpsByDate: Record<string, MakeupLite[]> = {};
  for (const r of rosters) {
    const dayKey = r.session.date.slice(0, 10) + "T04:00:00.000Z";
    if (r.makeups.length > 0) {
      makeUpsByDate[dayKey] = r.makeups.sort((a, b) =>
        a.studentName.localeCompare(b.studentName),
      );
    }
  }
  return makeUpsByDate;
}

function buildTrials(rosters: RosterResponse[]): Record<string, TrialLite[]> {
  const trialsByDate: Record<string, TrialLite[]> = {};
  for (const r of rosters) {
    const dayKey = r.session.date.slice(0, 10) + "T04:00:00.000Z";
    if (r.trials && r.trials.length > 0) {
      trialsByDate[dayKey] = r.trials.sort((a, b) =>
        a.childName.localeCompare(b.childName),
      );
    }
  }
  return trialsByDate;
}

export function StudentGrid({
  isoDates,
  rosters,
  onAttendanceUpdate,
  onMakeUpUpdate,
  onMakeUpClick,
  onTrialUpdate,
  onTrialClick,
  onTrialConvert,
  onRemarksUpdate,
  user,
  termName,
  instructorName,
}: {
  isoDates: string[];
  rosters: RosterResponse[];
  onAttendanceUpdate?: (
    enrollmentId: string,
    sessionId: string,
    status: string,
  ) => Promise<void>;
  onMakeUpUpdate?: (makeUpId: string, status: string) => Promise<void>;
  onMakeUpClick?: (date: string) => void;
  onTrialUpdate?: (trialId: string, status: string) => Promise<void>;
  onTrialClick?: (date: string) => void;
  onTrialConvert?: (trial: {
    id: string;
    childName: string;
    childAge: number;
    parentPhone: string;
  }) => void;
  onRemarksUpdate?: (enrollmentId: string, notes: string) => Promise<void>;
  user: CurrentUser;
  termName: string;
  instructorName: string;
}) {
  const [updating, setUpdating] = useState<string | null>(null);

  // Local optimistic overrides
  const [attnOverrides, setAttnOverrides] = useState<
    Record<string, string | undefined>
  >({});
  const [makeupOverrides, setMakeupOverrides] = useState<
    Record<string, string | undefined>
  >({});
  const [trialOverrides, setTrialOverrides] = useState<
    Record<string, string | undefined>
  >({});


  const rows = useMemo(() => buildRow(rosters), [rosters]);
  const makeUps = useMemo(() => buildMakeUps(rosters), [rosters]);
  const trials = useMemo(() => buildTrials(rosters), [rosters]);

  const header = useMemo(() => {
    return isoDates.map((iso) => {
      const d = new Date(iso);
      // Use UTC to ensure we show the server-persisted date exactly
      const dateLabel = d.toLocaleDateString("en-US", {
        timeZone: "UTC",
        month: "numeric",
        day: "numeric",
      });

      // Find session for this date
      const dateKey = iso.split("T")[0]; // YYYY-MM-DD
      const roster = rosters.find((r) => r.session.date.startsWith(dateKey));

      return {
        key: dateKey,
        label: dateLabel,
        filled: roster?.filled,
        capacity: roster?.capacity,
        openSeats: roster?.openSeats,
      };
    });
  }, [isoDates, rosters]);

  const dateToSessionId = new Map<string, string>();
  for (const r of rosters) {
    const dateKey = r.session.date.slice(0, 10) + "T04:00:00.000Z";
    dateToSessionId.set(dateKey, r.session.id);
  }

  const cols = isoDates.length;

  const maxMakeUpsPerDate = Math.max(
    0,
    ...Object.values(makeUps).map((m) => m.length),
  );
  const maxTrialsPerDate = Math.max(
    0,
    ...Object.values(trials).map((t) => t.length),
  );

  const handleAttendanceUpdate = async (
    enrollmentId: string,
    dayKey: string,
    newStatus: string,
  ) => {
    const sessionId = dateToSessionId.get(dayKey);
    if (!sessionId || !onAttendanceUpdate) return;

    const updateKey = `${enrollmentId}-${dayKey}`;
    const overrideKey = `${enrollmentId}|${dayKey}`;

    setAttnOverrides((m) => ({ ...m, [overrideKey]: newStatus }));
    setUpdating(updateKey);

    try {
      await onAttendanceUpdate(enrollmentId, sessionId, newStatus);
    } catch (error) {
      console.error("Failed to Update Attendance", error);
      toast.error("Failed to update attendance");
      setAttnOverrides((m) => {
        const n = { ...m };
        delete n[overrideKey];
        return n;
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleMakeUpUpdate = async (makeUpId: string, newStatus: string) => {
    if (!onMakeUpUpdate) return;

    const updateKey = `makeup-${makeUpId}`;

    if (newStatus === "") {
      setMakeupOverrides((prev) => ({ ...prev, [makeUpId]: "__removed__" }));
    } else {
      setMakeupOverrides((prev) => ({ ...prev, [makeUpId]: newStatus }));
    }

    setUpdating(updateKey);

    try {
      await onMakeUpUpdate(makeUpId, newStatus);
    } catch (error) {
      console.error("Failed to update make-up:", error);
      toast.error("Failed to update make-up");
      setMakeupOverrides((m) => {
        const n = { ...m };
        delete n[makeUpId];
        return n;
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleTrialUpdate = async (trialId: string, newStatus: string) => {
    if (!onTrialUpdate) return;

    const updateKey = `trial-${trialId}`;

    if (newStatus === "") {
      setTrialOverrides((prev) => ({ ...prev, [trialId]: "__removed__" }));
    } else {
      setTrialOverrides((prev) => ({ ...prev, [trialId]: newStatus }));
    }

    setUpdating(updateKey);

    try {
      await onTrialUpdate(trialId, newStatus);
    } catch (error) {
      console.error("Failed to update trial:", error);
      toast.error("Failed to update trial");
      setTrialOverrides((m) => {
        const n = { ...m };
        delete n[trialId];
        return n;
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveRemarks = async (enrollmentId: string, remarks: string) => {
    if (!onRemarksUpdate) return;

    const updateKey = `remarks-${enrollmentId}`;
    setUpdating(updateKey);

    try {
      await onRemarksUpdate(enrollmentId, remarks);
    } catch (error) {
      console.error("Failed to update remarks:", error);
      toast.error("Failed to update remarks");
    } finally {
      setUpdating(null);
    }
  };


  const canEdit: boolean = hasPermission(user.role, "markAttendance");

  return (
    <div
      className="grid border text-sm bg-gray-200 gap-px"
      style={{
        gridTemplateColumns: `0.5fr 2fr 52px 52px 52px 52px repeat(${cols}, minmax(52px,1fr)) 1.5fr`,
      }}
    >
      <div className="bg-muted px-2 py-1 text-center font-semibold">Status</div>
      <div className="bg-muted px-2 py-1 text-center font-semibold">
        Student
      </div>
      <div className="bg-muted px-2 py-1 text-center font-semibold">Ratio</div>
      <div className="bg-muted px-2 py-1 text-center font-semibold">Age</div>
      <div className="bg-muted px-2 py-1 text-center font-semibold">Level</div>
      <div className="bg-muted px-2 py-1 text-center font-semibold">Card</div>
      {header.map((h, i) => (
        <div
          key={`h-${i}`}
          className="bg-muted px-2 py-1 text-center font-semibold sticky top-0 z-10 flex flex-col items-center justify-center leading-tight"
          title={`Status: ${h.filled}/${h.capacity} Filled`}
        >
          <span>{h.label}</span>
          {typeof h.openSeats === "number" && (
            <span
              className={`text-[10px] ${
                h.openSeats === 0
                  ? "text-red-600 font-bold"
                  : "text-gray-500 font-normal"
              }`}
            >
              {h.openSeats} left
            </span>
          )}
        </div>
      ))}

      <div className="bg-muted px-2 py-1 font-semibold text-center">
        Remarks
      </div>

      {rows.map((r) => (
        <StudentRow
          key={r.id}
          row={r}
          header={header}
          dateToSessionId={dateToSessionId}
          attnOverrides={attnOverrides}
          updating={updating}
          canEdit={canEdit}
          onAttendanceUpdate={handleAttendanceUpdate}
          onSaveRemarks={handleSaveRemarks}
          userRole={user.role}
          termName={termName}
          instructorName={instructorName}
        />
      ))}

      {maxMakeUpsPerDate > 0 && (
        <>
          <div className="col-span-full border-t-2 border-gray-00 my-1"></div>
          {Array.from({ length: maxMakeUpsPerDate }, (_, rowIndex) => (
            <MakeupRow
              key={`makeup-row-${rowIndex}`}
              rowIndex={rowIndex}
              header={header}
              makeUps={makeUps}
              makeupOverrides={makeupOverrides}
              updating={updating}
              onMakeUpUpdate={handleMakeUpUpdate}
            />
          ))}
        </>
      )}

      {/* TRIAL BOOKINGS SECTION */}
      {maxTrialsPerDate > 0 && (
        <>
          {Array.from({ length: maxTrialsPerDate }, (_, rowIndex) => (
            <TrialRow
              key={`trial-row-${rowIndex}`}
              rowIndex={rowIndex}
              header={header}
              trials={trials}
              trialOverrides={trialOverrides}
              updating={updating}
              onTrialUpdate={handleTrialUpdate}
              onTrialConvert={onTrialConvert}
            />
          ))}
        </>
      )}

      <div className="contents group">
        <div className="px-2 py-1 text-center bg-gray-50"></div>
        <div className="px-2 py-1 text-center bg-gray-50 text-md text-gray-500">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity">
            Add
          </span>
        </div>
        <div className="px-2 py-1 text-center bg-gray-50"></div>
        <div className="px-2 py-1 text-center bg-gray-50"></div>
        <div className="px-2 py-1 text-center bg-gray-50"></div>
        <div className="px-2 py-1 text-center bg-gray-50"></div>

        {header.map((h, colIndex) => {
          const dayKey = h.key + "T04:00:00.000Z";
          return (
            <div
              key={`add-${colIndex}`}
              className="px-2 py-1 text-center bg-gray-50 group-hover:bg-gray-100 transition-colors"
            >
              <PermissionGate
                allowedRoles={["super_admin", "admin", "manager"]}
                currentRole={user.role}
              >
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Makeup Button */}
                  <button
                    onClick={() => onMakeUpClick?.(dayKey)}
                    className="w-full flex flex-col items-center justify-center py-1 rounded hover:bg-blue-100 text-blue-600 hover:text-blue-700 leading-none gap-0.5"
                    title={`Add makeup for ${h.label}`}
                  >
                    <span className="text-sm font-bold">+</span>
                    <span className="text-[10px]">Makeup</span>
                  </button>

                  {/* Trial Button */}
                  <button
                    onClick={() => onTrialClick?.(dayKey)}
                    className="w-full flex flex-col items-center justify-center py-1 rounded hover:bg-purple-100 text-purple-600 hover:text-purple-700 leading-none gap-0.5"
                    title={`Add trial for ${h.label}`}
                  >
                    <span className="text-sm font-bold">+</span>
                    <span className="text-[10px]">Trial</span>
                  </button>
                </div>
              </PermissionGate>
            </div>
          );
        })}

        <div className="px-2 py-1 bg-gray-50" />
      </div>
    </div>
  );
}
