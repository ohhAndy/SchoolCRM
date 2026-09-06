"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RemarksDialogProps {
  title: string;
  initialRemarks: string | null;
  trigger?: React.ReactNode;
  triggerLabel?: string;
  onSave: (remarks: string) => Promise<void>;
}

export default function RemarksDialog({
  title,
  initialRemarks,
  trigger,
  triggerLabel,
  onSave,
}: RemarksDialogProps) {
  const [open, setOpen] = useState(false);
  const [remarks, setRemarks] = useState(initialRemarks || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(remarks);
      setOpen(false);
    } catch (error) {
      console.error("Failed to save remarks:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset to initial value when opening
      setRemarks(initialRemarks || "");
    }
    setOpen(newOpen);
  };

  const hasChanges = remarks !== (initialRemarks || "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ? (
          trigger
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs px-2 py-1 h-auto rounded-none transition-colors bg-gray-50 hover:bg-gray-200"
          >
            {triggerLabel || "Open"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {`Add notes or remarks for this student. These notes are
            student-wide and visible to all staff members across all terms.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              placeholder="Enter any notes about this student..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {remarks.length} characters
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
