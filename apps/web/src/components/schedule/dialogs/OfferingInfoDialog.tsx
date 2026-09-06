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

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Edit } from "lucide-react";

interface OfferingDialogProps {
  initialTitle: string;
  triggerLabel: string;
  onSave: (title: string) => Promise<void>;
}

export default function OfferingDialog({
  initialTitle,
  triggerLabel,
  onSave,
}: OfferingDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(title);
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
      setTitle(initialTitle || "");
    }
    setOpen(newOpen);
  };

  const hasChanges = title !== (initialTitle || "");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {triggerLabel}
          <Edit></Edit>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Title</DialogTitle>
          <DialogDescription>{`Include lane number!`}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="Enter new title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="resize-none"
            />
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
