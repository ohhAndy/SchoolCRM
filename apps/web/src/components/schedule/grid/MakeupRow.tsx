"use client";

import { MakeupLite } from "@school/shared-types";
import { LEVEL_MAP } from "@/lib/constants/levels";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMakeUpStatusColour, calcAge } from "@/lib/utils/student-helpers";

const MAKEUP_OPTIONS = [
  { value: "", label: "Remove Makeup", shortLabel: "" },
  { value: "scheduled", label: "Scheduled", shortLabel: "S" },
  { value: "requested", label: "Requested", shortLabel: "R" },
  { value: "cancelled", label: "Cancelled", shortLabel: "X" },
  { value: "attended", label: "Attended", shortLabel: "P" },
  { value: "missed", label: "Missed", shortLabel: "A" },
];

interface MakeupRowProps {
  rowIndex: number;
  header: { key: string; label: string }[];
  makeUps: Record<string, MakeupLite[]>;
  makeupOverrides: Record<string, string | undefined>;
  updating: string | null;
  onMakeUpUpdate: (makeUpId: string, status: string) => Promise<void>;
}

export function MakeupRow({
  rowIndex,
  header,
  makeUps,
  makeupOverrides,
  updating,
  onMakeUpUpdate,
}: MakeupRowProps) {
  return (
    <div className="contents">
      <div className="px-2 py-1 text-center bg-blue-50"></div>
      <div className="px-2 py-1 font-bold text-center bg-blue-50 text-md text-gray-600">
        {rowIndex === 0 ? "Make-ups" : ""}
      </div>
      <div className="px-2 py-1 text-center bg-blue-50"></div>
      <div className="px-2 py-1 text-center bg-blue-50"></div>
      <div className="px-2 py-1 text-center bg-blue-50"></div>
      <div className="px-2 py-1 text-center bg-blue-50"></div>

      {header.map((h, colIndex) => {
        const dayKey = h.key + "T04:00:00.000Z";
        const makeUpsForDate = makeUps[dayKey] || [];
        const makeUpStudent = makeUpsForDate[rowIndex];

        if (makeUpStudent) {
          const override = makeupOverrides[makeUpStudent.id];
          if (override === "__removed__") {
            return (
              <div
                key={`makeup-removed-${rowIndex}-${colIndex}`}
                className="px-2 py-1 text-center bg-blue-50"
              ></div>
            );
          }
          const effectiveStatus = override ?? makeUpStudent.status;

          const statusMark =
            effectiveStatus === "attended"
              ? "P"
              : effectiveStatus === "scheduled"
                ? "S"
                : effectiveStatus === "requested"
                  ? "R"
                  : effectiveStatus === "cancelled"
                    ? "X"
                    : effectiveStatus === "missed"
                      ? "A"
                      : "";

          const statusClass = getMakeUpStatusColour(effectiveStatus);
          const updateKey = `makeup-${makeUpStudent.id}`;
          const isUpdating = updating === updateKey;

          return (
            <DropdownMenu key={`makeup-${rowIndex}-${colIndex}`}>
              <DropdownMenuTrigger asChild>
                <button
                  className={`px-1 py-1 text-center text-xs font-medium rounded hover:bg-gray-200 transition-colors cursor-pointer ${statusClass} ${
                    isUpdating ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  disabled={isUpdating}
                  title={`${makeUpStudent.studentName} (${makeUpStudent.level}) - Ratio: ${makeUpStudent.classRatio || "3:1"} (${makeUpStudent.status}) - Click to change`}
                >
                  <div className="truncate">
                    {makeUpStudent.studentName.split(" ")[0]}
                  </div>
                  <div className="truncate">
                    {makeUpStudent.level
                      ? LEVEL_MAP.get(makeUpStudent.level)
                      : ""}{" "}
                    -{" "}
                    {makeUpStudent.birthDate
                      ? calcAge(makeUpStudent.birthDate) + "y"
                      : ""}
                  </div>
                  <div className="font-bold">{statusMark}</div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {MAKEUP_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onSelect={() =>
                      onMakeUpUpdate(makeUpStudent.id, option.value)
                    }
                    className={
                      makeUpStudent.status === option.value ? "bg-blue-50" : ""
                    }
                  >
                    <span className="font-medium mr-2">
                      {option.shortLabel || "-"}
                    </span>
                    {option.label}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/students/${makeUpStudent.studentId}`}>
                    View Student Profile
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        } else {
          // Empty cell for dates with no make-up in this row
          return (
            <div
              key={`makeup-empty-${rowIndex}-${colIndex}`}
              className="px-2 py-1 text-center bg-blue-50"
            ></div>
          );
        }
      })}

      <div className="px-2 py-1 bg-blue-50" />
    </div>
  );
}
