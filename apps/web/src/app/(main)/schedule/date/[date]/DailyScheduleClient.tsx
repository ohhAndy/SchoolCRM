"use client";

import { BackButton } from "@/components/nav/BackButton";
import { format, addDays, subDays } from "date-fns";
import { updateStudentNotes, updateStudent } from "@/lib/api/client/students";
import { updateOfferingInfo } from "@/lib/api/client/schedule";
import { Input } from "@/components/ui/input";
import { updateReportCardStatus } from "@/lib/api/client/enrollments";
import { useRouter } from "next/navigation";
import type { RosterItem } from "@/components/schedule/roster";
import { DailyClassRoster } from "@/components/schedule/roster";
import { StaffRole } from "@/lib/auth/permissions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Pencil,
} from "lucide-react";
import {
  updateMakeupStatus,
  upsertAttendance,
} from "@/lib/api/client/attendance";
import { updateTrialStatus } from "@/lib/api/client/trial";
import { AssignInstructorDialog } from "@/components/schedule/dialogs";
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { InstructorInfo, TrialStatus } from "@school/shared-types";
import { formatTimeRange } from "@/lib/schedule/slots";

export interface DailyClass {
  id: string; // Session ID
  offeringId: string;
  termId: string;
  termName: string;
  title: string;
  type: "regular" | "flexible";
  time: string;
  instructors: InstructorInfo[];
  capacity: number;
  filled: number;
  roster: RosterItem[];
}

export interface DailyScheduleResponse {
  date: string;
  classes: DailyClass[];
}

export default function DailyScheduleClient({
  data,
  date,
  userRole,
}: {
  data: DailyScheduleResponse;
  date: string;
  userRole: string;
}) {
  const router = useRouter();

  const [editingClass, setEditingClass] = useState<DailyClass | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleInput, setTitleInput] = useState("");

  const canEditLevel =
    userRole === "admin" ||
    userRole === "manager" ||
    userRole === "super_admin";
  const canEditTitle =
    userRole === "admin" ||
    userRole === "manager" ||
    userRole === "supervisor" ||
    userRole === "super_admin";

  const handleLevelUpdate = async (
    studentId: string,
    levelId: string,
    levelName: string,
  ) => {
    await updateStudent(studentId, { level: levelName, levelId });
    router.refresh();
  };

  return (
    <main className="p-4 md:p-6 pb-20 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <BackButton fallbackHref="/dashboard" />
          <div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const prevDate = format(
                    subDays(new Date(date + "T00:00:00"), 1),
                    "yyyy-MM-dd",
                  );
                  router.push(`/schedule/date/${prevDate}`);
                }}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h1 className="text-2xl font-bold tracking-tight">
                {format(new Date(date + "T00:00:00"), "EEEE, MMMM do, yyyy")}
              </h1>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  const nextDate = format(
                    addDays(new Date(date + "T00:00:00"), 1),
                    "yyyy-MM-dd",
                  );
                  router.push(`/schedule/date/${nextDate}`);
                }}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-muted-foreground">Location Schedule</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {data.classes.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/30 rounded-lg">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No classes scheduled for this date.</p>
          </div>
        ) : (
          <Tabs defaultValue={data.classes[0]?.time}>
            <div className="overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0">
              <TabsList className="w-auto inline-flex justify-start md:justify-center">
                {Array.from(new Set(data.classes.map((c) => c.time))).map(
                  (time) => (
                    <TabsTrigger key={time} value={time}>
                      {formatTimeRange(time)}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </div>

            {Array.from(new Set(data.classes.map((c) => c.time))).map(
              (time) => (
                <TabsContent key={time} value={time} className="space-y-8 mt-6">
                  {Object.entries(
                    data.classes
                      .filter((c) => c.time === time)
                      .reduce(
                        (acc, cls) => {
                          (acc[cls.termName] = acc[cls.termName] || []).push(
                            cls,
                          );
                          return acc;
                        },
                        {} as Record<string, DailyClass[]>,
                      ),
                  ).map(([termName, classesInTerm]) => (
                    <div key={termName} className="space-y-4">
                      <h3 className="text-lg font-semibold text-muted-foreground border-b pb-2">
                        {termName}
                      </h3>
                      {classesInTerm.map((cls) => (
                        <Card key={cls.id} className="overflow-hidden">
                          <CardHeader className="bg-muted/40 py-3 border-b">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="flex items-center gap-2">
                                  {editingTitleId === cls.offeringId ? (
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={titleInput}
                                        onChange={(e) =>
                                          setTitleInput(e.target.value)
                                        }
                                        className="h-8 w-[200px]"
                                        autoFocus
                                      />
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-green-600 hover:text-green-700"
                                        onClick={async () => {
                                          if (!titleInput.trim()) return;
                                          await updateOfferingInfo(
                                            cls.offeringId,
                                            titleInput,
                                          );
                                          setEditingTitleId(null);
                                          router.refresh();
                                        }}
                                      >
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-red-600 hover:text-red-700"
                                        onClick={() => setEditingTitleId(null)}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <CardTitle className="text-lg">
                                        {cls.title}
                                      </CardTitle>
                                      {canEditTitle && (
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="h-6 w-6 text-muted-foreground hover:text-primary"
                                          onClick={() => {
                                            setEditingTitleId(cls.offeringId);
                                            setTitleInput(cls.title);
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                                  <Clock className="w-4 h-4" />
                                  {formatTimeRange(cls.time)}
                                  <span className="mx-1">•</span>
                                  {cls.instructors.length > 0
                                    ? cls.instructors
                                        .map((i) => i.staffName)
                                        .join(", ")
                                    : "No Instructor"}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 ml-2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setEditingClass(cls)}
                                  >
                                    <Edit className="h-3 w-3" />
                                    <span className="sr-only">
                                      Edit Instructors
                                    </span>
                                  </Button>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-primary">
                                  {cls.filled}/{cls.capacity}
                                </div>
                                <div className="text-xs text-muted-foreground uppercase font-medium">
                                  Students
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-0">
                            <DailyClassRoster
                              roster={cls.roster}
                              termName={cls.termName}
                              instructorName={
                                cls.instructors.length > 0
                                  ? cls.instructors
                                      .map((i) => i.staffName)
                                      .join(", ")
                                  : "No Instructor"
                              }
                              onLevelUpdate={
                                canEditLevel ? handleLevelUpdate : undefined
                              }
                              onAttendanceUpdate={async (item, status) => {
                                if (item.type === "student") {
                                  // cls.id is the classSessionId
                                  await upsertAttendance(
                                    item.id,
                                    cls.id,
                                    status as
                                      | "present"
                                      | "absent"
                                      | "excused"
                                      | "",
                                  );
                                } else if (item.type === "makeup") {
                                  await updateMakeupStatus(
                                    item.id,
                                    status as
                                      | "scheduled"
                                      | "requested"
                                      | "cancelled"
                                      | "attended"
                                      | "missed"
                                      | "",
                                  ); // item.id is makeupId
                                } else if (item.type === "trial") {
                                  await updateTrialStatus(
                                    item.id,
                                    status as TrialStatus | "",
                                  ); // item.id is bookingId
                                }
                                router.refresh();
                              }}
                              onRemarksUpdate={async (item, remarks) => {
                                if (
                                  (item.type === "student" ||
                                    item.type === "makeup") &&
                                  item.studentId
                                ) {
                                  await updateStudentNotes(
                                    item.studentId,
                                    remarks,
                                  );
                                  router.refresh();
                                }
                              }}
                              onReportCardUpdate={async (
                                enrollmentId,
                                status,
                              ) => {
                                await updateReportCardStatus(
                                  enrollmentId,
                                  status,
                                );
                                router.refresh();
                              }}
                              userRole={userRole as StaffRole}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ))}
                </TabsContent>
              ),
            )}
          </Tabs>
        )}
      </div>

      {editingClass && (
        <AssignInstructorDialog
          open={!!editingClass}
          onOpenChange={(open) => !open && setEditingClass(null)}
          classOfferingId={editingClass.offeringId}
          currentInstructors={editingClass.instructors}
          levelName={editingClass.title}
          onSuccess={() => {
            router.refresh();
          }}
        />
      )}
    </main>
  );
}
