"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FULL_DAY_LABELS, formatTimeRange } from "@/lib/schedule/slots";
import { getTimeSlotsByWeekday } from "@/lib/api/client/schedule";
import { Loader2 } from "lucide-react";

export function SlotNavigator({
  termId,
  currentWeekday,
  currentSlot,
}: {
  termId: string;
  currentWeekday: number;
  currentSlot?: string;
}) {
  const router = useRouter();
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    async function fetchSlots() {
      setLoadingSlots(true);
      try {
        const slots = await getTimeSlotsByWeekday(termId, currentWeekday);
        if (mounted) {
          setAvailableSlots(slots);
        }
      } catch (error) {
        console.error("Failed to fetch slots", error);
      } finally {
        if (mounted) setLoadingSlots(false);
      }
    }
    fetchSlots();
    return () => {
      mounted = false;
    };
  }, [termId, currentWeekday]);

  const handleWeekdayChange = (val: string) => {
    const newWeekday = Number(val);
    if (newWeekday === currentWeekday) return;

    // UX: Redirect to the closest matching slot or first available.
    setLoadingSlots(true);
    getTimeSlotsByWeekday(termId, newWeekday)
      .then((slots) => {
        if (slots.length > 0) {
          const match = slots.find((s) => s === currentSlot);
          const target = match || slots[0];
          const [s, e] = target.split("-");
          router.push(
            `/term/${termId}/schedule/weekday/${newWeekday}/slot/${s}-${e}`,
          );
        } else {
          router.push(`/term/${termId}/schedule/weekday/${newWeekday}`);
        }
      })
      .finally(() => setLoadingSlots(false));
  };

  const handleSlotChange = (val: string) => {
    const [s, e] = val.split("-");
    router.push(
      `/term/${termId}/schedule/weekday/${currentWeekday}/slot/${s}-${e}`,
    );
  };

  return (
    <div className="flex items-center gap-2">
      <Select
        value={currentWeekday.toString()}
        onValueChange={handleWeekdayChange}
        disabled={loadingSlots}
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Weekday" />
        </SelectTrigger>
        <SelectContent>
          {[0, 1, 2, 3, 4, 5, 6].map((d) => (
            <SelectItem key={d} value={d.toString()}>
              {FULL_DAY_LABELS[d]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={currentSlot}
        onValueChange={handleSlotChange}
        disabled={loadingSlots}
      >
        <SelectTrigger className="w-[140px] h-9">
          {loadingSlots ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <SelectValue placeholder="Time Slot" />
          )}
        </SelectTrigger>
        <SelectContent>
          {availableSlots.map((slot) => (
            <SelectItem key={slot} value={slot}>
              {formatTimeRange(slot)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
