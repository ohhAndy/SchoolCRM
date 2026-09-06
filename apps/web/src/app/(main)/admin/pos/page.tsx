import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";
import QuickSaleClient from "./QuickSaleClient";

export const metadata: Metadata = {
  title: "Point of Sale | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "admin")) {
    redirect("/forbidden");
  }

  return (
    <div className="h-[calc(100vh-64px)] overflow-hidden p-6 bg-slate-50/50">
      <QuickSaleClient />
    </div>
  );
}
