"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { RosterItem } from "./DailyClassRosterTypes";
import { hasMinRole, StaffRole } from "@/lib/auth/permissions";

export function AttendanceButton({
  item,
  loading,
  onUpdate,
  userRole,
}: {
  item: RosterItem;
  loading: boolean;
  onUpdate: (s: string) => void;
  userRole?: string;
}) {

  // Determine current status label/color
  let label = "Mark";
  let variant: "default" | "outline" | "ghost" | "secondary" | "destructive" =
    "outline";
  let className = "";

  if (item.isSkipped) {
    return (
      <Badge
        variant="secondary"
        className="bg-black text-white hover:bg-black/80"
      >
        Skipped
      </Badge>
    );
  }

  if (item.type === "student") {
    switch (item.status) {
      case "present":
        label = "Present";
        variant = "default";
        className = "bg-green-600 hover:bg-green-700";
        break;
      case "absent":
        label = "Absent";
        variant = "destructive";
        break;
      case "excused":
        label = "Excused";
        variant = "secondary";
        className = "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
        break;
      default:
        label = "Mark";
        variant = "outline";
        className = "text-muted-foreground border-dashed";
        break;
    }
  } else if (item.type === "makeup") {
    switch (item.status) {
      case "attended":
        label = "Attended";
        variant = "default";
        className = "bg-green-600 hover:bg-green-700";
        break;
      case "scheduled":
        label = "Scheduled";
        variant = "secondary";
        className = "bg-blue-100 text-blue-700";
        break;
      case "missed":
        label = "Missed";
        variant = "destructive";
        break;
      case "cancelled":
        label = "Cancelled";
        variant = "outline";
        className = "text-muted-foreground line-through";
        break;
      default:
        label = item.status || "Status";
        variant = "outline";
        break;
    }
  } else if (item.type === "trial") {
    switch (item.status) {
      case "attended":
        label = "Attended";
        variant = "default";
        className = "bg-green-600 hover:bg-green-700";
        break;
      case "scheduled":
        label = "Scheduled";
        variant = "secondary";
        className = "bg-purple-100 text-purple-700";
        break;
      case "noshow":
        label = "No Show";
        variant = "destructive";
        break;
      case "converted":
        label = "Converted";
        variant = "default";
        className = "bg-blue-600";
        break;
      case "cancelled":
        label = "Cancelled";
        variant = "outline";
        className = "text-muted-foreground line-through";
        break;
      default:
        label = item.status || "Status";
        variant = "outline";
        break;
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        disabled={
          loading ||
          item.status === "converted" ||
          (item.type === "student" &&
            item.enrollmentStatus !== "active" &&
            !hasMinRole(userRole as StaffRole, "admin"))
        }
      >
        <Button
          variant={variant}
          size="sm"
          className={cn(
            "w-24 h-8 text-xs font-semibold shadow-sm transition-all",
            className,
          )}
        >
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {item.type === "student" && (
          <>
            <DropdownMenuItem onSelect={() => onUpdate("present")}>
              Present
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("absent")}>
              Absent
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("excused")}>
              Excused
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("")}>
              Clear
            </DropdownMenuItem>
          </>
        )}
        {item.type === "makeup" && (
          <>
            <DropdownMenuItem onSelect={() => onUpdate("attended")}>
              Attended
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("missed")}>
              Missed
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("cancelled")}>
              Cancelled
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("")}>
              Clear (Reset)
            </DropdownMenuItem>
          </>
        )}
        {item.type === "trial" && (
          <>
            <DropdownMenuItem onSelect={() => onUpdate("attended")}>
              Attended
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("noshow")}>
              No Show
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onUpdate("cancelled")}>
              Cancelled
            </DropdownMenuItem>
            {/* Converted is handled via a separate flow usually, but could allow manual set here if needed, but risky without student creation flow */}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
