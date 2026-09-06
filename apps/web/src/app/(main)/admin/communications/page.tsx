import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";
import CommunicationsClient from "./CommunicationsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Communications | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function CommunicationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "manager")) {
    redirect("/forbidden");
  }

  return <CommunicationsClient />;
}
