import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { TrialRequestsService } from "./trial-requests.service";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { RolesGuard } from "../auth/roles.guard";
import { Roles } from "../auth/roles.decorator";
import { CurrentStaffUser } from "../auth/current-user.decorator";
import { RequestStaffUser } from "../auth/auth.types";
import { TrialRequestQueryDto } from "./dto/trial-request-query.dto";
import {
  UpdateTrialRequestStatusDto,
  UpdateTrialRequestNotesDto,
} from "./dto/update-trial-request.dto";
import { BookTrialRequestDto } from "./dto/book-trial-request.dto";

@Controller("trial-requests")
@UseGuards(SupabaseAuthGuard, RolesGuard)
// TODO: Expand access to 'manager' role in a future release when branch managers coordinate trials
@Roles("super_admin", "admin")
export class TrialRequestsController {
  constructor(private readonly service: TrialRequestsService) {}

  @Get()
  async findAll(@Query() query: TrialRequestQueryDto) {
    return this.service.findAll(query);
  }

  @Get("stats")
  async getStats() {
    return this.service.getStats();
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.service.findOne(id);
  }

  @Patch(":id/status")
  async updateStatus(
    @Param("id") id: string,
    @Body() body: UpdateTrialRequestStatusDto,
    @CurrentStaffUser() staffUser: RequestStaffUser,
  ) {
    return this.service.updateStatus(id, body.status, staffUser);
  }

  @Patch(":id/notes")
  async updateNotes(
    @Param("id") id: string,
    @Body() body: UpdateTrialRequestNotesDto,
    @CurrentStaffUser() staffUser: RequestStaffUser,
  ) {
    return this.service.updateNotes(id, body.notes, staffUser);
  }

  @Post(":id/book")
  async bookSession(
    @Param("id") id: string,
    @Body() body: BookTrialRequestDto,
    @CurrentStaffUser() staffUser: RequestStaffUser,
  ) {
    return this.service.bookSession(id, body, staffUser);
  }

  @Delete(":id")
  async delete(
    @Param("id") id: string,
    @CurrentStaffUser() staffUser: RequestStaffUser,
  ) {
    return this.service.delete(id, staffUser);
  }
}
