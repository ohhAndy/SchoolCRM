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
import { CalendarCheck, CalendarClock, CalendarX } from "lucide-react";
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

export type DailyClassRosterDesktopProps = {
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

export function DailyClassRosterDesktop({
  roster,
  userRole,
  updating,
  groupedLevels,
  handleLevelUpdate,
  handleStatusUpdate,
  handleRemarksSave,
  setActiveReportCardEnrollment,
  onLevelUpdate,
}: DailyClassRosterDesktopProps) {
  return (
    <div className="hidden md:block border rounded-md overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted text-left font-medium">
          <tr>
            <th className="p-3">Student</th>
            <th className="p-3 w-20">Age</th>
            <th className="p-3 w-24">Ratio</th>
            <th className="p-3 w-32">Level</th>
            <th className="p-3 w-28 text-center">Card</th>
            <th className="p-3 w-40 text-center">Status</th>
            <th className="p-3 w-16 text-center">Notes</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {roster.map((item) => (
            <tr
              key={item.id}
              className={cn(
                "hover:bg-muted/50 transition-colors",
                item.isSkipped && "bg-gray-50 opacity-60",
              )}
            >
              <td className="p-3">
                <div className="flex flex-col">
                  <div className="font-medium flex items-center gap-2">
                    {item.type === "student" && item.studentId ? (
                      <Link
                        href={`/students/${item.studentId}`}
                        className={`hover:underline ${item.enrollmentStatus !== "active" ? "text-muted-foreground line-through" : "text-blue-600"}`}
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
                      <Badge
                        variant="secondary"
                        className="text-[10px] h-4 px-1"
                      >
                        Makeup
                      </Badge>
                    )}
                    {item.type === "trial" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 bg-purple-50 text-purple-700"
                      >
                        Trial
                      </Badge>
                    )}
                    {item.type === "student" &&
                      hasMinRole(userRole, "supervisor") &&
                      item.nextTermStatus === "paid" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex ml-1 items-center justify-center">
                                <CalendarCheck className="w-4 h-4 text-green-600" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Next Term: Paid</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    {item.type === "student" &&
                      hasMinRole(userRole, "supervisor") &&
                      item.nextTermStatus === "enrolled" && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex ml-1 items-center justify-center">
                                <CalendarClock className="w-4 h-4 text-orange-500" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Next Term: Enrolled (Unpaid)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    {item.type === "student" &&
                      hasMinRole(userRole, "supervisor") &&
                      (!item.nextTermStatus ||
                        item.nextTermStatus === "not_registered") && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex ml-1 items-center justify-center opacity-20">
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
                  {item.type === "student" &&
                    item.attendanceTimeline &&
                    item.attendanceTimeline.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {item.attendanceTimeline.map((slot, idx) => {
                          let dotClass =
                            "w-2 h-2 rounded-full border transition-all duration-150";
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
                              " ring-1 ring-primary ring-offset-1 scale-125";
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
              </td>
              <td className="p-3">{item.age}</td>
              <td className="p-3">{item.ratio || "3:1"}</td>
              <td className="p-3">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    asChild
                    disabled={
                      !onLevelUpdate ||
                      item.type === "trial" ||
                      updating !== null ||
                      (item.type === "student" &&
                        item.enrollmentStatus !== "active" &&
                        !hasMinRole(userRole, "admin"))
                    }
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 font-normal justify-start px-2 w-full text-left"
                    >
                      {item.level ? (
                        LEVEL_MAP.get(item.level) || item.level
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </Button>
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
              </td>
              <td className="p-3 text-center">
                {item.type === "student" ? (
                  <button
                    onClick={() => setActiveReportCardEnrollment(item)}
                    className={cn(
                      "text-xs px-2 py-1 rounded border min-w-[80px] font-medium transition-colors hover:opacity-90",
                      getReportCardStatusConfig(item.reportCardStatus, "desktop").className,
                    )}
                  >
                    {getReportCardStatusConfig(item.reportCardStatus, "desktop").label}
                  </button>
                ) : item.type === "makeup" && item.normalSession ? (
                  <span className="text-xs font-medium text-muted-foreground whitespace-nowrap bg-muted px-2 py-1 rounded">
                    {item.normalSession}
                  </span>
                ) : (
                  <span className="text-muted-foreground text-xs">-</span>
                )}
              </td>
              <td className="p-3 text-center">
                <div className="flex justify-center">
                  <AttendanceButton
                    item={item}
                    loading={updating === `status-${item.id}`}
                    onUpdate={(s) => handleStatusUpdate(item, s)}
                    userRole={userRole}
                  />
                </div>
              </td>
              <td className="p-3 text-center">
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
                          className="text-yellow-600 hover:text-yellow-700"
                        >
                          Edit/View Remarks
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground opacity-50 hover:opacity-100"
                        >
                          Edit/View Remarks
                        </Button>
                      )
                    }
                  />
                ) : (
                  <span className="text-muted-foreground text-xs text-center block">
                    -
                  </span>
                )}
              </td>
            </tr>
          ))}
          {roster.length === 0 && (
            <tr>
              <td
                colSpan={6}
                className="p-8 text-center text-muted-foreground"
              >
                No students scheduled.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
