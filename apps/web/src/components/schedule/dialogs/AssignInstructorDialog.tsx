"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, X } from "lucide-react";
import {
  assignInstructor,
  removeInstructor,
  getInstructors,
  type Instructor,
} from "@/lib/api/client/instructors";
import type { InstructorInfo } from "@school/shared-types";

interface AssignInstructorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classOfferingId: string;
  currentInstructors: InstructorInfo[];
  onSuccess: () => void;
  levelName: string;
}

export function AssignInstructorDialog({
  open,
  onOpenChange,
  classOfferingId,
  currentInstructors,
  onSuccess,
  levelName,
}: AssignInstructorDialogProps) {
  const [availableInstructors, setAvailableInstructors] = useState<
    Instructor[]
  >([]);
  const [selectedInstructorId, setSelectedInstructorId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadInstructors();
    }
  }, [open]);

  const loadInstructors = async () => {
    try {
      setLoadingInstructors(true);
      setError(null);
      // Get all active instructors
      const instructors = await getInstructors(true);
      setAvailableInstructors(instructors);
    } catch (error) {
      setError("Failed to load instructors");
      console.error(error);
    } finally {
      setLoadingInstructors(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedInstructorId) return;

    try {
      setLoading(true);
      setError(null);
      await assignInstructor(classOfferingId, selectedInstructorId);

      setSelectedInstructorId("");
      onSuccess();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to assign instructor",
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (assignmentId: string) => {
    try {
      setLoading(true);
      setError(null);
      await removeInstructor(assignmentId);
      onSuccess();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to remove instructor",
      );
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Filter out already assigned instructors from dropdown
  const filteredInstructors = availableInstructors.filter(
    (inst) =>
      !currentInstructors.some((current) => current.staffUserId === inst.id),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Instructors</DialogTitle>
          <p className="text-sm text-muted-foreground">{levelName}</p>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          {/* Current Instructors */}
          <div>
            <Label className="text-sm font-medium">Current Instructors</Label>
            {currentInstructors.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-2">
                No instructors assigned
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {currentInstructors.map((instructor) => (
                  <div
                    key={instructor.id}
                    className="flex items-center justify-between p-2 border rounded-md"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {instructor.staffName}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemove(instructor.id)}
                      disabled={loading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add New Instructor */}
          <div className="space-y-2">
            <Label htmlFor="instructor-select">Add Instructor</Label>
            {loadingInstructors ? (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : (
              <Select
                value={selectedInstructorId}
                onValueChange={setSelectedInstructorId}
              >
                <SelectTrigger id="instructor-select">
                  <SelectValue placeholder="Select an instructor" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {filteredInstructors.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">
                      No available instructors
                    </div>
                  ) : (
                    filteredInstructors.map((instructor) => (
                      <SelectItem key={instructor.id} value={instructor.id}>
                        {instructor.firstName} {instructor.lastName}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedInstructorId || loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign Instructor
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
