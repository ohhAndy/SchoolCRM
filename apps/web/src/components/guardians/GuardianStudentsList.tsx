"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  TransferEnrollmentDialog,
  ManageSkipsDialog,
} from "@/components/schedule/dialogs";
import { deleteEnrollment } from "@/lib/api/client/schedule";
import { StaffRole } from "@/lib/auth/permissions";
import { GuardianStudentCard } from "./GuardianStudentCard";
import type {
  GuardianStudentData,
  EnrollmentData,
  OfferingData,
} from "./guardian-view.types";

interface GuardianStudentsListProps {
  students: GuardianStudentData[];
  userRole: StaffRole;
}

export function GuardianStudentsList({
  students,
  userRole,
}: GuardianStudentsListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Transfer Dialog State
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<{
    id: string;
    offeringId: string;
    offering: OfferingData;
    attendedSessions: Array<{
      id: string;
      date: string;
      status: string;
    }>;
    studentId: string;
    studentName: string;
  } | null>(null);

  // Manage Skips Dialog State
  const [manageSkipsDialogOpen, setManageSkipsDialogOpen] = useState(false);
  const [selectedEnrollmentForSkips, setSelectedEnrollmentForSkips] = useState<{
    id: string;
    studentName: string;
    offering: OfferingData;
    attendedSessions: Array<{ id: string; status: string; date: string }>;
    skippedSessionIds: string[];
  } | null>(null);

  // Delete Enrollment Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<string | null>(
    null,
  );

  const handleTransferClick = (
    enrollment: EnrollmentData,
    student: { id: string; firstName: string; lastName: string },
  ) => {
    setSelectedEnrollment({
      id: enrollment.id,
      offeringId: enrollment.offering.id,
      offering: enrollment.offering,
      attendedSessions:
        enrollment.attendance?.map((a) => ({
          id: a.id,
          date: a.classSession.date,
          status: a.status,
        })) || [],
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
    });
    setTransferDialogOpen(true);
  };

  const handleTransferSuccess = () => {
    setTransferDialogOpen(false);
    setSelectedEnrollment(null);
    router.refresh();
  };

  const handleManageSkipsClick = (
    enrollment: EnrollmentData,
    student: { id: string; firstName: string; lastName: string },
  ) => {
    setSelectedEnrollmentForSkips({
      id: enrollment.id,
      studentName: `${student.firstName} ${student.lastName}`,
      offering: enrollment.offering,
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

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
        Students ({students.length})
      </h2>

      {students.map((student) => (
        <GuardianStudentCard
          key={student.id}
          student={student}
          userRole={userRole}
          onTransfer={handleTransferClick}
          onManageSkips={handleManageSkipsClick}
          onDelete={handleDeleteClick}
        />
      ))}

      {students.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No students found for this guardian.</p>
        </div>
      )}

      {/* Transfer Dialog */}
      {selectedEnrollment && (
        <TransferEnrollmentDialog
          open={transferDialogOpen}
          onOpenChange={setTransferDialogOpen}
          enrollment={selectedEnrollment}
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

      {/* Delete Confirmation Alert Dialog */}
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
    </div>
  );
}
