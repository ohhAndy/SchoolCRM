"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getTrialRequests,
  updateTrialRequestStatus,
  deleteTrialRequest,
  type TrialRequestItem,
  type TrialRequestsResponse,
} from "@/lib/api/client/trial-requests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Search,
  Phone,
  Mail,
  Calendar,
  User,
  Users,
  Pencil,
  MoreVertical,
  CalendarPlus,
  Trash2,
  RotateCcw,
  Sparkles,
  MessageSquare,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { AssignSessionDialog } from "./AssignSessionDialog";
import { EditRequestNotesDialog } from "./EditRequestNotesDialog";

export function TrialRequestsQueue() {
  const [data, setData] = useState<TrialRequestsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusTab, setStatusTab] = useState<string>("pending");
  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  // Modals state
  const [selectedRequestForBooking, setSelectedRequestForBooking] =
    useState<TrialRequestItem | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  const [selectedRequestForNotes, setSelectedRequestForNotes] =
    useState<TrialRequestItem | null>(null);
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getTrialRequests({
        status: statusTab,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });
      setData(res);
    } catch (err) {
      console.error("Failed to load trial requests:", err);
      toast.error("Failed to load trial requests");
    } finally {
      setLoading(false);
    }
  }, [statusTab, search, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStatusChange = async (
    id: string,
    newStatus: "pending" | "approved" | "declined" | "spam",
  ) => {
    try {
      await updateTrialRequestStatus(id, newStatus);
      toast.success(`Request marked as ${newStatus}`);
      loadData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  };

  const handleDelete = async (id: string, childName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the trial request for ${childName}? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await deleteTrialRequest(id);
      toast.success("Request deleted successfully");
      loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  };

  const counts = data?.counts || {
    all: 0,
    pending: 0,
    approved: 0,
    declined: 0,
    spam: 0,
  };

  // Helper to parse notes and extract tags, parent notes, and staff notes
  const parseNotes = (rawNotes: string | null) => {
    if (!rawNotes) {
      return { tags: [], parentNote: null, staffNote: null };
    }

    const tagRegex = /\[(.*?)\]/g;
    const allTags: string[] = [];
    let match;

    while ((match = tagRegex.exec(rawNotes)) !== null) {
      allTags.push(match[1]);
    }

    // Look for explicit [Parent Notes: ...] or [Parent Note: ...] tag
    const parentNoteTag = allTags.find((t) =>
      t.toLowerCase().startsWith("parent note"),
    );
    const parentNote = parentNoteTag
      ? parentNoteTag.replace(/^parent note[s]?:\s*/i, "").trim()
      : null;

    // Filter out parent note tag from badges
    const displayTags = allTags.filter(
      (t) => !t.toLowerCase().startsWith("parent note"),
    );

    // Text outside of bracketed tags is internal staff notes
    const staffNote = rawNotes.replace(tagRegex, "").trim() || null;

    return {
      tags: displayTags,
      parentNote,
      staffNote,
    };
  };

  return (
    <div className="space-y-6">
      {/* ============ KPI STATS CARDS ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Pending Review
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {counts.pending}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Requires coordinator follow-up
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approved / Booked
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {counts.approved}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scheduled into class sessions
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Declined
            </CardTitle>
            <XCircle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {counts.declined}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              No matching slots or parent withdrew
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400 shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Inquiries
            </CardTitle>
            <Sparkles className="w-4 h-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">
              {counts.all}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Total web trial submissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ============ SEARCH & FILTER CONTROLS ============ */}
      <div className="space-y-3">
        {/* Search Bar & Refresh Button (Above Tabs) */}
        <div className="flex items-center gap-2 max-w-md">
          <div className="relative flex-1 flex items-center">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search parent, phone, child..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={loadData}
            title="Refresh list"
            className="h-9 w-9 shrink-0"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {/* Horizontal Status Pill Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200/80 w-fit">
          {[
            {
              id: "pending",
              label: "Pending",
              count: counts.pending,
              badgeColor: "bg-amber-500 text-white",
            },
            {
              id: "approved",
              label: "Approved",
              count: counts.approved,
              badgeColor: "bg-green-600 text-white",
            },
            {
              id: "declined",
              label: "Declined",
              count: counts.declined,
              badgeColor: "bg-red-500 text-white",
            },
            {
              id: "spam",
              label: "Spam",
              count: counts.spam,
              badgeColor: "bg-slate-500 text-white",
            },
            {
              id: "all",
              label: "All Requests",
              count: counts.all,
              badgeColor: "bg-slate-700 text-white",
            },
          ].map((tab) => {
            const isActive = statusTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusTab(tab.id);
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive
                        ? tab.badgeColor
                        : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ============ REQUESTS QUEUE LIST ============ */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
      ) : !data || data.items.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed space-y-3 bg-muted/20">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <p className="text-base font-bold text-slate-800">
            No trial requests found
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {statusTab === "pending"
              ? "All caught up! There are no unreviewed trial requests at this time."
              : `No trial requests match the current ${statusTab} filter.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {data.items.map((req) => {
            const { tags, parentNote, staffNote } = parseNotes(req.notes);

            // Check if part of sibling group
            const isSibling = tags.some((t) =>
              t.toLowerCase().includes("sibling trial"),
            );
            const timingPref = tags.find((t) =>
              t.toLowerCase().includes("timing preference"),
            );
            const skillLevelTag = tags.find((t) =>
              t.toLowerCase().includes("skill level"),
            );
            const timePrefTag = tags.find((t) =>
              t.toLowerCase().includes("time preference"),
            );
            const isAdult = tags.some((t) =>
              t.toLowerCase().includes("adult trial"),
            );
            const goalTag = tags.find((t) =>
              t.toLowerCase().startsWith("goal"),
            );

            return (
              <Card
                key={req.id}
                className="overflow-hidden border border-slate-200 hover:border-slate-300 transition-all shadow-xs"
              >
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                  {/* Row 1: Header (Child, Status, Submission Date, Actions) */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base sm:text-lg font-bold text-slate-900">
                        {req.childName}
                      </span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        Age {req.childAge}
                      </span>

                      {/* Location Badge */}
                      {req.location && (
                        <Badge variant="outline" className="text-xs font-medium">
                          {req.location.name}
                        </Badge>
                      )}

                      {/* Status Badge */}
                      <Badge
                        variant={
                          req.status === "approved"
                            ? "default"
                            : req.status === "pending"
                              ? "outline"
                              : req.status === "declined"
                                ? "destructive"
                                : "secondary"
                        }
                        className={
                          req.status === "approved"
                            ? "bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
                            : req.status === "pending"
                              ? "bg-amber-100 text-amber-900 border-amber-300 text-xs font-semibold"
                              : "text-xs font-semibold"
                        }
                      >
                        {req.status === "pending" ? "● Pending Review" : req.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        Submitted{" "}
                        {new Date(req.submittedAt).toLocaleDateString("en-CA", {
                          timeZone: "UTC",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>

                      {/* Action dropdown */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRequestForBooking(req);
                              setIsBookingOpen(true);
                            }}
                          >
                            <CalendarPlus className="h-4 w-4 mr-2 text-blue-600" />
                            Book / Assign Session
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedRequestForNotes(req);
                              setIsNotesOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Notes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(req.id, "approved")}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Mark as Approved
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(req.id, "declined")}
                          >
                            <XCircle className="h-4 w-4 mr-2 text-red-600" />
                            Mark as Declined
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleStatusChange(req.id, "spam")}
                          >
                            <AlertOctagon className="h-4 w-4 mr-2 text-slate-500" />
                            Mark as Spam
                          </DropdownMenuItem>
                          {req.status !== "pending" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(req.id, "pending")}
                            >
                              <Clock className="h-4 w-4 mr-2 text-amber-500" />
                              Revert to Pending
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => handleDelete(req.id, req.childName)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Request
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Row 2: Parent Contact Info */}
                  <div className="flex flex-wrap items-center gap-2.5 py-1 text-xs">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100/80 text-slate-800 font-medium border border-slate-200/60">
                      <User size={13} className="text-slate-500 shrink-0" />
                      <span className="font-semibold text-slate-900">{req.parentName}</span>
                    </div>

                    <a
                      href={`tel:${req.parentPhone}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50/80 hover:bg-blue-100 text-blue-700 font-mono font-medium border border-blue-200/70 transition-colors"
                      title="Call parent"
                    >
                      <Phone size={13} className="text-blue-500 shrink-0" />
                      <span>{req.parentPhone}</span>
                    </a>

                    {req.parentEmail && (
                      <a
                        href={`mailto:${req.parentEmail}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60 transition-colors"
                        title="Email parent"
                      >
                        <Mail size={13} className="text-slate-400 shrink-0" />
                        <span>{req.parentEmail}</span>
                      </a>
                    )}
                  </div>

                  {/* Row 3: Metadata Badges (Sibling group, Skill level, Time Preference) */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {isAdult && (
                      <Badge
                        variant="secondary"
                        className="bg-indigo-50 text-indigo-800 border-indigo-200 text-xs gap-1 py-0.5"
                      >
                        Adult Swimmer
                      </Badge>
                    )}

                    {goalTag && (
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 text-xs py-0.5"
                      >
                        {goalTag
                          .replace(/^goal:\s*/i, "Goal: ")
                          .trim()}
                      </Badge>
                    )}

                    {isSibling && (
                      <Badge
                        variant="secondary"
                        className="bg-purple-100 text-purple-800 border-purple-200 text-xs gap-1 py-0.5"
                      >
                        <Users size={12} />
                        Sibling Trial
                        {timingPref
                          ? ` • ${timingPref
                              .replace(/^timing preference:\s*/i, "")
                              .replace(/\s*\(.*\)/, "")
                              .replace(/simultaneous/i, "Same Time")
                              .trim()}`
                          : ""}
                      </Badge>
                    )}

                    {timePrefTag && (
                      <Badge
                        variant="secondary"
                        className="bg-blue-50 text-blue-800 border-blue-200 text-xs gap-1 py-0.5"
                      >
                        <Clock size={12} />
                        {timePrefTag
                          .replace(/^time preference:\s*/i, "")
                          .replace(/(?:Weekday|Weekend)?\s*(?:Early|Evening|Morning|Afternoon)?\s*\(([^)]*\d+:\d+[^)]*)\)/gi, "$1")
                          .trim()}
                      </Badge>
                    )}

                    {skillLevelTag && (
                      <Badge
                        variant="outline"
                        className="bg-slate-50 text-slate-700 text-xs py-0.5"
                      >
                        {skillLevelTag
                          .replace(/^skill level:\s*/i, "")
                          .replace(/\s*\([^)]*\)/g, "")
                          .trim()}
                      </Badge>
                    )}
                  </div>

                  {/* Row 4: Requested Preferred Dates */}
                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1">
                      <Calendar size={13} className="text-blue-500" />
                      Requested Dates:
                    </span>
                    {req.preferredDates && req.preferredDates.length > 0 ? (
                      req.preferredDates.map((d) => (
                        <span
                          key={d}
                          className="px-2.5 py-1 rounded-md bg-blue-50/80 text-blue-800 border border-blue-200 font-semibold"
                        >
                          {d}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground italic">
                        No dates specified
                      </span>
                    )}
                  </div>

                  {/* Row 5: Notes & Follow-up History */}
                  {(parentNote || staffNote || req.reviewedByUser) && (
                    <div className="pt-2 border-t border-slate-100 space-y-2 text-xs">
                      {/* Parent Note (From Web Form) */}
                      {parentNote && (
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
                          <span className="font-semibold text-slate-600 flex items-center gap-1.5 mb-1">
                            <MessageSquare size={13} className="text-slate-400 shrink-0" />
                            Parent Notes (Website Submission):
                          </span>
                          <p className="italic text-slate-800 leading-relaxed whitespace-pre-line">&ldquo;{parentNote}&rdquo;</p>
                        </div>
                      )}

                      {/* Staff Internal Notes & Follow-up */}
                      <div className="bg-blue-50/50 border border-blue-200/60 rounded-lg p-2.5">
                        <span className="font-semibold text-blue-900 flex items-center gap-1.5 mb-1">
                          <FileText size={13} className="text-blue-600 shrink-0" />
                          Staff Notes & Follow-up:
                        </span>
                        {staffNote ? (
                          <p className="text-slate-700 whitespace-pre-line leading-relaxed">
                            {staffNote}
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">
                            No internal follow-up notes logged yet.
                          </p>
                        )}
                      </div>

                      {/* Reviewer Stamp */}
                      {req.reviewedByUser && (
                        <div className="text-[11px] text-muted-foreground pt-0.5 text-right">
                          Reviewed by{" "}
                          <strong>{req.reviewedByUser.fullName}</strong>
                          {req.reviewedAt && (
                            <>
                              {" "}
                              on{" "}
                              {new Date(req.reviewedAt).toLocaleDateString(
                                "en-CA",
                                {
                                  timeZone: "UTC",
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Row 6: Quick Action Button */}
                  <div className="pt-2 flex items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedRequestForNotes(req);
                        setIsNotesOpen(true);
                      }}
                      className="text-xs h-8"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Notes
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedRequestForBooking(req);
                        setIsBookingOpen(true);
                      }}
                      className="bg-[#1c82c5] hover:bg-[#156a9e] text-white text-xs h-8"
                    >
                      <CalendarPlus className="w-3.5 h-3.5 mr-1" />
                      Book / Assign Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ============ PAGINATION ============ */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t text-xs text-muted-foreground">
          <span>
            Page {data.pagination.page} of {data.pagination.totalPages} (
            {data.pagination.total} total)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ============ DIALOGS ============ */}
      <AssignSessionDialog
        open={isBookingOpen}
        onOpenChange={setIsBookingOpen}
        request={selectedRequestForBooking}
        onSuccess={loadData}
      />

      <EditRequestNotesDialog
        open={isNotesOpen}
        onOpenChange={setIsNotesOpen}
        request={selectedRequestForNotes}
        onSuccess={loadData}
      />
    </div>
  );
}
