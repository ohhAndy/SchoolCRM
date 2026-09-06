"use client";

import { Row } from "./grid-types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LEVEL_MAP } from "@/lib/constants/levels";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RemarksDialog from "../dialogs/RemarksDialog";
import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  CalendarClock,
  CalendarX,
  CalendarCheck,
  RotateCcw,
} from "lucide-react";
import { calcAge, markClass, getReportCardStatusConfig } from "@/lib/utils/student-helpers";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ReportCardForm } from "@/components/report-cards/ReportCardForm";
import { useState } from "react";
import { StaffRole } from "@/lib/auth/permissions";

// Duplicate of getPaymentStatus for now, can be extracted if needed
function getPaymentStatus(
  status: string | null,
  invoiceNumber: string | null,
  balance: number | null,
) {
  if (!status) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center">
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Not Invoiced</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "paid") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Paid (Invoice #{invoiceNumber})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "partial") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-yellow-600" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Partial Payment</p>
            <p className="text-xs">
              Balance: ${balance ? balance.toFixed(2) : "can't find balance"}
            </p>
            <p className="text-xs">Invoice #{invoiceNumber}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "void") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center">
              <span className="text-[10px] text-gray-500 wrap-break-word">
                VOID
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Invoice Voided</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (status === "refunded") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center">
              <RotateCcw className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Refunded (Invoice #{invoiceNumber})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return null;
}

const ATTENDANCE_OPTIONS = [
  { value: "", label: "Not marked", shortLabel: "" },
  { value: "present", label: "Present", shortLabel: "P" },
  { value: "absent", label: "Absent", shortLabel: "A" },
  { value: "excused", label: "Excused", shortLabel: "E" },
];

interface StudentRowProps {
  row: Row;
  header: { key: string; label: string }[];
  dateToSessionId: Map<string, string>;
  attnOverrides: Record<string, string | undefined>;
  updating: string | null;
  canEdit: boolean;
  onAttendanceUpdate: (
    enrollmentId: string,
    dayKey: string,
    status: string,
  ) => Promise<void>;
  onSaveRemarks: (enrollmentId: string, remarks: string) => Promise<void>;
  userRole: StaffRole;
  termName: string;
  instructorName: string;
}

export function StudentRow({
  row,
  header,
  dateToSessionId,
  attnOverrides,
  updating,
  canEdit,
  onAttendanceUpdate,
  onSaveRemarks,
  userRole,
  termName,
}: StudentRowProps) {
  const router = useRouter();
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const currentReportCardStatus =
    row.reportCardStatus ??
    "not_created";

  return (
    <div className="contents">
      <div className="px-2 py-1 flex items-center justify-center gap-1 bg-white">
        {getPaymentStatus(row.paymentStatus, row.invoiceNumber, row.balance)}
        {userRole !== "supervisor" && row.nextTermStatus === "paid" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <CalendarCheck className="w-4 h-4 text-green-600" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Next Term: Paid</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {userRole !== "supervisor" && row.nextTermStatus === "enrolled" && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center justify-center">
                  <CalendarClock className="w-4 h-4 text-orange-500" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Next Term: Enrolled (Unpaid)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        {userRole !== "supervisor" &&
          (!row.nextTermStatus || row.nextTermStatus === "not_registered") && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center opacity-20">
                    <CalendarX className="w-4 h-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Next Term: Not Registered</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
      </div>
      <div className="px-2 py-1 text-center truncate max-w-[150px] bg-white">
        <Link
          className={`hover:underline ${row.enrollmentStatus !== "active" ? "text-gray-400 line-through" : ""}`}
          href={`/students/${row.studentId}`}
          title={row.name + (row.enrollmentStatus !== "active" ? ` (${row.enrollmentStatus})` : "")}
        >
          {row.name}
        </Link>
      </div>
      <div className="px-2 py-1 text-center bg-white">
        {row.classRatio ? row.classRatio : ""}
      </div>
      <div className="px-2 py-1 text-center bg-white">
        {row.birthdate ? calcAge(row.birthdate) : ""}
      </div>
      <div className="px-2 py-1 text-center bg-white">
        {row.level ? LEVEL_MAP.get(row.level) || row.level : ""}
      </div>
      <div className="p-0 text-center bg-white flex justify-center">
        <Dialog open={isReportCardOpen} onOpenChange={setIsReportCardOpen}>
          <button
            onClick={() => setIsReportCardOpen(true)}
            disabled={!canEdit}
            className={`w-full h-full text-[10px] font-medium flex items-center justify-center transition-colors min-h-[36px] ${
              getReportCardStatusConfig(currentReportCardStatus, "row").className
            }`}
            title={
              currentReportCardStatus === "completed" || currentReportCardStatus === "sent"
                ? "Click to view report card"
                : "Click to grade/edit report card"
            }
          >
            {getReportCardStatusConfig(currentReportCardStatus, "row").label}
          </button>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Report Card</DialogTitle>
            <ReportCardForm
              enrollmentId={row.enrollmentId}
              studentLevelId={row.levelId || undefined}
              studentName={row.name}
              termName={termName}
              onClose={() => {
                setIsReportCardOpen(false);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {header.map((h, i) => {
        const dayKey = h.key + "T04:00:00.000Z";
        const sessionId = dateToSessionId.get(dayKey);
        const isSkipped =
          sessionId && row.skippedSessionIds.includes(sessionId);
        const updateKey = `${row.enrollmentId}-${dayKey}`;
        const isUpdating = updating === updateKey;

        const baseMark = row.marks[dayKey];
        const baseStatus =
          baseMark === "P"
            ? "present"
            : baseMark === "A"
              ? "absent"
              : baseMark === "E"
                ? "excused"
                : "";

        const overrideStatus = attnOverrides[`${row.enrollmentId}|${dayKey}`];
        const currentStatus = overrideStatus ?? baseStatus;

        const notes = row.markMeta?.[dayKey]?.notes;
        const isTransferred = notes?.includes("[Transferred]");

        const mark =
          currentStatus === "present"
            ? "P"
            : currentStatus === "absent"
              ? "A"
              : currentStatus === "excused"
                ? "E"
                : "";

        if (isSkipped) {
          return (
            <div
              key={`${row.id}-${i}`}
              className="px-2 py-1 text-center font-semibold rounded bg-black text-white"
            >
              SKIP
            </div>
          );
        }

        return (
          <DropdownMenu key={`${row.id}-${i}`}>
            <DropdownMenuTrigger asChild>
              <button
                className={`content-center relative px-2 py-1 text-center font-semibold rounded transition-all hover:bg-gray-200 ${markClass(
                  mark,
                )} ${
                  isUpdating || !canEdit || (row.enrollmentStatus !== "active" && userRole !== "admin" && userRole !== "super_admin")
                    ? "opacity-50 cursor-not-allowed"
                    : "cursor-pointer"
                } ${(!canEdit || (row.enrollmentStatus !== "active" && userRole !== "admin" && userRole !== "super_admin")) ? "pointer-events-none opacity-70" : ""} ${
                  isTransferred
                    ? "border border-transparent"
                    : "border border-transparent"
                }`}
                disabled={isUpdating || !canEdit || (row.enrollmentStatus !== "active" && userRole !== "admin" && userRole !== "super_admin")}
                title={
                  canEdit
                    ? `${row.name} - ${h.label}${
                        isTransferred ? " (Transferred)" : ""
                      } - Click to change attendance`
                    : `${row.name} - ${h.label}${
                        isTransferred ? " (Transferred)" : ""
                      } - Read Only`
                }
              >
                {mark ?? ""}
                {isTransferred && (
                  <span className="absolute top-0.5 right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-purple-600 text-[8px] text-white font-bold leading-none shadow-sm pointer-events-none">
                    T
                  </span>
                )}
                <span className="sr-only">(Transferred)</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {ATTENDANCE_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onSelect={() => {
                    if (canEdit) {
                      onAttendanceUpdate(
                        row.enrollmentId,
                        dayKey,
                        option.value,
                      );
                    }
                  }}
                  className={currentStatus === option.value ? "bg-blue-50" : ""}
                >
                  <span className="font-medium mr-2">
                    {option.shortLabel || "—"}
                  </span>
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
      <div className="px-2 py-1 flex items-center justify-center bg-white">
        {row.remarks ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <RemarksDialog
                    key={row.id + "-remarks"}
                    title={`${row.name} - Remarks`}
                    initialRemarks={row.remarks}
                    triggerLabel="View / Edit"
                    onSave={(remarks) =>
                      onSaveRemarks(row.studentId, remarks)
                    }
                  />
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs break-words">
                {row.remarks}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <RemarksDialog
            key={row.id + "-remarks"}
            title={`${row.name} - Remarks`}
            initialRemarks={row.remarks}
            triggerLabel="View / Edit"
            onSave={(remarks) => onSaveRemarks(row.studentId, remarks)}
          />
        )}
      </div>
    </div>
  );
}
