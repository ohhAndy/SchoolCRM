import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Audit Logs | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function AuditLogsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.role !== "super_admin") {
    redirect("/forbidden");
  }

  return children;
}
