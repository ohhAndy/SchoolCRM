"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  TransferEnrollmentDialog,
  ManageSkipsDialog,
} from "@/components/schedule/dialogs";
import { ReportCardForm } from "@/components/report-cards/ReportCardForm";
import { GrantTokensDialog } from "./GrantTokensDialog";
import { deleteEnrollment } from "@/lib/api/client/schedule";
import { StaffRole } from "@/lib/auth/permissions";
import { StudentEnrollmentCard } from "./StudentEnrollmentCard";
import type { Enrollment, Student } from "@/lib/types/models";

interface StudentEnrollmentsListProps {
  student: Student;
  userRole: StaffRole;
  staffUserId?: string;
}

export function StudentEnrollmentsList({
  student,
  userRole,
  staffUserId,
}: StudentEnrollmentsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Transfer Dialog State
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<{
    id: string;
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
    attendedSessions: Array<{
      id: string;
      date: string;
      status: string;
    }>;
  } | null>(null);

  // Skips Dialog State
  const [manageSkipsDialogOpen, setManageSkipsDialogOpen] = useState(false);
  const [selectedEnrollmentForSkips, setSelectedEnrollmentForSkips] = useState<{
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
    attendedSessions: Array<{ id: string; status: string; date: string }>;
    skippedSessionIds: string[];
  } | null>(null);

  // Delete Enrollment Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(
    null,
  );

  // Report Card Modal State
  const [isReportCardOpen, setIsReportCardOpen] = useState(false);
  const [selectedReportCardEnrollment, setSelectedReportCardEnrollment] =
    useState<{
      enrollmentId: string;
      studentName: string;
      termName: string;
      instructorName: string;
    } | null>(null);

  // Grant Tokens Dialog State
  const [grantTokensDialogOpen, setGrantTokensDialogOpen] = useState(false);
  const [enrollmentForTokens, setEnrollmentForTokens] = useState<Enrollment | null>(null);

  const handleGrantTokensClick = (enrollment: Enrollment) => {
    setEnrollmentForTokens(enrollment);
    setGrantTokensDialogOpen(true);
  };

  const currentEnrollments = student.enrollments.filter(
    (e) => e.status === "active",
  );
  const pastEnrollments = student.enrollments.filter(
    (e) => e.status !== "active",
  );

  const handleTransferClick = (enrollment: Enrollment) => {
    setSelectedEnrollment({
      id: enrollment.id,
      offeringId: enrollment.offeringId,
      offering: enrollment.offering,
      attendedSessions: [
        ...(enrollment.attendance?.map((att) => ({
          id: att.classSession.id,
          date: att.classSession.date,
          status: att.status,
        })) ?? []),
        ...(enrollment.enrollmentSkips?.map((skip) => ({
          id: skip.classSession.id,
          date: skip.classSession.date,
          status: "skipped",
        })) ?? []),
      ].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    });
    setTransferDialogOpen(true);
  };

  const handleTransferSuccess = () => {
    setTransferDialogOpen(false);
    setSelectedEnrollment(null);
    router.refresh();
  };

  const handleManageSkipsClick = (enrollment: Enrollment) => {
    const sessions = enrollment.offering.sessions || [];
    setSelectedEnrollmentForSkips({
      id: enrollment.id,
      studentName: `${student.firstName} ${student.lastName}`,
      offering: {
        ...enrollment.offering,
        sessions,
      },
      attendedSessions:
        enrollment.attendance?.map((a) => ({
          id: a.classSession.id,
          status: a.status,
          date: a.classSession.date,
        })) || [],
      skippedSessionIds:
        enrollment.enrollmentSkips?.map((s) => s.classSessionId) || [],
    });
    setManageSkipsDialogOpen(true);
  };

  const handleDeleteClick = (enrollmentId: string) => {
    setEnrollmentToDelete(enrollmentId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!enrollmentToDelete) return;

    try {
      setLoading(true);
      await deleteEnrollment(enrollmentToDelete);
      setDeleteDialogOpen(false);
      setEnrollmentToDelete(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete enrollment:", error);
      alert(
        error instanceof Error ? error.message : "Failed to delete enrollment",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleViewReportCard = (
    enrollment: Enrollment,
    instructorNames: string,
  ) => {
    setSelectedReportCardEnrollment({
      enrollmentId: enrollment.id,
      studentName: `${student.firstName} ${student.lastName}`,
      termName: enrollment.offering.term.name,
      instructorName: instructorNames || "Unknown",
    });
    setIsReportCardOpen(true);
  };

  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Enrollment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Current Enrollments */}
          {currentEnrollments.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-green-700 mb-3">
                Current Enrollments
              </h3>
              <div className="space-y-2">
                {currentEnrollments.map((enrollment) => (
                  <StudentEnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    student={student}
                    userRole={userRole}
                    staffUserId={staffUserId}
                    isCurrent={true}
                    onTransfer={handleTransferClick}
                    onManageSkips={handleManageSkipsClick}
                    onDelete={handleDeleteClick}
                    onViewReportCard={handleViewReportCard}
                    onGrantTokens={handleGrantTokensClick}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Enrollments */}
          {pastEnrollments.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-700 mb-3">
                Past Enrollments
              </h3>
              <div className="space-y-4 opacity-75">
                {pastEnrollments.map((enrollment) => (
                  <StudentEnrollmentCard
                    key={enrollment.id}
                    enrollment={enrollment}
                    student={student}
                    userRole={userRole}
                    staffUserId={staffUserId}
                    isCurrent={false}
                    onTransfer={handleTransferClick}
                    onManageSkips={handleManageSkipsClick}
                    onDelete={handleDeleteClick}
                    onViewReportCard={handleViewReportCard}
                  />
                ))}
              </div>
            </div>
          )}

          {student.enrollments.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No enrollment history found.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transfer Dialog */}
      {selectedEnrollment && (
        <TransferEnrollmentDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          enrollment={{
            ...selectedEnrollment,
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
          }}
          attendedSessions={selectedEnrollment.attendedSessions}
          onSuccess={handleTransferSuccess}
        />
      )}

      {/* Manage Skips Dialog */}
      {selectedEnrollmentForSkips && (
        <ManageSkipsDialog
          open={manageSkipsDialogOpen}
          onOpenChange={setManageSkipsDialogOpen}
          enrollment={selectedEnrollmentForSkips}
          onSuccess={() => {
            setManageSkipsDialogOpen(false);
            setSelectedEnrollmentForSkips(null);
            router.refresh();
          }}
        />
      )}

      {/* Delete Enrollment Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              enrollment and remove the student from the class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report Card Modal */}
      {selectedReportCardEnrollment && (
        <Dialog open={isReportCardOpen} onOpenChange={setIsReportCardOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">Report Card</DialogTitle>
            <ReportCardForm
              enrollmentId={selectedReportCardEnrollment.enrollmentId}
              studentLevelId={student.levelId || undefined}
              studentName={selectedReportCardEnrollment.studentName}
              termName={selectedReportCardEnrollment.termName}
              onClose={() => {
                setIsReportCardOpen(false);
                setSelectedReportCardEnrollment(null);
                router.refresh();
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Grant Tokens Dialog */}
      {enrollmentForTokens && (
        <GrantTokensDialog
          open={grantTokensDialogOpen}
          onOpenChange={setGrantTokensDialogOpen}
          enrollment={enrollmentForTokens}
          studentName={`${student.firstName} ${student.lastName}`}
          onSuccess={() => {
            setGrantTokensDialogOpen(false);
            setEnrollmentForTokens(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
