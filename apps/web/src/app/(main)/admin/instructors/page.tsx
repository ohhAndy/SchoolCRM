import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import InstructorsList from "./InstructorsList";
import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Instructors | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function InstructorsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "manager")) {
    redirect("/forbidden");
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Instructors</h1>
          <p className="text-muted-foreground">
            Manage your teaching staff profiles
          </p>
        </div>
        <Link href="/admin/instructors/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Instructor
          </Button>
        </Link>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <InstructorsList />
      </Suspense>
    </div>
  );
}
