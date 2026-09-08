import { Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { getCurrentUser } from "@/lib/auth/user";
import { getAllTerms } from "@/lib/api/server/schedule";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { redirect } from "next/navigation";
import { Metadata } from "next";
import { todayInToronto } from "@/lib/date";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrialRequestsQueue } from "@/components/dashboard/TrialRequestsQueue";
import { TrialRequestsBadge } from "@/components/layout/TrialRequestsBadge";

export const metadata: Metadata = {
  title: "Dashboard | Swan Swim Management",
};

export const dynamic = "force-dynamic";

// Define types for page props
type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const terms = await getAllTerms();
  const resolvedSearchParams = await searchParams;
  const requestedTermId = resolvedSearchParams?.termId as string | undefined;

  const now = new Date();

  // Sort terms by startDate descending (newest first)
  const sortedTerms = [...terms].sort((a, b) => {
    const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
    const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
    return dateB - dateA;
  });

  // 1. Determine which term to show
  let termToUse = requestedTermId
    ? sortedTerms.find((t) => t.id === requestedTermId)
    : undefined;

  // 2. Fallback if no requested term or not found: Current term -> Newest term
  if (!termToUse) {
    const currentTerm = sortedTerms.find((t) => {
      if (!t.startDate || !t.endDate) return false;
      const start = new Date(t.startDate);
      const end = new Date(t.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    });

    // If currently in a break between terms, pick the most recent term that has started
    const mostRecentActiveOrPastTerm = sortedTerms.find((t) => {
      if (!t.startDate) return false;
      const start = new Date(t.startDate);
      start.setHours(0, 0, 0, 0);
      return now >= start;
    });

    termToUse = currentTerm || mostRecentActiveOrPastTerm || sortedTerms[0];
  }

  // 3. Find next and previous terms
  const currentIndex = sortedTerms.findIndex((t) => t.id === termToUse?.id);
  const nextTerm = currentIndex > 0 ? sortedTerms[currentIndex - 1] : null; // Newer term (lower index)
  const prevTerm =
    currentIndex < sortedTerms.length - 1
      ? sortedTerms[currentIndex + 1]
      : null; // Older term (higher index)

  const today = todayInToronto();
  // TODO: Include 'manager' role when trial request review workflow is rolled out to branch managers
  const isAdmin = ["super_admin", "admin"].includes(user?.role || "");
  const requestedTab = resolvedSearchParams?.tab as string | undefined;
  const initialTab = isAdmin && requestedTab === "requests" ? "requests" : "stats";

  const statsSectionContent = (
    <>
      <p className="text-center">Here’s your dashboard overview.</p>

      {termToUse &&
        ["super_admin", "admin", "manager"].includes(user?.role || "") && (
          <StatsOverview
            termId={termToUse.id}
            termName={termToUse.name}
            prevTermId={prevTerm?.id}
            nextTermId={nextTerm?.id}
          />
        )}

      {termToUse && (
        <div className="pt-4 border-t">
          <Button
            asChild
            variant="outline"
            className="w-full bg-[#1c82c5] hover:bg-[#156a9e] text-white"
          >
            <Link href={`/schedule/date/${today}`}>
              <Calendar className="mr-2 h-4 w-4" /> View Today&apos;s Schedule
            </Link>
          </Button>
          <PermissionGate
            allowedRoles={["super_admin", "admin", "manager"]}
            currentRole={user.role}
          >
            <Button
              asChild
              variant="outline"
              className="w-full bg-[#1c82c5] hover:bg-[#156a9e] text-white mt-2"
            >
              <Link href={`/term/${termToUse.id}/availability`}>
                View Availability
              </Link>
            </Button>
          </PermissionGate>

          <PermissionGate
            allowedRoles={["super_admin", "admin", "manager", "supervisor"]}
            currentRole={user.role}
          >
            <Button
              asChild
              variant="outline"
              className="w-full bg-[#1c82c5] hover:bg-[#156a9e] text-white mt-2"
            >
              <Link href="/tasks">View Tasks</Link>
            </Button>
          </PermissionGate>
        </div>
      )}
    </>
  );

  return (
    <div className="flex flex-col min-h-screen items-center justify-start p-4 pt-16">
      <Card className="w-full max-w-6xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold text-[#1c82c5]">
            {user ? `Welcome, ${user.fullName}!` : "Loading..."}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-gray-600 mt-4 space-y-4">
          {isAdmin ? (
            <Tabs defaultValue={initialTab} className="w-full">
              <div className="flex justify-center mb-6">
                <TabsList className="grid grid-cols-2 w-full max-w-sm">
                  <TabsTrigger value="stats" className="text-sm font-semibold">
                    Statistics
                  </TabsTrigger>
                  <TabsTrigger
                    value="requests"
                    className="text-sm font-semibold flex items-center justify-center gap-1.5"
                  >
                    <span>Trial Requests</span>
                    <TrialRequestsBadge />
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="stats" className="space-y-4">
                {statsSectionContent}
              </TabsContent>

              <TabsContent value="requests" className="space-y-4 pt-2">
                <TrialRequestsQueue />
              </TabsContent>
            </Tabs>
          ) : (
            statsSectionContent
          )}
        </CardContent>
      </Card>
    </div>
  );
}
