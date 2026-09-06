import { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";
import InventoryListClient from "./InventoryListClient";

export const metadata: Metadata = {
  title: "Inventory | Swan Swim Management",
};

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "admin")) {
    redirect("/forbidden");
  }

  return (
    <div className="h-full flex-1 flex-col space-y-8 p-8 flex">
      <InventoryListClient />
    </div>
  );
}
