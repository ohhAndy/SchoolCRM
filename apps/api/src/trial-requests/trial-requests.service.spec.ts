import { Test, TestingModule } from "@nestjs/testing";
import { TrialRequestsService } from "./trial-requests.service";
import { PrismaService } from "../prisma/prisma.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { createPrismaMock, MockPrismaService } from "../prisma/prisma.mock";
import { RequestStaffUser } from "../auth/auth.types";
import { NotFoundException, BadRequestException } from "@nestjs/common";

describe("TrialRequestsService", () => {
  let service: TrialRequestsService;
  let prismaMock: MockPrismaService;
  let auditLogsServiceMock: { create: jest.Mock };

  const mockStaffUser: RequestStaffUser = {
    id: "staff1",
    authId: "user1",
    email: "admin@swanswimschool.com",
    fullName: "Admin User",
    role: "admin",
    active: true,
    accessSchedule: {},
    accessibleLocations: [{ id: "loc1" }],
  };

  beforeEach(async () => {
    prismaMock = createPrismaMock();
    auditLogsServiceMock = { create: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrialRequestsService,
        { provide: AuditLogsService, useValue: auditLogsServiceMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TrialRequestsService>(TrialRequestsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should query trial requests with filters and counts", async () => {
      const mockItems = [
        {
          id: "req1",
          parentName: "Jane Doe",
          childName: "Tommy Doe",
          status: "pending",
        },
      ];
      prismaMock.trialRequest.findMany.mockResolvedValue(mockItems);
      prismaMock.trialRequest.count.mockResolvedValueOnce(1); // total
      prismaMock.trialRequest.groupBy.mockResolvedValueOnce([
        { status: "pending", _count: { _all: 1 } },
        { status: "approved", _count: { _all: 0 } },
      ]);

      const result = await service.findAll({
        status: "all",
        page: 1,
        limit: 20,
      });

      expect(result.items).toEqual(mockItems);
      expect(result.pagination.total).toBe(1);
      expect(result.counts.pending).toBe(1);
    });
  });

  describe("getStats", () => {
    it("should return summary counts", async () => {
      prismaMock.trialRequest.groupBy.mockResolvedValueOnce([
        { status: "pending", _count: { _all: 5 } },
        { status: "approved", _count: { _all: 3 } },
        { status: "declined", _count: { _all: 1 } },
      ]);
      prismaMock.trialRequest.count
        .mockResolvedValueOnce(2) // todayCount
        .mockResolvedValueOnce(9); // total

      const stats = await service.getStats();
      expect(stats.pending).toBe(5);
      expect(stats.approved).toBe(3);
      expect(stats.total).toBe(9);
    });
  });

  describe("updateStatus", () => {
    it("should update status, reviewer, and log audit event", async () => {
      prismaMock.trialRequest.findUnique.mockResolvedValue({
        id: "req1",
        childName: "Tommy",
        parentName: "Jane",
        status: "pending",
      });

      prismaMock.trialRequest.update.mockResolvedValue({
        id: "req1",
        status: "approved",
      });

      const res = await service.updateStatus("req1", "approved", mockStaffUser);
      expect(res.status).toBe("approved");
      expect(auditLogsServiceMock.create).toHaveBeenCalled();
    });

    it("should throw NotFoundException if request does not exist", async () => {
      prismaMock.trialRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStatus("req_missing", "approved", mockStaffUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("bookSession", () => {
    it("should create trial booking and mark request approved in transaction", async () => {
      prismaMock.trialRequest.findUnique.mockResolvedValue({
        id: "req1",
        childName: "Tommy",
        childAge: 5,
        parentPhone: "1234567890",
        notes: "[Skill Level: Beginner]",
        status: "pending",
      });

      prismaMock.classSession.findUnique.mockResolvedValue({
        id: "sess1",
        date: new Date("2026-09-12T14:00:00Z"),
        offering: {
          id: "off1",
          title: "Preschool Sat 10am",
          type: "regular",
        },
      });

      prismaMock.trialBooking.create.mockResolvedValue({
        id: "book1",
        childName: "Tommy",
      });

      prismaMock.trialRequest.update.mockResolvedValue({
        id: "req1",
        status: "approved",
      });

      const result = await service.bookSession(
        "req1",
        { classSessionId: "sess1", classRatio: "3:1" },
        mockStaffUser,
      );

      expect(result.trialBooking.id).toBe("book1");
      expect(result.trialRequest.status).toBe("approved");
      expect(auditLogsServiceMock.create).toHaveBeenCalled();
    });

    it("should reject booking into flexible courses", async () => {
      prismaMock.trialRequest.findUnique.mockResolvedValue({
        id: "req1",
        childName: "Tommy",
      });

      prismaMock.classSession.findUnique.mockResolvedValue({
        id: "sess1",
        offering: { type: "flexible" },
      });

      await expect(
        service.bookSession("req1", { classSessionId: "sess1" }, mockStaffUser),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
