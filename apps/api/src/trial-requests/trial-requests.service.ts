import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { RequestStaffUser } from "../auth/auth.types";
import { TrialRequestQueryDto } from "./dto/trial-request-query.dto";
import { BookTrialRequestDto } from "./dto/book-trial-request.dto";
import { TrialRequestStatus, Prisma } from "@prisma/client";
import { getTorontoStartOfDay } from "../common/date.utils";

@Injectable()
export class TrialRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(query: TrialRequestQueryDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const where: Prisma.TrialRequestWhereInput = {};

    if (query.status && query.status !== "all") {
      where.status = query.status as TrialRequestStatus;
    }

    if (query.locationId) {
      where.locationId = query.locationId;
    }

    if (query.search?.trim()) {
      const search = query.search.trim();
      const phoneDigits = search.replace(/\D/g, "");

      where.OR = [
        { parentName: { contains: search, mode: "insensitive" } },
        { childName: { contains: search, mode: "insensitive" } },
        { parentEmail: { contains: search, mode: "insensitive" } },
        ...(phoneDigits.length >= 3
          ? [{ parentPhone: { contains: phoneDigits } }]
          : []),
      ];
    }

    const [items, total, statusGroups] = await Promise.all([
      this.prisma.trialRequest.findMany({
        where,
        include: {
          location: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          reviewedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          submittedAt: "desc",
        },
        skip,
        take: limit,
      }),
      this.prisma.trialRequest.count({ where }),
      this.prisma.trialRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const counts: Record<string, number> = {
      pending: 0,
      approved: 0,
      declined: 0,
      spam: 0,
    };

    for (const group of statusGroups) {
      if (group.status in counts) {
        counts[group.status] = group._count._all;
      }
    }

    const allCount =
      counts.pending + counts.approved + counts.declined + counts.spam;

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      counts: {
        all: allCount,
        pending: counts.pending,
        approved: counts.approved,
        declined: counts.declined,
        spam: counts.spam,
      },
    };
  }

  async getStats() {
    const startOfToday = getTorontoStartOfDay();

    const [statusGroups, todayCount, total] = await Promise.all([
      this.prisma.trialRequest.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      this.prisma.trialRequest.count({
        where: { submittedAt: { gte: startOfToday } },
      }),
      this.prisma.trialRequest.count(),
    ]);

    const counts: Record<string, number> = {
      pending: 0,
      approved: 0,
      declined: 0,
      spam: 0,
    };

    for (const group of statusGroups) {
      if (group.status in counts) {
        counts[group.status] = group._count._all;
      }
    }

    return {
      pending: counts.pending,
      approved: counts.approved,
      declined: counts.declined,
      spam: counts.spam,
      todayCount,
      total,
    };
  }

  async findOne(id: string) {
    const request = await this.prisma.trialRequest.findUnique({
      where: { id },
      include: {
        location: true,
        reviewedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException("Trial request not found");
    }

    return request;
  }

  async updateStatus(
    id: string,
    status: TrialRequestStatus,
    staffUser: RequestStaffUser,
  ) {
    const request = await this.prisma.trialRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException("Trial request not found");
    }

    const updated = await this.prisma.trialRequest.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: staffUser.id,
      },
      include: {
        reviewedByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    await this.auditLogsService.create({
      staffId: staffUser.id,
      action: "Update Trial Request Status",
      entityType: "TrialRequest",
      entityId: id,
      metadata: {
        oldStatus: request.status,
        newStatus: status,
        childName: request.childName,
        parentName: request.parentName,
      },
    });

    return updated;
  }

  async updateNotes(
    id: string,
    notes: string | null | undefined,
    staffUser: RequestStaffUser,
  ) {
    const request = await this.prisma.trialRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException("Trial request not found");
    }

    const updated = await this.prisma.trialRequest.update({
      where: { id },
      data: {
        notes: notes ?? null,
      },
    });

    await this.auditLogsService.create({
      staffId: staffUser.id,
      action: "Update Trial Request Notes",
      entityType: "TrialRequest",
      entityId: id,
      metadata: {
        childName: request.childName,
        parentName: request.parentName,
      },
    });

    return updated;
  }

  async bookSession(
    id: string,
    dto: BookTrialRequestDto,
    staffUser: RequestStaffUser,
  ) {
    const trialRequest = await this.prisma.trialRequest.findUnique({
      where: { id },
    });

    if (!trialRequest) {
      throw new NotFoundException("Trial request not found");
    }

    const session = await this.prisma.classSession.findUnique({
      where: { id: dto.classSessionId },
      include: {
        offering: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException("Class session not found");
    }

    if (session.offering.type === "flexible") {
      throw new BadRequestException(
        "Trials are not allowed for flexible courses",
      );
    }

    const sessionDateStr = session.date.toISOString().split("T")[0];
    const bookingTag = `[Booked Session: ${session.offering.title} on ${sessionDateStr}]`;

    const existingNotes = trialRequest.notes || "";
    const updatedRequestNotes = existingNotes.includes(bookingTag)
      ? existingNotes
      : [existingNotes, bookingTag, dto.notes?.trim()]
          .filter(Boolean)
          .join(" ");

    const combinedBookingNotes = [
      trialRequest.notes,
      dto.notes?.trim() ? `[Staff Note: ${dto.notes.trim()}]` : null,
    ]
      .filter(Boolean)
      .join(" ");

    return this.prisma.$transaction(async (tx) => {
      const trialBooking = await tx.trialBooking.create({
        data: {
          classSessionId: dto.classSessionId,
          childName: trialRequest.childName,
          childAge: trialRequest.childAge,
          parentPhone: trialRequest.parentPhone,
          notes: combinedBookingNotes || null,
          status: "scheduled",
          createdBy: staffUser.id,
          classRatio: dto.classRatio || "3:1",
        },
        include: {
          classSession: {
            select: {
              id: true,
              date: true,
              offering: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      });

      const updatedTrialRequest = await tx.trialRequest.update({
        where: { id },
        data: {
          status: "approved",
          reviewedAt: new Date(),
          reviewedBy: staffUser.id,
          notes: updatedRequestNotes || null,
        },
        include: {
          reviewedByUser: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          location: true,
        },
      });

      await this.auditLogsService.create(
        {
          staffId: staffUser.id,
          action: "Book Trial Session from Request",
          entityType: "TrialRequest",
          entityId: id,
          metadata: {
            trialBookingId: trialBooking.id,
            classSessionId: dto.classSessionId,
            sessionDate: session.date.toISOString(),
            offeringTitle: session.offering.title,
            childName: trialRequest.childName,
            parentName: trialRequest.parentName,
          },
        },
        tx,
      );

      return {
        trialBooking,
        trialRequest: updatedTrialRequest,
      };
    });
  }

  async delete(id: string, staffUser: RequestStaffUser) {
    const request = await this.prisma.trialRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException("Trial request not found");
    }

    await this.prisma.trialRequest.delete({
      where: { id },
    });

    await this.auditLogsService.create({
      staffId: staffUser.id,
      action: "Delete Trial Request",
      entityType: "TrialRequest",
      entityId: id,
      metadata: {
        childName: request.childName,
        parentName: request.parentName,
        parentPhone: request.parentPhone,
      },
    });

    return { success: true };
  }
}
