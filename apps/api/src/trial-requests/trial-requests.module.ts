import { Module } from "@nestjs/common";
import { TrialRequestsController } from "./trial-requests.controller";
import { TrialRequestsService } from "./trial-requests.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";

@Module({
  imports: [PrismaModule, AuditLogsModule],
  controllers: [TrialRequestsController],
  providers: [TrialRequestsService],
  exports: [TrialRequestsService],
})
export class TrialRequestsModule {}
