"use client";

import { enrollStudentWithSkips } from "@/lib/api/client/schedule";
import { searchStudents, StudentLite } from "@/lib/api/client/students";
import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HOLIDAYS } from "@/lib/schedule/slots";
import { calcAge } from "@/lib/utils/student-helpers";

interface EnrollStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  offeringId: string;
  isoDates: string[];
  onSuccess: () => void;
}

export function EnrollStudentDialog({
  open,
  onOpenChange,
  offeringId,
  isoDates,
  onSuccess,
}: EnrollStudentDialogProps) {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [results, setResults] = useState<StudentLite[]>([]);
  const [picked, setPicked] = useState<StudentLite | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  const [classRatio, setClassRatio] = useState<string>("3:1");

  useEffect(() => {
    if (open) {
      // Filter out holidays by default
      const enabledDates = isoDates.filter(
        (d) => !HOLIDAYS.includes(d.slice(0, 10)),
      );
      setSelectedDates(new Set(enabledDates));
      setQ("");
      setResults([]);
      setPicked(null);
      setErr(null);
    }
  }, [open, isoDates]);

  const doSearch = useCallback(async () => {
    try {
      setErr(null);
      const res = await searchStudents({ query: q, page: 1, pageSize: 20 });
      setResults(res.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search Failed");
    }
  }, [q]);

  const submit = useCallback(async () => {
    if (!picked) return;

    try {
      setLoading(true);
      setErr(null);

      const skippedDates = isoDates.filter((date) => !selectedDates.has(date));

      await enrollStudentWithSkips({
        studentId: picked.id,
        offeringId,
        skippedDates: skippedDates.map((date) => date.slice(0, 10)),
        classRatio,
      });

      onSuccess();
      onOpenChange(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Enrollment failed");
    } finally {
      setLoading(false);
    }
  }, [picked, isoDates, selectedDates, offeringId, classRatio, onSuccess, onOpenChange]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();

        if (document.activeElement?.tagName === "INPUT" && q.trim()) {
          doSearch();
        } else if (picked && !loading) {
          submit();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, q, picked, loading, doSearch, submit]);

  const toggleDate = (date: string) => {
    const newSelected = new Set(selectedDates);
    if (newSelected.has(date)) {
      newSelected.delete(date);
    } else {
      newSelected.add(date);
    }
    setSelectedDates(newSelected);
  };

  const toggleAll = () => {
    if (selectedDates.size === isoDates.length) {
      setSelectedDates(new Set());
    } else {
      // Select all non-holiday dates
      const enabledDates = isoDates.filter(
        (d) => !HOLIDAYS.includes(d.slice(0, 10)),
      );
      setSelectedDates(new Set(enabledDates));
    }
  };

  const selectedCount = selectedDates.size;
  const skippedHolidaysCount = isoDates.filter((d) =>
    HOLIDAYS.includes(d.slice(0, 10)),
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Enroll Student</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {/* Student Search */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Search student..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <Button type="button" variant="outline" onClick={doSearch}>
                Search
              </Button>
            </div>

            <div className="max-h-32 overflow-auto rounded border">
              {results.map((r) => (
                <button
                  key={r.id}
                  className={`flex w-full items-center justify-between border-b px-3 py-2 text-left hover:bg-slate-50 ${
                    picked?.id === r.id ? "bg-slate-100" : ""
                  }`}
                  onClick={() => setPicked(r)}
                >
                  <span className="font-medium">{`${r.firstName} ${r.lastName}`}</span>
                  <span className="text-sm text-slate-500">
                    {r.level ?? ""} - {r.birthdate ? calcAge(r.birthdate) : ""}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="classRatio">Class Ratio</Label>
            <Select value={classRatio} onValueChange={setClassRatio}>
              <SelectTrigger id="classRatio">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3:1">
                  <div className="flex items-center justify-between w-full">
                    <span>3:1 (Group)</span>
                    <span className="text-sm text-muted-foreground ml-4">
                      &nbsp; - $50/class
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="2:1">
                  <div className="flex items-center justify-between w-full">
                    <span>2:1 (Semi-Private) </span>
                    <span className="text-sm text-muted-foreground ml-4">
                      &nbsp; - $73/class
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="1:1">
                  <div className="flex items-center justify-between w-full">
                    <span>1:1 (Private)</span>
                    <span className="text-sm text-muted-foreground ml-4">
                      &nbsp; - $140/class
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="other">
                  <div className="flex items-center justify-between w-full">
                    <span>Other</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">
                Select class dates ({selectedCount}/{isoDates.length})
              </h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleAll}
              >
                {selectedDates.size === isoDates.length
                  ? "Unselect All"
                  : "Select All"}
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {isoDates.map((date, index) => {
                const shortDate = date.slice(5, 10);
                const isSelected = selectedDates.has(date);

                return (
                  <div key={date} className="flex items-center space-x-2">
                    <Checkbox
                      id={`date-${index}`}
                      checked={isSelected}
                      onCheckedChange={() => toggleDate(date)}
                    />
                    <label
                      htmlFor={`date-${index}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {shortDate}
                    </label>
                  </div>
                );
              })}
            </div>

            {selectedCount < isoDates.length && (
              <div className="space-y-1">
                <p className="text-xs text-slate-600">
                  Unchecked dates will be marked as enrollment skips
                </p>
                {skippedHolidaysCount > 0 && (
                  <p className="text-xs text-amber-600 font-medium">
                    Note: {skippedHolidaysCount} date
                    {skippedHolidaysCount > 1 ? "s" : ""} falling on holidays
                    were automatically unchecked.
                  </p>
                )}
              </div>
            )}
          </div>

          {err && <p className="text-sm text-red-600">{err}</p>}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/students/new")}
          >
            + Create New Student
          </Button>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={!picked || loading || selectedCount === 0}
            >
              {loading ? "Enrolling..." : `Enroll for ${selectedCount} classes`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
