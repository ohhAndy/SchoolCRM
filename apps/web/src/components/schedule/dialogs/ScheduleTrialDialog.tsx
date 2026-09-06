"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { createTrialBooking } from "@/lib/api/client/trial";

interface ScheduleTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null;
  sessionId: string | null;
  offeringTitle: string;
  onSuccess: () => void;
}

export function ScheduleTrialDialog({
  open,
  onOpenChange,
  selectedDate,
  sessionId,
  offeringTitle,
  onSuccess,
}: ScheduleTrialDialogProps) {
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [classRatio, setClassRatio] = useState("3:1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!sessionId || !childName.trim() || !childAge || !parentPhone.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    const age = parseInt(childAge);
    if (isNaN(age) || age < 0 || age > 100) {
      setError("Please enter a valid age (0-100)");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await createTrialBooking({
        classSessionId: sessionId,
        childName: childName.trim(),
        childAge: age,
        parentPhone: parentPhone.trim(),
        notes: notes.trim() || undefined,
        classRatio,
      });

      // Reset form
      setChildName("");
      setChildAge("");
      setParentPhone("");
      setNotes("");
      setClassRatio("3:1");

      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to schedule trial");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setChildName("");
    setChildAge("");
    setParentPhone("");
    setNotes("");
    setClassRatio("3:1");
    setError(null);
    onOpenChange(false);
  };

  const formattedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      })
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Schedule Trial Class</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {offeringTitle} - {formattedDate}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="childName">
              {`Name`} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="childName"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="John Smith"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="childAge">
              {`Age`} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="Age"
              type="number"
              min="0"
              max="18"
              value={childAge}
              onChange={(e) => setChildAge(e.target.value)}
              placeholder="5"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="parentPhone">
              Phone Number <span className="text-red-500">*</span>
            </Label>
            <Input
              id="parentPhone"
              type="tel"
              value={parentPhone}
              onChange={(e) => setParentPhone(e.target.value)}
              placeholder="555-123-4567"
              pattern="[0-9]{3}-[0-9]{3}-[0-9]{4}"
              disabled={loading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Class Ratio</Label>
            <Select value={classRatio} onValueChange={setClassRatio}>
              <SelectTrigger>
                <SelectValue placeholder="Select ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3:1">3:1</SelectItem>
                <SelectItem value="2:1">2:1</SelectItem>
                <SelectItem value="1:1">1:1</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional information..."
              disabled={loading}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Trial
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
