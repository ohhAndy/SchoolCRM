import { Test, TestingModule } from "@nestjs/testing";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";
import { Request } from "express";

describe("PublicController", () => {
  let controller: PublicController;
  let service: {
    getAvailableTrialDates: jest.Mock;
    submitTrialRequest: jest.Mock;
    getPublicLocations: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      getAvailableTrialDates: jest.fn().mockResolvedValue([]),
      submitTrialRequest: jest.fn().mockResolvedValue({ success: true }),
      getPublicLocations: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicController],
      providers: [{ provide: PublicService, useValue: service }],
    }).compile();

    controller = module.get<PublicController>(PublicController);
  });

  describe("submitTrialRequest", () => {
    it("should prioritize Cloudflare cf-connecting-ip header", async () => {
      const mockReq = {
        headers: {
          "cf-connecting-ip": "1.1.1.1",
          "x-forwarded-for": "2.2.2.2, 3.3.3.3",
        },
      } as unknown as Request;

      await controller.submitTrialRequest(
        {
          parentName: "John",
          parentPhone: "4165551234",
          childName: "Alex",
          childAge: 6,
          preferredDates: ["2026-10-01"],
        },
        "4.4.4.4",
        mockReq,
      );

      expect(service.submitTrialRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: "1.1.1.1" }),
      );
    });

    it("should parse first IP from x-forwarded-for header", async () => {
      const mockReq = {
        headers: {
          "x-forwarded-for": "203.0.113.195, 10.0.0.1",
        },
      } as unknown as Request;

      await controller.submitTrialRequest(
        {
          parentName: "John",
          parentPhone: "4165551234",
          childName: "Alex",
          childAge: 6,
          preferredDates: ["2026-10-01"],
        },
        "10.0.0.1",
        mockReq,
      );

      expect(service.submitTrialRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: "203.0.113.195" }),
      );
    });

    it("should fallback to nestIp or req.ip when headers are absent", async () => {
      const mockReq = {
        headers: {},
        ip: "127.0.0.1",
      } as unknown as Request;

      await controller.submitTrialRequest(
        {
          parentName: "John",
          parentPhone: "4165551234",
          childName: "Alex",
          childAge: 6,
          preferredDates: ["2026-10-01"],
        },
        "192.168.1.50",
        mockReq,
      );

      expect(service.submitTrialRequest).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: "192.168.1.50" }),
      );
    });
  });

  describe("getTrialDates", () => {
    it("should delegate query with location parameters to publicService", async () => {
      await controller.getTrialDates({ locationSlug: "markham" });
      expect(service.getAvailableTrialDates).toHaveBeenCalledWith({
        locationSlug: "markham",
      });
    });
  });
});
