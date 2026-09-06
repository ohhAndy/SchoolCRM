import InstructorForm from "../InstructorForm";
import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "New Instructor | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function NewInstructorPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "manager")) {
    redirect("/forbidden");
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Add New Instructor</h1>
      <InstructorForm />
    </div>
  );
}
