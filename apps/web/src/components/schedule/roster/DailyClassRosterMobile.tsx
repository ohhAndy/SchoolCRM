"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LEVEL_MAP } from "@/lib/constants/levels";
import { Level } from "@/lib/api/client/curriculum";
import { cn } from "@/lib/utils";
import { HelpCircle, CalendarCheck, CalendarClock } from "lucide-react";
import Link from "next/link";
import RemarksDialog from "../dialogs/RemarksDialog";
import { StaffRole, hasMinRole } from "@/lib/auth/permissions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RosterItem } from "./DailyClassRosterTypes";
import { AttendanceButton } from "./AttendanceButton";
import { getReportCardStatusConfig } from "@/lib/utils/student-helpers";

export type DailyClassRosterMobileProps = {
  roster: RosterItem[];
  userRole: StaffRole;
  updating: string | null;
  groupedLevels: Record<string, Level[]>;
  handleLevelUpdate: (studentId: string, levelId: string, levelName: string) => Promise<void>;
  handleStatusUpdate: (item: RosterItem, status: string) => Promise<void>;
  handleRemarksSave: (item: RosterItem, text: string) => Promise<void>;
  setActiveReportCardEnrollment: (item: RosterItem) => void;
  onLevelUpdate?: (studentId: string, levelId: string, levelName: string) => Promise<void>;
};

export function DailyClassRosterMobile({
  roster,
  userRole,
  updating,
  groupedLevels,
  handleLevelUpdate,
  handleStatusUpdate,
  handleRemarksSave,
  setActiveReportCardEnrollment,
  onLevelUpdate,
}: DailyClassRosterMobileProps) {
  return (
    <div className="md:hidden space-y-3">
      {roster.map((item) => (
        <div
          key={item.id}
          className={cn(
            "flex flex-col gap-2 p-3 rounded-lg border bg-card text-card-foreground shadow-sm",
            item.isSkipped && "opacity-60 bg-muted",
          )}
        >
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div className="font-semibold text-base flex items-center gap-2">
                {item.type === "student" && item.studentId ? (
                  <Link
                    href={`/students/${item.studentId}`}
                    className={`hover:underline ${item.enrollmentStatus !== "active" ? "text-muted-foreground line-through" : ""}`}
                    title={
                      item.enrollmentStatus !== "active"
                        ? `(${item.enrollmentStatus})`
                        : ""
                    }
                  >
                    {item.name}
                  </Link>
                ) : (
                  <span
                    className={
                      item.type === "student" && item.enrollmentStatus !== "active"
                        ? "text-muted-foreground line-through"
                        : ""
                    }
                  >
                    {item.name}
                  </span>
                )}
                {item.type === "makeup" && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    Makeup
                  </Badge>
                )}
                {item.type === "trial" && (
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 bg-purple-50 text-purple-700 border-purple-200"
                  >
                    Trial
                  </Badge>
                )}
                {item.type === "student" &&
                  hasMinRole(userRole, "supervisor") &&
                  item.nextTermStatus === "paid" && (
                    <CalendarCheck className="w-4 h-4 text-green-600 ml-1" />
                  )}
                {item.type === "student" &&
                  hasMinRole(userRole, "supervisor") &&
                  item.nextTermStatus === "enrolled" && (
                    <CalendarClock className="w-4 h-4 text-orange-500 ml-1" />
                  )}
                {/* Report Card Badge (Mobile) */}
                {item.type === "student" && (
                  <div className="ml-auto">
                    <Badge
                      onClick={() => setActiveReportCardEnrollment(item)}
                      variant="outline"
                      className={cn(
                        "text-[10px] h-5 cursor-pointer ml-1 transition-colors hover:opacity-90",
                        getReportCardStatusConfig(item.reportCardStatus, "mobile").className,
                      )}
                    >
                      {getReportCardStatusConfig(item.reportCardStatus, "mobile").label}
                    </Badge>
                  </div>
                )}
                {/* Normal Session for Makeup (Mobile) */}
                {item.type === "makeup" && item.normalSession && (
                  <div className="ml-auto">
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 bg-blue-50 text-blue-700 border-blue-200"
                    >
                      {item.normalSession}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {item.age ? `${item.age} yrs` : "Age N/A"} •{" "}
                {item.ratio || "3:1"}
              </div>
              {item.type === "student" &&
                item.attendanceTimeline &&
                item.attendanceTimeline.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {item.attendanceTimeline.map((slot, idx) => {
                      let dotClass =
                        "w-2.5 h-2.5 rounded-full border transition-all duration-150";
                      let label = `${slot.date}: `;
                      if (slot.status === "present") {
                        dotClass += " bg-green-500 border-green-600";
                        label += "Present";
                      } else if (slot.status === "absent") {
                        dotClass += " bg-red-500 border-red-600";
                        label += "Absent";
                      } else if (slot.status === "excused") {
                        dotClass += " bg-yellow-500 border-yellow-600";
                        label += "Excused";
                      } else if (slot.status === "skipped") {
                        dotClass +=
                          " bg-gray-800 border-black line-through opacity-70";
                        label += "Skipped";
                      } else if (slot.status === "upcoming") {
                        dotClass +=
                          " bg-transparent border-gray-300 border-dashed";
                        label += "Upcoming";
                      } else {
                        dotClass += " bg-gray-200 border-gray-300";
                        label += "Not Marked";
                      }

                      if (slot.isCurrent) {
                        dotClass +=
                          " ring-1 ring-primary ring-offset-1 scale-110";
                        label += " (Today)";
                      }

                      return (
                        <TooltipProvider key={idx}>
                          <Tooltip delayDuration={100}>
                            <TooltipTrigger asChild>
                              <span className={dotClass} />
                            </TooltipTrigger>
                            <TooltipContent>
                              <span className="text-xs font-medium">
                                {label}
                              </span>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                )}
            </div>

            {/* Level Badge (Editable) */}
            <DropdownMenu>
              <DropdownMenuTrigger
                disabled={
                  !onLevelUpdate ||
                  item.type === "trial" ||
                  updating !== null ||
                  (item.type === "student" &&
                    item.enrollmentStatus !== "active" &&
                    !hasMinRole(userRole, "admin"))
                }
              >
                <Badge
                  variant={item.level ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer hover:bg-primary/90 transition-colors",
                    !item.level && "text-muted-foreground",
                  )}
                >
                  {item.level
                    ? LEVEL_MAP.get(item.level) || item.level
                    : "No Level"}
                </Badge>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {Object.entries(groupedLevels).map(
                  ([category, catLevels]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {category}
                      </div>
                      {catLevels.map((lvl) => (
                        <DropdownMenuItem
                          key={lvl.id}
                          onSelect={() =>
                            item.studentId &&
                            handleLevelUpdate(
                              item.studentId,
                              lvl.id,
                              lvl.name,
                            )
                          }
                        >
                          <span
                            className={cn(
                              "mr-2",
                              item.level === lvl.name && "font-bold",
                            )}
                          >
                            {lvl.name}
                          </span>
                        </DropdownMenuItem>
                      ))}
                    </div>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 mt-1">
            {/* Attendance Action */}
            <AttendanceButton
              item={item}
              loading={updating === `status-${item.id}`}
              onUpdate={(s) => handleStatusUpdate(item, s)}
              userRole={userRole}
            />

            <div className="flex-1"></div>

            {/* Remarks */}
            {item.type === "student" || item.type === "makeup" ? (
              <RemarksDialog
                title={`${item.name} Remarks`}
                initialRemarks={item.notes}
                onSave={(t) => handleRemarksSave(item, t)}
                trigger={
                  item.notes ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-yellow-600"
                    >
                      <span className="sr-only">Remarks</span>
                      <HelpCircle className="h-4 w-4 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground opacity-50 hover:opacity-100"
                    >
                      <span className="sr-only">Add Note</span>
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  )
                }
              />
            ) : (
              <div className="w-8"></div>
            )}
          </div>
        </div>
      ))}
      {roster.length === 0 && (
        <div className="text-center text-muted-foreground p-4">
          No students in this class.
        </div>
      )}
    </div>
  );
}
