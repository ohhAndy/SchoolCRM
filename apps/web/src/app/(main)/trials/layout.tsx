import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: "Trials | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function TrialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "manager")) {
    redirect("/forbidden");
  }

  return children;
}
