import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { randomUUID } from "crypto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  /**
   * Returns distinct dates (next 30 days) that have at least one
   * class session with available capacity for trials for a specific location.
   */
  async getAvailableTrialDates(query: {
    locationId?: string;
    locationSlug?: string;
  }) {
    if (!query?.locationId?.trim() && !query?.locationSlug?.trim()) {
      throw new BadRequestException(
        "A location (locationSlug or locationId) is required to view trial dates",
      );
    }

    const now = new Date();
    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    // Resolve location ID
    let resolvedLocationId = query.locationId?.trim();
    if (!resolvedLocationId && query.locationSlug) {
      const loc = await this.prisma.location.findUnique({
        where: { slug: query.locationSlug.trim() },
        select: { id: true },
      });
      if (loc) {
        resolvedLocationId = loc.id;
      } else {
        // Non-existent location slug requested
        return [];
      }
    }

    // Find all sessions in the window that are scheduled (not cancelled)
    const sessions = await this.prisma.classSession.findMany({
      where: {
        date: {
          gte: now,
          lte: thirtyDaysOut,
        },
        status: "scheduled",
        offering: {
          type: "regular", // No trials for flexible courses
          term: {
            locationId: resolvedLocationId,
          },
        },
      },
      select: {
        date: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Deduplicate by date string (multiple sessions on the same day → one date)
    const uniqueDates = [
      ...new Set(sessions.map((s) => s.date.toISOString().split("T")[0])),
    ];

    return uniqueDates.map((dateStr) => {
      const d = new Date(dateStr + "T00:00:00Z");
      return {
        date: dateStr,
        dayOfWeek: d.toLocaleDateString("en-US", {
          weekday: "long",
          timeZone: "UTC",
        }),
      };
    });
  }

  /**
   * Submit a public trial request.
   * Rate-limited by phone number (max 3 pending per phone).
   */
  async submitTrialRequest(data: {
    parentName: string;
    parentPhone: string;
    parentEmail?: string;
    childName?: string;
    childAge?: number;
    children?: Array<{ name: string; age: number; skillLevel?: string }>;
    siblingPreference?: "simultaneous" | "flexible";
    timePreference?: string;
    timePreferences?: string[];
    preferredDates: string[];
    locationId?: string;
    locationSlug?: string;
    notes?: string;
    cookieId?: string;
    ipAddress?: string;
  }) {
    // Validate inputs
    if (!data.parentName || data.parentName.trim().length < 2) {
      throw new BadRequestException("Name is required");
    }

    const phoneDigits = data.parentPhone
      ? data.parentPhone.replace(/\D/g, "")
      : "";
    if (
      !(
        phoneDigits.length === 10 ||
        (phoneDigits.length === 11 && phoneDigits.startsWith("1"))
      )
    ) {
      throw new BadRequestException(
        "Valid 10-digit North American phone number is required",
      );
    }

    // Determine swimmers list (multi-child or legacy single child)
    const swimmers: Array<{ name: string; age: number; skillLevel?: string }> =
      data.children && data.children.length > 0
        ? data.children
        : data.childName && data.childAge !== undefined
          ? [{ name: data.childName.trim(), age: data.childAge }]
          : [];

    if (swimmers.length === 0) {
      throw new BadRequestException("At least one swimmer is required");
    }

    for (const swimmer of swimmers) {
      if (!swimmer.name || swimmer.name.trim().length < 2) {
        throw new BadRequestException("Each swimmer must have a valid name");
      }
      if (swimmer.age < 0 || swimmer.age > 120) {
        throw new BadRequestException("Each swimmer must have a valid age");
      }
    }

    // Resolve location
    let resolvedLocationId = data.locationId || null;
    let resolvedLocationName = "";

    if (!resolvedLocationId && data.locationSlug) {
      const loc = await this.prisma.location.findUnique({
        where: { slug: data.locationSlug },
      });
      if (loc) {
        resolvedLocationId = loc.id;
        resolvedLocationName = loc.name;
      }
    } else if (resolvedLocationId) {
      const loc = await this.prisma.location.findUnique({
        where: { id: resolvedLocationId },
      });
      if (loc) {
        resolvedLocationName = loc.name;
      }
    }

    const isSwimTeam =
      data.locationSlug?.toLowerCase().includes("angus") ||
      data.locationSlug?.toLowerCase().includes("swim-team") ||
      resolvedLocationName.toLowerCase().includes("swim team");

    // Regular lessons require selecting preferred dates; Swim Team interest requests do not require dates
    if (!isSwimTeam) {
      if (
        !data.preferredDates ||
        data.preferredDates.length === 0 ||
        data.preferredDates.length > 5
      ) {
        throw new BadRequestException("Select between 1 and 5 preferred dates");
      }
    }

    // Validate date strings if provided
    if (data.preferredDates && data.preferredDates.length > 0) {
      for (const dateStr of data.preferredDates) {
        const parsed = new Date(dateStr);
        if (isNaN(parsed.getTime())) {
          throw new BadRequestException(`Invalid date: ${dateStr}`);
        }
      }
    }

    // Phone dedup: max 5 pending requests per phone number
    const normalizedPhone = data.parentPhone.replace(/\D/g, "");
    const pendingCount = await this.prisma.trialRequest.count({
      where: {
        parentPhone: normalizedPhone,
        status: "pending",
      },
    });

    if (pendingCount >= 5 || pendingCount + swimmers.length > 5) {
      throw new HttpException(
        pendingCount >= 5
          ? "You have reached the maximum limit of 5 active trial requests for this phone number. Our team will be in touch soon! If you have questions or need assistance, please contact our office."
          : `You already have ${pendingCount} active trial request(s). We allow up to 5 children per family. Please contact our office if you need assistance!`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Prepare location tag for notes
    const locationTag = resolvedLocationName
      ? `[Location: ${resolvedLocationName}]`
      : "";

    // Sibling metadata if multiple kids
    const isMultiChild = swimmers.length > 1;
    const prefLabel =
      data.siblingPreference === "flexible"
        ? "Flexible"
        : "Same Time";

    const cleanSkill = (level?: string) => {
      if (!level) return "";
      return level.replace(/\s*\([^)]*\)/g, "").trim();
    };

    const siblingSummary = swimmers
      .map(
        (s) =>
          `${s.name} (age ${s.age}${s.skillLevel ? `, ${cleanSkill(s.skillLevel)}` : ""})`,
      )
      .join(" & ");

    // Ensure every request session has a persistent tracking cookieId in DB
    const trackingCookieId = data.cookieId?.trim() || `trk_${randomUUID()}`;

    // Create records within a transaction
    await this.prisma.$transaction(
      swimmers.map((swimmer, idx) => {
        const notesParts: string[] = [];

        if (locationTag) {
          notesParts.push(locationTag);
        }

        if (isSwimTeam) {
          notesParts.push("[Inquiry: Competitive Swim Team Interest — Front Office to Call]");
        }

        if (isMultiChild) {
          notesParts.push(
            `[Sibling Trial ${idx + 1} of ${swimmers.length}: ${siblingSummary}]`,
          );
          notesParts.push(`[Timing Preference: ${prefLabel}]`);
        }

        if (swimmer.skillLevel) {
          notesParts.push(`[Skill Level: ${cleanSkill(swimmer.skillLevel)}]`);
        }

        const timeLabels: Record<string, string> = {
          weekday_early: "3:30 PM – 5:30 PM",
          weekday_late: "5:30 PM – 8:00 PM",
          weekend_morning: "9:00 AM – 12:00 PM",
          weekend_afternoon: "12:00 PM – 3:30 PM",
          morning: "9:00 AM – 12:00 PM",
          afternoon: "12:00 PM – 4:00 PM",
          evening: "4:00 PM – 8:00 PM",
          flexible: "Flexible",
        };

        const activePrefs: string[] =
          data.timePreferences && data.timePreferences.length > 0
            ? data.timePreferences
            : data.timePreference
              ? [data.timePreference]
              : [];

        if (activePrefs.length > 0) {
          const formatted = activePrefs
            .map((p) => timeLabels[p] || p)
            .join(", ");
          notesParts.push(`[Time Preference: ${formatted}]`);
        }

        if (data.notes?.trim()) {
          const clean = data.notes.trim();
          if (clean.startsWith("[")) {
            notesParts.push(clean);
          } else {
            notesParts.push(
              clean.toLowerCase().startsWith("[parent note")
                ? clean
                : `[Parent Notes: ${clean}]`,
            );
          }
        }

        return this.prisma.trialRequest.create({
          data: {
            parentName: data.parentName.trim(),
            parentPhone: normalizedPhone,
            parentEmail: data.parentEmail?.trim() || null,
            childName: swimmer.name.trim(),
            childAge: swimmer.age,
            preferredDates: data.preferredDates,
            locationId: resolvedLocationId,
            notes: notesParts.join("\n") || null,
            cookieId: trackingCookieId,
            ipAddress: data.ipAddress || null,
          },
        });
      }),
    );

    return {
      success: true,
      message:
        "Your trial request has been submitted! We'll be in touch as soon as possible.",
      cookieId: trackingCookieId,
    };
  }

  /**
   * Returns list of public locations for trial booking & contact.
   */
  async getLocations() {
    return this.prisma.location.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        address: true,
      },
    });
  }

  /**
   * Returns public-safe program/level information.
   */
  async getPrograms() {
    const levels = await this.prisma.level.findMany({
      orderBy: { order: "asc" },
      select: {
        name: true,
        description: true,
        category: true,
        color: true,
        order: true,
      },
    });

    return levels;
  }
}
