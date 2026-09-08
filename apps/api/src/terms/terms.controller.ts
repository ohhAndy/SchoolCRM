import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Body,
  Post,
  UseGuards,
  Query,
  NotFoundException,
} from "@nestjs/common";
import { TermsService } from "./terms.service";
import { TermScheduleService } from "./term-schedule.service";
import { TermAvailabilityService } from "./term-availability.service";
import type { SlotPage, Term } from "@school/shared-types";
import { CreateTermSchema } from "./dto/create-term.dto";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentStaffUser } from "../auth/current-user.decorator";
import { CurrentLocationId } from "../auth/current-location.decorator";
import { RequestStaffUser } from "../auth/auth.types";

@Controller("terms")
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class TermsController {
  constructor(
    private readonly termsService: TermsService,
    private readonly termScheduleService: TermScheduleService,
    private readonly termAvailabilityService: TermAvailabilityService,
  ) {}

  @Post()
  @Roles("super_admin", "admin")
  async create(
    @Body() body: unknown,
    @CurrentStaffUser() staffUser: RequestStaffUser,
    @CurrentLocationId() locationId?: string,
  ) {
    const input = CreateTermSchema.parse(body);
    return await this.termsService.createTermWithSchedule(
      input,
      staffUser,
      locationId,
    );
  }

  @Get("all")
  async getAllTerms(@CurrentLocationId() locationId?: string): Promise<Term[]> {
    return this.termsService.getAllTerms(locationId);
  }

  @Get(":termId")
  async getTermTitle(@Param("termId") termId: string): Promise<string> {
    const title = await this.termsService.getTermTitle(termId);
    if (!title) {
      throw new NotFoundException(`Term with ID ${termId} not found`);
    }
    return title;
  }

  @Get(":termId/schedule/weekday/:weekday/slots")
  async getTimeSlotsForWeekday(
    @Param("termId") termId: string,
    @Param("weekday") weekday: string,
  ): Promise<string[]> {
    return this.termsService.getSlotsForWeekday(termId, Number(weekday));
  }

  @Get(":termId/schedule/weekday/:weekday/slots-detailed")
  async getDetailedTimeSlotsForWeekday(
    @Param("termId") termId: string,
    @Param("weekday") weekday: string,
  ) {
    return this.termsService.getDetailedSlotsForWeekday(
      termId,
      Number(weekday),
    );
  }

  @Get(":termId/schedule/weekday/:weekday/slots-default")
  async getDefaultTimeSlots(
    @Param("termId") termId: string,
  ): Promise<(string | null)[]> {
    return this.termsService.getDefaultSlots(termId);
  }

  @Get(":termId/schedule/weekday/:weekday/slot/:start/:end")
  async getSlotPage(
    @Param("termId") termId: string,
    @Param("weekday", ParseIntPipe) weekday: number,
    @Param("start") start: string,
    @Param("end") end: string,
  ): Promise<SlotPage> {
    return this.termScheduleService.slotByWeekdayAndTime(
      weekday,
      termId,
      start,
      end,
    );
  }

  @Get("schedule/date/:date")
  async getDailySchedule(
    @Param("date") date: string,
    @Query("locationId") queryLocationId?: string,
    @CurrentLocationId() locationId?: string,
  ) {
    return this.termScheduleService.getDailySchedule(
      queryLocationId || locationId || null,
      date,
    );
  }

  @Get(":termId/availability")
  async getTermAvailability(
    @Param("termId") termId: string,
    @Query("level") level?: string,
    @Query("weekday") weekday?: string,
  ) {
    const wd = weekday ? Number(weekday) : undefined;
    return this.termAvailabilityService.getTermAvailability(termId, level, wd);
  }

  @Get(":termId/flexible-schedule")
  async getFlexibleSchedule(@Param("termId") termId: string) {
    return this.termScheduleService.getFlexibleSlotPage(termId);
  }
}
