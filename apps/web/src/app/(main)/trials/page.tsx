"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getUpcomingTrials,
  getPastTrials,
  getTrialStats,
  TrialStats,
} from "@/lib/api/client/trial";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, XCircle, Clock, Percent, Pencil } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditNotesDialog } from "./EditNotesDialog";

interface UpcomingTrial {
  id: string;
  childName: string;
  childAge: number;
  parentPhone: string;
  notes: string | null;
  status: string;
  classSession: {
    date: string;
    offering: {
      id: string;
      title: string;
      termId: string;
      weekday: number;
      startTime: string;
      endTime: string;
    };
  };
}

export default function TrialsPage() {
  const [stats, setStats] = useState<TrialStats | null>(null);
  const [upcoming, setUpcoming] = useState<UpcomingTrial[]>([]);
  const [past, setPast] = useState<UpcomingTrial[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrialForNotes, setSelectedTrialForNotes] = useState<{
    id: string;
    childName: string;
    notes: string | null;
  } | null>(null);
  const [isNotesDialogOpen, setIsNotesDialogOpen] = useState(false);

  const loadData = async () => {
    try {
      const [fetchedStats, fetchedUpcoming, fetchedPast] = await Promise.all([
        getTrialStats(),
        getUpcomingTrials(),
        getPastTrials(),
      ]);
      setStats(fetchedStats);
      setUpcoming(fetchedUpcoming);
      setPast(fetchedPast);
    } catch (error) {
      console.error("Failed to load trials data:", error);
    }
  };

  useEffect(() => {
    async function init() {
      setLoading(true);
      await loadData();
      setLoading(false);
    }
    init();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <Skeleton className="h-10 w-48 mb-8" />
        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  function TrialTable({ trials }: { trials: UpcomingTrial[] }) {
    if (trials.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No trials found.
        </div>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Child Name</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Class Level</TableHead>
            <TableHead>Parent Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trials.map((trial) => (
            <TableRow key={trial.id}>
              <TableCell className="font-medium">
                {new Date(trial.classSession.date).toLocaleDateString("en-CA", {
                  timeZone: "UTC",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell>{trial.childName}</TableCell>
              <TableCell>{trial.childAge}</TableCell>
              <TableCell>
                <Link
                  href={`/term/${trial.classSession.offering.termId}/schedule/weekday/${trial.classSession.offering.weekday}/slot/${trial.classSession.offering.startTime}-${trial.classSession.offering.endTime}?highlight=${trial.classSession.offering.id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {trial.classSession.offering.title}
                </Link>
              </TableCell>
              <TableCell>{trial.parentPhone}</TableCell>
              <TableCell>
                <Badge
                  variant={
                    trial.status === "scheduled"
                      ? "outline"
                      : trial.status === "converted"
                      ? "default"
                      : trial.status === "attended"
                      ? "secondary" // blue-ish usually
                      : "destructive"
                  }
                  className={
                    trial.status === "converted"
                      ? "bg-green-600 hover:bg-green-700"
                      : trial.status === "attended"
                      ? "bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200"
                      : ""
                  }
                >
                  {trial.status}
                </Badge>
              </TableCell>
              <TableCell className="max-w-[200px]">
                <div className="flex items-center justify-between group gap-2">
                  <span className="truncate" title={trial.notes || ""}>
                    {trial.notes || "-"}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedTrialForNotes({
                        id: trial.id,
                        childName: trial.childName,
                        notes: trial.notes,
                      });
                      setIsNotesDialogOpen(true);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-muted rounded transition-opacity"
                    title="Edit Notes"
                  >
                    <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trials Management</h1>
          <p className="text-muted-foreground">
            Track upcoming trials and conversion performance.
          </p>
        </div>
        {/* TODO: Enable manager access to trial requests queue when role permissions are expanded to managers */}
        <Button
          asChild
          variant="outline"
          className="border-blue-200 text-blue-700 hover:bg-blue-50 self-start sm:self-auto"
        >
          <Link href="/dashboard?tab=requests">
            View Incoming Trial Requests
          </Link>
        </Button>
      </div>

      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
              <Percent className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.conversionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Of attended trials converted
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Converted</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.converted}</div>
              <p className="text-xs text-muted-foreground">
                Total converted students
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Not Converted
              </CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notConverted}</div>
              <p className="text-xs text-muted-foreground">
                Attended/No-Show/Cancelled
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Scheduled
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.scheduled}</div>
              <p className="text-xs text-muted-foreground">
                Future trials booked
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="upcoming" className="w-full">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                <TabsTrigger value="past">Past Trials</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="upcoming">
              <TrialTable trials={upcoming} />
            </TabsContent>
            <TabsContent value="past">
              <TrialTable trials={past} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <EditNotesDialog
        open={isNotesDialogOpen}
        onOpenChange={setIsNotesDialogOpen}
        trial={selectedTrialForNotes}
        onSuccess={loadData}
      />
    </div>
  );
}
