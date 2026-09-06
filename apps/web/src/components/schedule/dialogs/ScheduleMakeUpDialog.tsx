"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { searchStudents, StudentLite } from "@/lib/api/client/students";
import { scheduleMakeUp } from "@/lib/api/client/schedule";
import { getStudentTokenBalance } from "@/lib/api/client/tokens";
import type { RosterResponse, TokenBalance } from "@school/shared-types";
import { calcAge } from "@/lib/utils/student-helpers";
import { AlertCircle, AlertTriangle, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScheduleMakeupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate: string | null; // ISO date string like "2024-09-15T04:00:00.000Z"
  rosters: RosterResponse[];
  onSuccess: () => void;
}

export function ScheduleMakeupDialog({
  open,
  onOpenChange,
  selectedDate,
  rosters,
  onSuccess,
}: ScheduleMakeupDialogProps) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<StudentLite[]>([]);
  const [picked, setPicked] = useState<StudentLite | null>(null);
  const [classRatio, setClassRatio] = useState("3:1");
  const [notes, setNotes] = useState("");
  const [tokenBalance, setTokenBalance] = useState<TokenBalance | null>(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [overridePrompt, setOverridePrompt] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Find the session and offering for the selected date
  const sessionForDate = rosters.find(
    (r) => r.session.date.slice(0, 10) + "T04:00:00.000Z" === selectedDate,
  );

  useEffect(() => {
    if (open) {
      setQ("");
      setResults([]);
      setPicked(null);
      setClassRatio("3:1");
      setNotes("");
      setTokenBalance(null);
      setOverridePrompt(false);
      setErr(null);
    }
  }, [open]);

  // Fetch token balance when a student is selected
  useEffect(() => {
    if (!picked) {
      setTokenBalance(null);
      setOverridePrompt(false);
      return;
    }

    let isMounted = true;
    setLoadingToken(true);
    getStudentTokenBalance(picked.id)
      .then((balance) => {
        if (isMounted) {
          setTokenBalance(balance);
          if (balance.available === 0) {
            setOverridePrompt(true);
          }
        }
      })
      .catch((e) => {
        console.error("Failed to fetch token balance", e);
      })
      .finally(() => {
        if (isMounted) setLoadingToken(false);
      });

    return () => {
      isMounted = false;
    };
  }, [picked]);

  const doSearch = useCallback(async () => {
    try {
      setErr(null);
      const r = await searchStudents({ query: q });
      setResults(r.items);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Search failed");
    }
  }, [q]);

  const submit = useCallback(
    async (isExplicitOverride = false) => {
      if (!picked || !selectedDate) return;

      try {
        setLoading(true);
        setErr(null);

        if (!sessionForDate) {
          throw new Error("No session found for selected date");
        }

        const res = await scheduleMakeUp({
          studentId: picked.id,
          classSessionId: sessionForDate.session.id,
          classRatio,
          notes: notes.trim() || undefined,
          overrideAcknowledged: isExplicitOverride,
        });

        if (res.requiresOverride && !overridePrompt) {
          setOverridePrompt(true);
          if (res.tokenBalance) setTokenBalance(res.tokenBalance);
          setLoading(false);
          return;
        }

        onSuccess();
        onOpenChange(false);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Make-up scheduling failed");
      } finally {
        setLoading(false);
      }
    },
    [
      picked,
      selectedDate,
      sessionForDate,
      classRatio,
      notes,
      overridePrompt,
      onSuccess,
      onOpenChange,
    ],
  );

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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-CA", { timeZone: "UTC" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Schedule Make-up {selectedDate && `- ${formatDate(selectedDate)}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Search */}
          <div className="space-y-2">
            <Label>Student</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search student by name or code..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoFocus
              />
              <Button type="button" variant="outline" onClick={doSearch}>
                Search
              </Button>
            </div>

            {results.length > 0 && (
              <div className="max-h-40 overflow-auto rounded border">
                {results.map((r) => (
                  <button
                    key={r.id}
                    className={`flex w-full items-center justify-between border-b px-3 py-2 text-left hover:bg-slate-50 transition-colors ${
                      picked?.id === r.id ? "bg-slate-100 font-medium" : ""
                    }`}
                    onClick={() => {
                      setPicked(r);
                      setOverridePrompt(false);
                      setErr(null);
                    }}
                  >
                    <span className="font-medium">
                      {r.firstName} {r.lastName}
                    </span>
                    <span className="text-sm text-slate-500">
                      {r.level ?? ""}{" "}
                      {r.birthdate ? `(${calcAge(r.birthdate)}y)` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Student Token Summary */}
          {picked && (
            <div className="rounded-lg border p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-sm">
                  {picked.firstName} {picked.lastName}
                </span>
                {loadingToken ? (
                  <span className="text-xs text-muted-foreground animate-pulse">
                    Checking tokens...
                  </span>
                ) : tokenBalance ? (
                  <Badge
                    variant={
                      tokenBalance.available > 0 ? "outline" : "destructive"
                    }
                    className={
                      tokenBalance.available > 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    }
                  >
                    <Ticket className="h-3.5 w-3.5 mr-1" />
                    {tokenBalance.available} of {tokenBalance.total} tokens
                    available
                  </Badge>
                ) : null}
              </div>

              {tokenBalance && (
                <div className="text-xs text-muted-foreground flex gap-3">
                  <span>Used: {tokenBalance.consumed}</span>
                  {tokenBalance.expired > 0 && (
                    <span>Expired: {tokenBalance.expired}</span>
                  )}
                  {tokenBalance.overrideCount > 0 && (
                    <span className="text-amber-700 font-medium">
                      Overrides: {tokenBalance.overrideCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Override Warning Card */}
          {overridePrompt && (
            <div className="rounded-lg border border-amber-300 bg-amber-50/80 p-3 space-y-2">
              <div className="flex items-start gap-2 text-amber-800 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <div>
                  <p>No available makeup tokens</p>
                  <p className="text-xs text-amber-700 font-normal mt-0.5">
                    {picked?.firstName} has 0 available tokens for this
                    enrollment. Proceeding will book this as a{" "}
                    <strong>Staff Override</strong> and will be logged under
                    your name for accountability.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Class Ratio Selection */}
          <div className="space-y-2">
            <Label>Class Ratio</Label>
            <Select value={classRatio} onValueChange={setClassRatio}>
              <SelectTrigger>
                <SelectValue placeholder="Select ratio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3:1">3:1 (Group)</SelectItem>
                <SelectItem value="2:1">2:1 (Semi-Private)</SelectItem>
                <SelectItem value="1:1">1:1 (Private)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Optional Notes */}
          <div className="space-y-2">
            <Label>Staff Notes (Optional)</Label>
            <Input
              placeholder="Reason or special instructions..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {err && (
            <div className="flex items-center gap-1.5 text-sm text-red-600">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{err}</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {overridePrompt ? (
            <Button
              type="button"
              variant="warning"
              className="font-semibold shadow-sm"
              onClick={() => submit(true)}
              disabled={!picked || loading}
            >
              {loading ? "Overriding..." : "Confirm & Override Booking"}
            </Button>
          ) : (
            <Button onClick={() => submit(false)} disabled={!picked || loading}>
              {loading ? "Scheduling..." : "Schedule Make-up"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
