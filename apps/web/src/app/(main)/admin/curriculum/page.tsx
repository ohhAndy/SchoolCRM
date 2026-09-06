import { CurriculumManager } from "@/components/curriculum/CurriculumManager";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Curriculum | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "admin")) {
    redirect("/forbidden");
  }

  return (
    <div className="container mx-auto py-6">
      <CurriculumManager />
    </div>
  );
}
