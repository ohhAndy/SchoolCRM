import { Test, TestingModule } from "@nestjs/testing";
import { PublicService } from "./public.service";
import { PrismaService } from "../prisma/prisma.service";
import { BadRequestException } from "@nestjs/common";

describe("PublicService", () => {
  let service: PublicService;
  let prisma: {
    trialRequest: {
      count: jest.Mock;
      create: jest.Mock;
    };
    location: {
      findUnique: jest.Mock;
    };
    classSession: {
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      trialRequest: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: "req_1", ...data })),
      },
      location: {
        findUnique: jest.fn().mockResolvedValue({ id: "loc_1", name: "Markham", slug: "markham" }),
      },
      classSession: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublicService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PublicService>(PublicService);
  });

  describe("submitTrialRequest", () => {
    it("should throw if parent name is missing or too short", async () => {
      await expect(
        service.submitTrialRequest({
          parentName: "A",
          parentPhone: "4165551234",
          childName: "Tommy",
          childAge: 6,
          preferredDates: ["2026-09-15"],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should create individual records for multiple children with simultaneous timing notes", async () => {
      const result = await service.submitTrialRequest({
        parentName: "Jane Doe",
        parentPhone: "(416) 555-1234",
        parentEmail: "jane@example.com",
        children: [
          { name: "Emma Doe", age: 6, skillLevel: "Beginner" },
          { name: "Lucas Doe", age: 8, skillLevel: "Intermediate" },
        ],
        siblingPreference: "simultaneous",
        preferredDates: ["2026-09-15"],
        locationSlug: "markham",
        ipAddress: "203.0.113.1",
      });

      expect(result.success).toBe(true);
      expect(result.cookieId).toMatch(/^trk_/);
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.trialRequest.create).toHaveBeenCalledTimes(2);

      // Verify first child record
      const firstCall = prisma.trialRequest.create.mock.calls[0][0].data;
      expect(firstCall.childName).toBe("Emma Doe");
      expect(firstCall.childAge).toBe(6);
      expect(firstCall.cookieId).toBe(result.cookieId);
      expect(firstCall.ipAddress).toBe("203.0.113.1");
      expect(firstCall.notes).toContain("Sibling Trial 1 of 2");
      expect(firstCall.notes).toContain("Same Time");

      // Verify second child record
      const secondCall = prisma.trialRequest.create.mock.calls[1][0].data;
      expect(secondCall.childName).toBe("Lucas Doe");
      expect(secondCall.childAge).toBe(8);
      expect(secondCall.cookieId).toBe(result.cookieId);
      expect(secondCall.ipAddress).toBe("203.0.113.1");
      expect(secondCall.notes).toContain("Sibling Trial 2 of 2");
    });

    it("should reuse client cookieId if provided", async () => {
      const result = await service.submitTrialRequest({
        parentName: "John Doe",
        parentPhone: "4165551234",
        childName: "Alex",
        childAge: 5,
        preferredDates: ["2026-09-15"],
        cookieId: "existing_cookie_123",
        ipAddress: "198.51.100.2",
      });

      expect(result.success).toBe(true);
      expect(result.cookieId).toBe("existing_cookie_123");

      const created = prisma.trialRequest.create.mock.calls[0][0].data;
      expect(created.cookieId).toBe("existing_cookie_123");
      expect(created.ipAddress).toBe("198.51.100.2");
    });

    it("should reject if phone number already has 5 or more pending requests", async () => {
      prisma.trialRequest.count.mockResolvedValue(5);

      await expect(
        service.submitTrialRequest({
          parentName: "Sarah Connor",
          parentPhone: "4165559999",
          childName: "John",
          childAge: 10,
          preferredDates: ["2026-09-15"],
        }),
      ).rejects.toThrow("You have reached the maximum limit of 5 active trial requests for this phone number. Our team will be in touch soon! If you have questions or need assistance, please contact our office.");
    });

    it("should reject when existing pending plus new children exceeds 5", async () => {
      prisma.trialRequest.count.mockResolvedValue(3);

      await expect(
        service.submitTrialRequest({
          parentName: "Sarah Connor",
          parentPhone: "4165559999",
          children: [
            { name: "Kid 1", age: 5 },
            { name: "Kid 2", age: 7 },
            { name: "Kid 3", age: 9 },
          ],
          preferredDates: ["2026-09-15"],
        }),
      ).rejects.toThrow("You already have 3 active trial request(s). We allow up to 5 children per family. Please contact our office if you need assistance!");
    });

    it("should support flexible schedule sibling preference", async () => {
      const result = await service.submitTrialRequest({
        parentName: "Bob Smith",
        parentPhone: "4165557777",
        children: [
          { name: "Liam", age: 6 },
          { name: "Noah", age: 8 },
        ],
        siblingPreference: "flexible",
        preferredDates: ["2026-09-20"],
      });

      expect(result.success).toBe(true);
      const firstCall = prisma.trialRequest.create.mock.calls[0][0].data;
      expect(firstCall.notes).toContain("Flexible");
    });

    it("should allow empty preferredDates for Swim Team and tag with front office call inquiry", async () => {
      prisma.location.findUnique.mockResolvedValue({
        id: "loc_angus",
        name: "Angus Glen Community Centre (Swim Team)",
        slug: "angus-glen-swim-team",
      });

      const result = await service.submitTrialRequest({
        parentName: "Coach Parent",
        parentPhone: "(416) 555-4321",
        locationSlug: "angus-glen-swim-team",
        childName: "Fast Swimmer",
        childAge: 11,
        preferredDates: [],
        notes: "[Parent Notes: 5 years competitive experience]",
      });

      expect(result.success).toBe(true);
      expect(prisma.trialRequest.create).toHaveBeenCalledTimes(1);
      const callData = prisma.trialRequest.create.mock.calls[0][0].data;
      expect(callData.childName).toBe("Fast Swimmer");
      expect(callData.childAge).toBe(11);
      expect(callData.preferredDates).toEqual([]);
      expect(callData.notes).toContain("[Inquiry: Competitive Swim Team Interest — Front Office to Call]");
      expect(callData.notes).toContain("[Parent Notes: 5 years competitive experience]");
    });

    it("should throw BadRequestException if dates are missing or invalid for non-swim-team lessons", async () => {
      await expect(
        service.submitTrialRequest({
          parentName: "John Doe",
          parentPhone: "4165551234",
          childName: "Alex",
          childAge: 5,
          preferredDates: [],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.submitTrialRequest({
          parentName: "John Doe",
          parentPhone: "4165551234",
          childName: "Alex",
          childAge: 5,
          preferredDates: ["not-a-valid-date"],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException if any child swimmer is missing name or age", async () => {
      await expect(
        service.submitTrialRequest({
          parentName: "John Doe",
          parentPhone: "4165551234",
          children: [{ name: "", age: 5 }],
          preferredDates: ["2026-09-20"],
        }),
      ).rejects.toThrow("Each swimmer must have a valid name");

      await expect(
        service.submitTrialRequest({
          parentName: "John Doe",
          parentPhone: "4165551234",
          children: [{ name: "Valid Name", age: -1 }],
          preferredDates: ["2026-09-20"],
        }),
      ).rejects.toThrow("Each swimmer must have a valid age");
    });

    it("should preserve pre-formatted lead tags for adult swimmer requests without double-wrapping", async () => {
      const result = await service.submitTrialRequest({
        parentName: "Jane Adult",
        parentPhone: "4165558888",
        childName: "Jane Adult",
        childAge: 30,
        preferredDates: ["2026-09-20"],
        notes: "[Adult Trial]\n[Goal: Learn Freestyle Breathing]\n[Parent Notes: Comfortable in shallow end]",
      });

      expect(result.success).toBe(true);
      const callData = prisma.trialRequest.create.mock.calls[0][0].data;
      expect(callData.notes).toContain("[Adult Trial]");
      expect(callData.notes).toContain("[Goal: Learn Freestyle Breathing]");
      expect(callData.notes).toContain("[Parent Notes: Comfortable in shallow end]");
      expect(callData.notes).not.toContain("[Parent Notes: [Adult Trial]");
    });
  });

  describe("getAvailableTrialDates", () => {
    it("should filter sessions by locationSlug", async () => {
      prisma.location.findUnique.mockResolvedValue({
        id: "loc_markham",
        slug: "markham",
      });
      prisma.classSession.findMany.mockResolvedValue([
        { date: new Date("2026-10-01T10:00:00Z") },
      ]);

      const dates = await service.getAvailableTrialDates({
        locationSlug: "markham",
      });

      expect(prisma.location.findUnique).toHaveBeenCalledWith({
        where: { slug: "markham" },
        select: { id: true },
      });
      expect(prisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            offering: {
              type: "regular",
              term: { locationId: "loc_markham" },
            },
          }),
        }),
      );
      expect(dates).toEqual([
        { date: "2026-10-01", dayOfWeek: "Thursday" },
      ]);
    });

    it("should filter sessions by locationId directly without lookup", async () => {
      prisma.classSession.findMany.mockResolvedValue([
        { date: new Date("2026-10-05T14:00:00Z") },
      ]);

      const dates = await service.getAvailableTrialDates({
        locationId: "loc_direct",
      });

      expect(prisma.location.findUnique).not.toHaveBeenCalled();
      expect(prisma.classSession.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            offering: {
              type: "regular",
              term: { locationId: "loc_direct" },
            },
          }),
        }),
      );
      expect(dates).toEqual([
        { date: "2026-10-05", dayOfWeek: "Monday" },
      ]);
    });

    it("should return empty array when locationSlug does not exist", async () => {
      prisma.location.findUnique.mockResolvedValue(null);

      const dates = await service.getAvailableTrialDates({
        locationSlug: "nonexistent",
      });

      expect(dates).toEqual([]);
      expect(prisma.classSession.findMany).not.toHaveBeenCalled();
    });

    it("should throw BadRequestException when neither locationId nor locationSlug is provided", async () => {
      await expect(service.getAvailableTrialDates({} as any)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
