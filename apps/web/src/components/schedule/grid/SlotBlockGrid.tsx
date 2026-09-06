"use client";

import { useState, useMemo } from "react";
import { SlotBlock } from "./SlotBlock";
import { ReorganizeBoard, buildReorganizeState } from "./ReorganizeBoard";
import type { RosterResponse } from "@school/shared-types";
import type { CurrentUser } from "@/lib/auth/user";
import { Button } from "@/components/ui/button";
import { Shuffle } from "lucide-react";

interface SlotBlockGridProps {
  blocks: { offeringKey: string; title: string; notes: string; rosters: RosterResponse[] }[];
  isoDates: string[];
  user: CurrentUser;
  termName: string;
}

export function SlotBlockGrid({ blocks, isoDates, user, termName }: SlotBlockGridProps) {
  const [reorganizeMode, setReorganizeMode] = useState(false);

  const canReorganize = ["admin", "super_admin", "manager"].includes(user.role);

  const reorganizeOfferings = useMemo(
    () => buildReorganizeState(blocks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reorganizeMode], // Rebuild only when entering mode so we snapshot current state
  );

  if (reorganizeMode) {
    return (
      <ReorganizeBoard
        initialOfferings={reorganizeOfferings}
        onCancel={() => setReorganizeMode(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {canReorganize && blocks.length > 1 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setReorganizeMode(true)}
          >
            <Shuffle className="h-4 w-4" />
            Reorganize Students
          </Button>
        </div>
      )}
      <div className="grid gap-5 print:block">
        {blocks.map((b) => (
          <SlotBlock
            key={b.offeringKey}
            title={b.title}
            isoDates={isoDates}
            rosters={b.rosters}
            user={user}
            gridHeaderTop="128px"
            termName={termName}
          />
        ))}
      </div>
    </div>
  );
}
