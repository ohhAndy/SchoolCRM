import { HttpAdapterHost, NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import helmet from "helmet";
import compression from "compression";
import { PrismaClientExceptionFilter } from "./common/filters/prisma-client-exception.filter";
import { ZodValidationPipe } from "nestjs-zod";
import { json, urlencoded } from "express";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 50mb body size limit for base64 report card PDFs and email attachments
  app.use(json({ limit: "50mb" }));
  app.use(urlencoded({ extended: true, limit: "50mb" }));

  // Trust reverse proxy (Cloudflare, Vercel, Nginx, ALB) for accurate client IP resolution & rate limiting
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set("trust proxy", 1);

  const httpAdapter = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));
  app.useGlobalPipes(new ZodValidationPipe());

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
      : ["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    credentials: true,
  });
  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3001);
}
bootstrap();
