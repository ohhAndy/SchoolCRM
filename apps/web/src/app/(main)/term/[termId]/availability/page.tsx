import { Metadata } from "next";
import AvailabilityClientWrapper from "./AvailabilityClient";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Availability | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function AvailabilityPage({
  params,
}: {
  params: Promise<{ termId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "manager")) {
    redirect("/forbidden");
  }

  const resolvedParams = await params;
  const { termId } = resolvedParams;
  return (
    <>
      <div className="min-h-screen bg-background">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-muted-foreground">Loading availability...</div>
            </div>
          }
        >
          <AvailabilityClientWrapper termId={termId} />
        </Suspense>
      </div>
    </>
  );
}
