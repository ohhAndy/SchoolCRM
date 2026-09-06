import { getSlotPage } from "@/lib/api/server/schedule";
import { weekdayName, groupByOffering } from "@/lib/schedule/transform";
import type { SlotPage } from "@school/shared-types";
import { SlotHeader, SlotBlockGrid, SlotNavigator } from "@/components/schedule/grid";
import PreviousButton from "@/components/nav/PreviousButton";
import NextButton from "@/components/nav/NextButton";
import { getCurrentUser } from "@/lib/auth/user";
import { redirect } from "next/navigation";
import { hasMinRole } from "@/lib/auth/permissions";
import { AddClassDialog } from "@/components/schedule/dialogs";
import { PermissionGate } from "@/components/auth/PermissionGate";
import { formatTimeRange } from "@/lib/schedule/slots";
import { DAY_LABELS } from "@/lib/schedule/slots";

export const dynamic = "force-dynamic";

// Dynamic metadata based on numeric weekday
export const generateMetadata = async ({
  params,
}: {
  params: Promise<{ weekday: string }>;
}) => {
  const { weekday } = await params;
  const weekdayName = DAY_LABELS[Number(weekday)] ?? `Day ${weekday}`;
  return {
    title: `${weekdayName} | Swan Swim Management`,
  };
};

function parseRange(range: string) {
  const [start, end] = decodeURIComponent(range).split("-");
  return { start, end };
}

export default async function SlotPageView({
  params,
}: {
  params: Promise<{ weekday: string; termId: string; range: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (!hasMinRole(user.role, "manager")) {
    redirect("/forbidden");
  }

  const resolvedParams = await params;
  const { weekday, termId, range } = resolvedParams;
  const { start, end } = parseRange(range);

  // Calculate duration
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const duration = eh * 60 + em - (sh * 60 + sm);

  const data: SlotPage = await getSlotPage(termId, Number(weekday), start, end);

  const title = `${weekdayName(data.meta.weekday)} - ${formatTimeRange(
    `${data.meta.startTime}-${data.meta.endTime}`,
  )}`;
  const subtitle = data.meta.term?.name ?? null;

  const isoDates = data.days.map((d) => d.date);
  const blocks = groupByOffering(data);

  return (
    <main className="p-6 print:p-0">
      <div className="mb-3 flex items-center justify-between">
        <PreviousButton
          baseHref={`/term/${termId}/schedule`}
          weekday={Number(weekday)}
          slotTime={decodeURIComponent(range)}
          termId={termId}
        />
        <NextButton
          baseHref={`/term/${termId}/schedule`}
          weekday={Number(weekday)}
          slotTime={decodeURIComponent(range)}
          termId={termId}
        />
      </div>
      <SlotHeader title={title} subtitle={subtitle}>
        <SlotNavigator
          termId={termId}
          currentWeekday={Number(weekday)}
          currentSlot={decodeURIComponent(range)}
        />
        <PermissionGate
          allowedRoles={["super_admin", "admin", "manager"]}
          currentRole={user.role}
        >
          <AddClassDialog
            termId={termId}
            weekday={Number(weekday)}
            startTime={start}
            duration={duration}
          />
        </PermissionGate>
      </SlotHeader>
      <SlotBlockGrid
        blocks={blocks}
        isoDates={isoDates}
        user={user}
        termName={subtitle || "Term"}
      />
    </main>
  );
}
