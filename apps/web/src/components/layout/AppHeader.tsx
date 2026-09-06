import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "../auth/UserMenu";
import { getCurrentUser } from "@/lib/auth/user";
import { PermissionGate } from "../auth/PermissionGate";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { LocationSwitcher } from "@/components/LocationSwitcher";
import { TrialRequestsBadge } from "./TrialRequestsBadge";

export async function AppHeader() {
  const user = await getCurrentUser();
  if (!user) return;

  return (
    <header className="sticky top-0 z-40 backdrop-blur dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/NoBGLogoSQ.svg"
            alt="Swan Swim School"
            width={32}
            height={32}
            priority
          />
          <span className="text-sm font-semibold hidden sm:block whitespace-nowrap">
            Swan Swim School Admin
          </span>
        </Link>
        {/* spacer */}
        <nav className="ml-auto flex items-center gap-3">
          <PermissionGate
            allowedRoles={["super_admin", "admin", "manager", "supervisor"]}
            currentRole={user.role}
          >
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium hover:text-blue-600 outline-none">
                Profiles <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href="/students">Students</Link>
                </DropdownMenuItem>
                <PermissionGate
                  allowedRoles={["super_admin", "admin", "manager"]}
                  currentRole={user.role}
                >
                  <DropdownMenuItem asChild>
                    <Link href="/guardians">Guardians</Link>
                  </DropdownMenuItem>
                </PermissionGate>
                <PermissionGate
                  allowedRoles={["super_admin", "admin", "manager"]}
                  currentRole={user.role}
                >
                  <DropdownMenuItem asChild>
                    <Link href="/admin/instructors">Instructors</Link>
                  </DropdownMenuItem>
                </PermissionGate>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
          <PermissionGate
            allowedRoles={["super_admin", "admin", "manager"]}
            currentRole={user.role}
          >
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium hover:text-blue-600 outline-none">
                Billing <ChevronDown className="ml-1 h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <PermissionGate
                  allowedRoles={["super_admin", "admin"]}
                  currentRole={user.role}
                >
                  <DropdownMenuItem asChild>
                    <Link href="/invoices">Invoices</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/payments">Payments</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/inventory">Inventory</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/pos">Point of Sale</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/admin/financials">Financial Insights</Link>
                  </DropdownMenuItem>
                </PermissionGate>
                <DropdownMenuItem asChild>
                  <Link href="/enrollments/uninvoiced">Uninvoiced</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
          <PermissionGate
            allowedRoles={["super_admin", "admin", "manager"]}
            currentRole={user.role}
          >
            <Link
              href="/term"
              className="text-sm font-medium hover:text-blue-600"
            >
              Schedule
            </Link>
          </PermissionGate>
          <PermissionGate
            allowedRoles={["super_admin", "admin", "manager"]}
            currentRole={user.role}
          >
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center text-sm font-medium hover:text-blue-600 outline-none gap-0.5">
                <span>Admin</span>
                {["super_admin", "admin"].includes(user.role) && (
                  <TrialRequestsBadge />
                )}
                <ChevronDown className="ml-1 h-3 w-3 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <PermissionGate
                  allowedRoles={["super_admin", "admin"]}
                  currentRole={user.role}
                >
                  <DropdownMenuItem asChild>
                    <Link
                      href="/dashboard?tab=requests"
                      className="flex items-center justify-between w-full cursor-pointer font-medium"
                    >
                      <span>Trial Requests</span>
                      <TrialRequestsBadge />
                    </Link>
                  </DropdownMenuItem>
                </PermissionGate>
                <DropdownMenuItem asChild>
                  <Link href="/trials" className="cursor-pointer">
                    Scheduled Trials
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/communications" className="cursor-pointer">
                    Communications
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </PermissionGate>
          <LocationSwitcher />
          <UserMenu user={user} />
        </nav>
      </div>
    </header>
  );
}
