import { Controller, Get, Post, Body, Req, Ip, Query } from "@nestjs/common";
import { PublicService } from "./public.service";
import { Public } from "../auth/public.decorator";
import { Throttle } from "@nestjs/throttler";
import { Request } from "express";
import {
  SubmitTrialRequestDto,
  GetTrialDatesQueryDto,
} from "./dto/trial-request.dto";

function getClientIp(req: Request, nestIp?: string): string | undefined {
  // 1. Cloudflare header
  const cfIp = req.headers["cf-connecting-ip"] as string | undefined;
  if (cfIp) return cfIp.trim();

  // 2. Standard X-Forwarded-For (client IP is the first in the chain)
  const forwarded = req.headers["x-forwarded-for"] as string | undefined;
  if (forwarded) {
    const client = forwarded.split(",")[0]?.trim();
    if (client) return client;
  }

  // 3. Nginx / reverse proxy X-Real-IP header
  const realIp = req.headers["x-real-ip"] as string | undefined;
  if (realIp) return realIp.trim();

  // 4. Fallback to NestJS / Express resolved IP or socket remoteAddress
  return nestIp || req.ip || req.socket?.remoteAddress || undefined;
}

@Controller("public")
@Public()
export class PublicController {
  constructor(private readonly publicService: PublicService) {}

  /**
   * GET /public/trial-dates
   * Returns available trial dates for the next 30 days, optionally filtered by location.
   * No auth required.
   */
  @Get("trial-dates")
  async getTrialDates(@Query() query: GetTrialDatesQueryDto) {
    return this.publicService.getAvailableTrialDates(query);
  }

  /**
   * POST /public/trial-requests
   * Submit a trial class request. Rate-limited.
   * No auth required.
   */
  @Post("trial-requests")
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute per IP
  async submitTrialRequest(
    @Body() body: SubmitTrialRequestDto,
    @Ip() ip: string,
    @Req() req: Request,
  ) {
    return this.publicService.submitTrialRequest({
      ...body,
      ipAddress: getClientIp(req, ip),
    });
  }

  /**
   * GET /public/locations
   * Returns list of public locations for trial booking & contact.
   */
  @Get("locations")
  async getLocations() {
    return this.publicService.getLocations();
  }

  /**
   * GET /public/programs
   * Returns public program/level information.
   * No auth required.
   */
  @Get("programs")
  async getPrograms() {
    return this.publicService.getPrograms();
  }
}
