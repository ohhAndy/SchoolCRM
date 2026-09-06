"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FULL_DAY_LABELS, formatTimeRange } from "@/lib/schedule/slots";
import { AddClassDialog } from "@/components/schedule/dialogs";
import { DetailedTimeSlot } from "@/lib/api/server/schedule";

import Link from "next/link";

export default function TimeSlots({
  timeSlots,
  weekday,
  termId,
  showDetails = false,
}: {
  timeSlots: DetailedTimeSlot[];
  weekday: number;
  termId: string;
  showDetails?: boolean;
}) {
  const getDuration = (timeSlot: string) => {
    const [start, end] = timeSlot.split("-");
    if (!start || !end) return 0;
    const [h1, m1] = start.split(":").map(Number);
    const [h2, m2] = end.split(":").map(Number);
    return h2 * 60 + m2 - (h1 * 60 + m1);
  };

  return (
    <Card className="w-full rounded-sm">
      <CardHeader className="text-lg font-semibold text-center font-fredoka">
        <CardTitle>{FULL_DAY_LABELS[weekday]}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2 items-center">
          {timeSlots.map((slot, i) => (
            <Button
              key={i}
              asChild
              variant="ghost"
              className="w-full h-auto flex flex-col items-center rounded-md hover:bg-muted transition cursor-pointer py-2 gap-0.5"
            >
              <Link
                href={`/term/${termId}/schedule/weekday/${weekday}/slot/${slot.time}`}
              >
                <span
                  className={`text-center text-sm font-medium ${
                    getDuration(slot.time) === 30
                      ? "text-yellow-600"
                      : getDuration(slot.time) === 45
                        ? "text-[#1c82c5]"
                        : "text-green-600"
                  }`}
                >
                  {formatTimeRange(slot.time)}
                </span>
                {showDetails && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{slot.offeringCount} {slot.offeringCount === 1 ? "class" : "classes"}</span>
                    <span>·</span>
                    <span className={slot.filledSeats >= slot.realCapacity ? "text-red-500 font-medium" : ""}>{slot.filledSeats}/{slot.realCapacity}</span>
                  </div>
                )}
              </Link>
            </Button>
          ))}
          <AddClassDialog termId={termId} weekday={weekday} />
        </div>
      </CardContent>
    </Card>
  );
}
