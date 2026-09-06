"use client";

import Link from "next/link";
import { TrialLite } from "@school/shared-types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getTrialStatusColour } from "@/lib/utils/student-helpers";

const TRIAL_OPTIONS = [
  { value: "", label: "Remove Trial", shortLabel: "" },
  { value: "scheduled", label: "Scheduled", shortLabel: "S" },
  { value: "attended", label: "Attended", shortLabel: "P" },
  { value: "noshow", label: "No Show", shortLabel: "A" },
  { value: "cancelled", label: "Cancelled", shortLabel: "X" },
];

interface TrialRowProps {
  rowIndex: number;
  header: { key: string; label: string }[];
  trials: Record<string, TrialLite[]>;
  trialOverrides: Record<string, string | undefined>;
  updating: string | null;
  onTrialUpdate: (trialId: string, status: string) => Promise<void>;
  onTrialConvert?: (trial: {
    id: string;
    childName: string;
    childAge: number;
    parentPhone: string;
  }) => void;
}

export function TrialRow({
  rowIndex,
  header,
  trials,
  trialOverrides,
  updating,
  onTrialUpdate,
  onTrialConvert,
}: TrialRowProps) {
  return (
    <div className="contents">
      <div className="px-2 py-1 text-center bg-purple-50"></div>
      <Link href="/trials" className="px-2 py-1 font-bold text-center bg-purple-50 text-md text-gray-600 block text-center">
        {rowIndex === 0 ? "Trials" : ""}
      </Link>
      <div className="px-2 py-1 text-center bg-purple-50"></div>
      <div className="px-2 py-1 text-center bg-purple-50"></div>
      <div className="px-2 py-1 text-center bg-purple-50"></div>
      <div className="px-2 py-1 text-center bg-purple-50"></div>

      {header.map((h, colIndex) => {
        const dayKey = h.key + "T04:00:00.000Z";
        const trialsForDate = trials[dayKey] || [];
        const trialStudent = trialsForDate[rowIndex];

        if (trialStudent) {
          const override = trialOverrides[trialStudent.id];

          if (override === "__removed__") {
            return (
              <div
                key={`trial-removed-${rowIndex}-${colIndex}`}
                className="px-2 py-1 text-center bg-purple-50"
              ></div>
            );
          }

          const effectiveStatus = override ?? trialStudent.status;

          const statusMark =
            effectiveStatus === "attended"
              ? "P"
              : effectiveStatus === "scheduled"
                ? "S"
                : effectiveStatus === "noshow"
                  ? "A"
                  : effectiveStatus === "converted"
                    ? "C"
                    : effectiveStatus === "cancelled"
                      ? "X"
                      : "";

          const statusClass = getTrialStatusColour(effectiveStatus);
          const updateKey = `trial-${trialStudent.id}`;
          const isUpdating = updating === updateKey;
          const isConverted = effectiveStatus === "converted";

          return (
            <DropdownMenu key={`trial-${rowIndex}-${colIndex}`}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-1 py-1 text-center text-xs font-medium rounded hover:bg-gray-200 transition-colors cursor-pointer ${statusClass} ${
                    isUpdating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isUpdating}
                  title={`${trialStudent.childName} (Age ${
                    trialStudent.childAge
                  }) - Ratio: ${trialStudent.classRatio || "3:1"} ${
                    isConverted
                      ? "(Converted - No further action)"
                      : `(${trialStudent.status}) - Click to change`
                  }`}
                >
                  <div className="truncate">
                    {trialStudent.childName} -{" "}
                    {trialStudent.childAge.toString()}y
                  </div>
                  <div className="font-bold">{statusMark}</div>
                </button>
              </DropdownMenuTrigger>
              {!isConverted && (
                <DropdownMenuContent>
                  {TRIAL_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() =>
                        onTrialUpdate(trialStudent.id, option.value)
                      }
                      className={
                        trialStudent.status === option.value
                          ? "bg-purple-50"
                          : ""
                      }
                    >
                      <span className="font-medium mr-2">
                        {option.shortLabel || "-"}
                      </span>
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                  {/* Convert Button */}
                  <DropdownMenuItem
                    onSelect={() => {
                      if (onTrialConvert) {
                        onTrialConvert({
                          id: trialStudent.id,
                          childName: trialStudent.childName,
                          childAge: trialStudent.childAge,
                          parentPhone: trialStudent.parentPhone,
                        });
                      }
                    }}
                    className="bg-blue-50 font-medium border-t"
                  >
                    <span className="font-bold mr-2">→</span>
                    Convert to Student
                  </DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
          );
        } else {
          return (
            <div
              key={`trial-empty-${rowIndex}-${colIndex}`}
              className="px-2 py-1 text-center bg-purple-50"
            ></div>
          );
        }
      })}

      <div className="px-2 py-1 bg-purple-50" />
    </div>
  );
}
