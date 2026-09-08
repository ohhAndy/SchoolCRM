import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { calculateClassUsage } from "../common/capacity.utils";
import { RequestStaffUser } from "../auth/auth.types";

import { AuditLogsService } from "../audit-logs/audit-logs.service";

@Injectable()
export class OfferingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async updateOfferingInfo(
    offeringId: string,
    body: { title: string },
    staffUser: RequestStaffUser,
  ) {

    const offering = await this.prisma.classOffering.findUnique({
      where: { id: offeringId },
    });
    if (!offering) throw new NotFoundException("Offering DNE");

    const updatedOffering = await this.prisma.classOffering.update({
      where: { id: offeringId },
      data: {
        title: body.title,
      },
    });

    await this.auditLogsService.create({
      staffId: staffUser.id,
      action: "Update Offering Info",
      entityType: "ClassOffering",
      entityId: updatedOffering.id,
      changes: {
        status: {
          from: { title: offering.title },
          to: { title: updatedOffering.title },
        },
      },
      metadata: {
        termId: offering.termId,
      },
    });

    return { success: true };
  }

  async getOfferingsForTransfer(
    termId: string,
    excludeOfferingId: string,
    level?: string,
  ) {
    const offerings = await this.prisma.classOffering.findMany({
      where: {
        termId,
        id: { not: excludeOfferingId },
        ...(level ? { title: { contains: level, mode: "insensitive" } } : {}),
      },
      include: {
        term: true,
        enrollments: {
          where: { status: "active" },
          select: { classRatio: true },
        },
        instructors: {
          where: { removedAt: null },
          select: { id: true },
        },
        sessions: {
          orderBy: { date: "asc" },
          select: {
            id: true,
            date: true,
          },
        },
      },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });

    return offerings.map((o) => {
      const { filled, effectiveCapacity } = calculateClassUsage(
        o.enrollments,
        o.instructors.length,
        o.capacity,
      );
      return {
        ...o,
        capacity: effectiveCapacity,
        _count: { enrollments: filled }, // Helper for frontend compatibility (note: float now)
      };
    });
  }

  async createOffering(
    data: {
      termId: string;
      type?: "regular" | "flexible";
      weekday?: number;
      startTime?: string; // HH:MM
      title: string;
      capacity: number;
      duration?: number;
      notes?: string;
      sessions?: { date: string; startTime: string; endTime: string }[];
    },
    staffUser: RequestStaffUser,
  ) {

    if (
      data.type === "flexible" &&
      staffUser.role !== "super_admin" &&
      staffUser.role !== "admin"
    ) {
      throw new ForbiddenException(
        "Only admins can create flexible short courses",
      );
    }

    const term = await this.prisma.term.findUnique({
      where: { id: data.termId },
    });
    if (!term) throw new NotFoundException("Term not found");

    const DURATION = data.duration || 45;

    let endTime: string | undefined = undefined;

    if (data.type !== "flexible" && data.startTime) {
      const [h, m] = data.startTime.split(":").map(Number);
      const total = h * 60 + m + DURATION;
      const hh = Math.floor((total % (24 * 60)) / 60.0);
      const mm = total % 60;
      endTime = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Offering
      const offering = await tx.classOffering.create({
        data: {
          termId: data.termId,
          type: data.type || "regular",
          weekday: data.type === "flexible" ? null : data.weekday,
          startTime: data.type === "flexible" ? null : data.startTime,
          endTime: data.type === "flexible" ? null : endTime,
          duration: data.type === "flexible" ? null : DURATION,
          title: data.title,
          capacity: data.capacity,
          notes: data.notes ?? null,
        },
      });

      // 2. Generate Sessions
      if (data.type === "flexible") {
        if (data.sessions && data.sessions.length > 0) {
          await tx.classSession.createMany({
            data: data.sessions.map((s) => ({
              offeringId: offering.id,
              date: new Date(s.date),
              startTime: s.startTime,
              endTime: s.endTime,
              status: "scheduled",
              notes: null,
            })),
          });
        }
      } else {
        // We need to find all dates in the term that match this weekday
        if (data.weekday === undefined)
          throw new BadRequestException(
            "Weekday is required for regular offerings",
          );
        const start = new Date(term.startDate);
        const end = new Date(term.endDate);
        end.setUTCHours(23, 59, 59, 999);

        const dates: Date[] = [];
        const cur = new Date(start);
        // Set to noon UTC to avoid timezone shifts
        cur.setUTCHours(12, 0, 0, 0);

        // Advance to first matching weekday
        while (cur.getUTCDay() !== data.weekday) {
          cur.setUTCDate(cur.getUTCDate() + 1);
        }

        while (cur <= end) {
          dates.push(new Date(cur));
          cur.setUTCDate(cur.getUTCDate() + 7);
        }

        if (dates.length > 0) {
          await tx.classSession.createMany({
            data: dates.map((d) => ({
              offeringId: offering.id,
              date: d,
              status: "scheduled",
              notes: null,
            })),
          });
        }
      }

      // 3. Audit
      await this.auditLogsService.create(
        {
          staffId: staffUser.id,
          action: "Create Class Offering",
          entityType: "ClassOffering",
          entityId: offering.id,
          metadata: {
            title: offering.title,
            termId: term.id,
          },
        },
        tx,
      );

      return offering;
    });
  }

  async deleteOffering(offeringId: string, staffUser: RequestStaffUser) {
    // Check for enrollments
    const enrollments = await this.prisma.enrollment.count({
      where: { offeringId, status: "active" },
    });

    if (enrollments > 0) {
      throw new BadRequestException(
        "Cannot delete offering with active enrollments.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete sessions first (cascade might handle this, but safer to be explicit or rely on schema)
      // Assuming cascade is NOT set up for safety, usually we delete sessions.
      // But actually, sessions have foreign key to offering.
      await tx.classSession.deleteMany({
        where: { offeringId },
      });

      const deleted = await tx.classOffering.delete({
        where: { id: offeringId },
      });

      if (staffUser) {
        await this.auditLogsService.create(
          {
            staffId: staffUser.id,
            action: "Delete Class Offering",
            entityType: "ClassOffering",
            entityId: offeringId,
            metadata: {
              title: deleted.title,
            },
          },
          tx,
        );
      }

      return deleted;
    });
  }
}
