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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { updateTrialRequestNotes } from "@/lib/api/client/trial-requests";

interface EditRequestNotesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: {
    id: string;
    childName: string;
    parentName: string;
    notes: string | null;
  } | null;
  onSuccess: () => void;
}

export function EditRequestNotesDialog({
  open,
  onOpenChange,
  request,
  onSuccess,
}: EditRequestNotesDialogProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (request) {
      setNotes(request.notes || "");
    }
  }, [request]);

  const handleInsertTimestamp = () => {
    const now = new Date();
    const datePart = now.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const timePart = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const stamp = `${datePart}, ${timePart} — `;

    setNotes((prev) => {
      const trimmed = prev.trimEnd();
      if (!trimmed) return stamp;
      return `${trimmed}\n${stamp}`;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    try {
      setLoading(true);
      await updateTrialRequestNotes(request.id, notes.trim() || null);
      toast.success("Notes updated successfully");
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update notes",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              Internal Notes — {request?.childName} ({request?.parentName})
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="request-notes" className="text-sm font-semibold text-slate-800">
                Lead Tags & Staff Notes
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleInsertTimestamp}
                className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 mr-1 text-blue-500" />
                + Add Timestamp
              </Button>
            </div>

            <Textarea
              id="request-notes"
              rows={12}
              placeholder="e.g.:&#10;[Skill Level: Beginner]&#10;[Time Preference: Thursdays 3:30–4:30 PM]&#10;[Parent Notes: Needs extra attention]&#10;&#10;Sep 5, 2:30 PM — Called parent: prefers Coach Sarah."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-y font-mono text-xs sm:text-sm leading-relaxed min-h-[260px]"
            />

            <div className="text-xs text-muted-foreground space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
              <p className="font-semibold text-slate-700">💡 Tips:</p>
              <p>• Lead tags like <code>[Skill Level: ...]</code> and <code>[Parent Notes: ...]</code> are editable inline.</p>
              <p>• Staff notes and timestamps below are saved as your follow-up activity history.</p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-[#1c82c5] hover:bg-[#156a9e] text-white">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Notes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
