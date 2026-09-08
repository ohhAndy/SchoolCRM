import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { createTestApp } from "./utils/test-setup";
import { seedAdmin, seedTerm, seedClassOffering } from "./utils/seeds";

describe("TrialRequestsController (e2e)", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let testAdminAuthId = "test-admin";
  let testManagerAuthId = "test-manager";
  let testSessionId: string;
  let testRequestId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
  });

  beforeEach(async () => {
    // Seed staff users
    await seedAdmin(prisma, testAdminAuthId, "admin@test.com");

    await prisma.staffUser.create({
      data: {
        authId: testManagerAuthId,
        email: "manager@test.com",
        role: "manager",
        fullName: "Test Manager",
        active: true,
      },
    });

    const term = await seedTerm(prisma);
    const offering = await seedClassOffering(prisma, term.id);

    const session = await prisma.classSession.create({
      data: {
        offeringId: offering.id,
        date: new Date(),
        status: "scheduled",
      },
    });
    testSessionId = session.id;

    const trialRequest = await prisma.trialRequest.create({
      data: {
        parentName: "John Parent",
        parentPhone: "4165551234",
        parentEmail: "john@example.com",
        childName: "Billy Parent",
        childAge: 6,
        preferredDates: [new Date().toISOString().split("T")[0]],
        notes: "[Skill Level: Beginner] [Time Preference: Morning]",
        status: "pending",
      },
    });
    testRequestId = trialRequest.id;
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    await app.close();
  });

  describe("GET /trial-requests", () => {
    it("should allow admin access and return trial requests", async () => {
      const response = await request(app.getHttpServer())
        .get("/trial-requests")
        .set("x-mock-auth-id", testAdminAuthId)
        .expect(200);

      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("pagination");
      expect(response.body).toHaveProperty("counts");
      expect(Array.isArray(response.body.items)).toBe(true);
      expect(response.body.items.length).toBeGreaterThanOrEqual(1);
    });

    it("should forbid access to non-admin users (e.g. manager)", async () => {
      await request(app.getHttpServer())
        .get("/trial-requests")
        .set("x-mock-auth-id", testManagerAuthId)
        .expect(403);
    });
  });

  describe("GET /trial-requests/stats", () => {
    it("should return trial request stats for admin", async () => {
      const response = await request(app.getHttpServer())
        .get("/trial-requests/stats")
        .set("x-mock-auth-id", testAdminAuthId)
        .expect(200);

      expect(response.body).toHaveProperty("pending");
      expect(response.body).toHaveProperty("approved");
      expect(response.body).toHaveProperty("total");
    });
  });

  describe("PATCH /trial-requests/:id/status", () => {
    it("should update trial request status", async () => {
      const response = await request(app.getHttpServer())
        .patch(`/trial-requests/${testRequestId}/status`)
        .set("x-mock-auth-id", testAdminAuthId)
        .send({ status: "approved" })
        .expect(200);

      expect(response.body.status).toBe("approved");
    });
  });

  describe("POST /trial-requests/:id/book", () => {
    it("should assign session, create trial booking, and approve request", async () => {
      const response = await request(app.getHttpServer())
        .post(`/trial-requests/${testRequestId}/book`)
        .set("x-mock-auth-id", testAdminAuthId)
        .send({
          classSessionId: testSessionId,
          classRatio: "3:1",
          notes: "Confirmed on phone with parent",
        })
        .expect(201);

      expect(response.body).toHaveProperty("trialBooking");
      expect(response.body).toHaveProperty("trialRequest");
      expect(response.body.trialBooking.childName).toBe("Billy Parent");
      expect(response.body.trialRequest.status).toBe("approved");

      // Verify in DB
      const bookingInDb = await prisma.trialBooking.findUnique({
        where: { id: response.body.trialBooking.id },
      });
      expect(bookingInDb).not.toBeNull();
      expect(bookingInDb?.classSessionId).toBe(testSessionId);
    });
  });
});
