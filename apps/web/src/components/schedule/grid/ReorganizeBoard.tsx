"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Loader2, X, Check } from "lucide-react";
import { bulkTransferEnrollments } from "@/lib/api/client/schedule";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import type { RosterResponse } from "@school/shared-types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ReorganizeStudent {
  enrollmentId: string;
  studentName: string;
  studentLevel: string | null;
  classRatio: string;
  shortCode: string | null;
}

export interface ReorganizeOffering {
  offeringId: string;
  title: string;
  students: ReorganizeStudent[];
}

// ─── Build initial state from SlotPage blocks ─────────────────────────────────

export function buildReorganizeState(
  blocks: { offeringKey: string; title: string; rosters: RosterResponse[] }[],
): ReorganizeOffering[] {
  return blocks.map((block) => {
    const seen = new Set<string>();
    const students: ReorganizeStudent[] = [];

    for (const roster of block.rosters) {
      for (const row of roster.roster) {
        if (!row.enrollmentId || seen.has(row.enrollmentId)) continue;
        seen.add(row.enrollmentId);
        students.push({
          enrollmentId: row.enrollmentId,
          studentName: row.studentName,
          studentLevel: row.studentLevel,
          classRatio: row.classRatio,
          shortCode: row.shortCode,
        });
      }
    }

    return { offeringId: block.offeringKey, title: block.title, students };
  });
}

// ─── Draggable Student Card ───────────────────────────────────────────────────

function DraggableCard({ student }: { student: ReorganizeStudent }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: student.enrollmentId,
    data: { student },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-sm cursor-grab active:cursor-grabbing select-none transition-opacity ${
        isDragging ? "opacity-30" : "opacity-100"
      }`}
    >
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{student.studentName}</div>
        <div className="flex items-center gap-1 flex-wrap">
          {student.studentLevel && (
            <span className="text-xs text-muted-foreground">{student.studentLevel}</span>
          )}
          {student.shortCode && (
            <Badge variant="outline" className="text-xs px-1 py-0 h-4">
              {student.shortCode}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs px-1 py-0 h-4">
            {student.classRatio}
          </Badge>
        </div>
      </div>
    </div>
  );
}

// ─── Overlay Card (shown while dragging) ─────────────────────────────────────

function OverlayCard({ student }: { student: ReorganizeStudent }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm shadow-xl cursor-grabbing select-none rotate-2 scale-105 ring-2 ring-primary/40">
      <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{student.studentName}</div>
        <span className="text-xs text-muted-foreground">{student.classRatio}</span>
      </div>
    </div>
  );
}

// ─── Droppable Offering Column ────────────────────────────────────────────────

function DropColumn({ offering }: { offering: ReorganizeOffering }) {
  const { setNodeRef, isOver } = useDroppable({ id: offering.offeringId });

  return (
    <Card
      className={`flex flex-col min-h-[200px] transition-all duration-150 ${
        isOver
          ? "ring-2 ring-primary bg-primary/5 scale-[1.01]"
          : "ring-0"
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold line-clamp-2">
          {offering.title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {offering.students.length} student{offering.students.length !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div
          ref={setNodeRef}
          className={`flex flex-col gap-2 min-h-[80px] rounded-md p-1 transition-colors duration-150 ${
            isOver ? "bg-primary/5" : ""
          }`}
        >
          {offering.students.length === 0 && (
            <div
              className={`flex items-center justify-center h-16 rounded-md border-2 border-dashed text-xs transition-colors duration-150 ${
                isOver
                  ? "border-primary text-primary"
                  : "border-muted-foreground/30 text-muted-foreground"
              }`}
            >
              Drop here
            </div>
          )}
          {offering.students.map((student) => (
            <DraggableCard key={student.enrollmentId} student={student} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pending moves diff ───────────────────────────────────────────────────────

function computeMoves(
  initial: ReorganizeOffering[],
  current: ReorganizeOffering[],
): { enrollmentId: string; toOfferingId: string }[] {
  const initialMap = new Map<string, string>();
  for (const off of initial) {
    for (const s of off.students) {
      initialMap.set(s.enrollmentId, off.offeringId);
    }
  }
  const moves: { enrollmentId: string; toOfferingId: string }[] = [];
  for (const off of current) {
    for (const s of off.students) {
      const from = initialMap.get(s.enrollmentId);
      if (from && from !== off.offeringId) {
        moves.push({ enrollmentId: s.enrollmentId, toOfferingId: off.offeringId });
      }
    }
  }
  return moves;
}

// ─── Main ReorganizeBoard ─────────────────────────────────────────────────────

export function ReorganizeBoard({
  initialOfferings,
  onCancel,
}: {
  initialOfferings: ReorganizeOffering[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [offerings, setOfferings] = useState<ReorganizeOffering[]>(initialOfferings);
  const [activeStudent, setActiveStudent] = useState<ReorganizeStudent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // Custom collision: prefer pointer-within, fallback to rect intersection
  const collisionDetection = (args: Parameters<typeof pointerWithin>[0]) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return getFirstCollision(rectIntersection(args)) ? rectIntersection(args) : [];
  };

  const findOwnerOffering = (enrollmentId: string) =>
    offerings.find((o) => o.students.some((s) => s.enrollmentId === enrollmentId));

  const handleDragStart = ({ active }: DragStartEvent) => {
    const student = active.data.current?.student as ReorganizeStudent | undefined;
    setActiveStudent(student ?? null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveStudent(null);
    if (!over) return;

    const enrollmentId = active.id as string;
    const targetOfferingId = over.id as string;

    const sourceOffering = findOwnerOffering(enrollmentId);
    if (!sourceOffering || sourceOffering.offeringId === targetOfferingId) return;

    // Verify target is a valid offering column
    const targetOffering = offerings.find((o) => o.offeringId === targetOfferingId);
    if (!targetOffering) return;

    setOfferings((prev) =>
      prev.map((off) => {
        if (off.offeringId === sourceOffering.offeringId) {
          return { ...off, students: off.students.filter((s) => s.enrollmentId !== enrollmentId) };
        }
        if (off.offeringId === targetOfferingId) {
          const student = sourceOffering.students.find((s) => s.enrollmentId === enrollmentId)!;
          return { ...off, students: [...off.students, student] };
        }
        return off;
      }),
    );
  };

  const moves = computeMoves(initialOfferings, offerings);

  const handleConfirm = async () => {
    if (moves.length === 0) return;
    setIsSubmitting(true);
    try {
      await bulkTransferEnrollments(
        moves.map((m) => ({ enrollmentId: m.enrollmentId, targetOfferingId: m.toOfferingId })),
      );
      toast.success(`${moves.length} student${moves.length > 1 ? "s" : ""} moved successfully`);
      router.refresh();
      onCancel();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to apply transfers";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const colCount = Math.min(offerings.length, 4);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-medium">Reorganize Mode</span>
          <span className="hidden sm:inline text-sm text-muted-foreground">
            — drag students between classes
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCancel} disabled={isSubmitting}>
            <X className="h-4 w-4 mr-1" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={moves.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-1" />
            )}
            {moves.length === 0
              ? "No changes"
              : `Confirm ${moves.length} move${moves.length > 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))`,
          }}
        >
          {offerings.map((offering) => (
            <DropColumn key={offering.offeringId} offering={offering} />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeStudent ? <OverlayCard student={activeStudent} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
