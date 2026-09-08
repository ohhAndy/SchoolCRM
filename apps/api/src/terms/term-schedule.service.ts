import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type {
  MakeupLite,
  RosterResponse,
  SlotPage,
  Term,
  TrialLite,
} from "@school/shared-types";
import { getRatioWeight } from "@school/shared-types";
import { formatTime } from "./terms.helpers";

@Injectable()
export class TermScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async slotByWeekdayAndTime(
    weekday: number,
    termId: string,
    startTime: string,
    endTime: string,
  ): Promise<SlotPage> {
    if (weekday < 0 || weekday > 6) {
      throw new BadRequestException("Not a real weekday");
    }

    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      throw new BadRequestException("Time is not HH:MM");
    }

    // Step 1: Get term and offerings in parallel
    const [term, offerings] = await Promise.all([
      this.prisma.term.findUnique({
        where: { id: termId },
        select: { id: true, name: true, startDate: true, locationId: true },
      }),
      this.prisma.classOffering.findMany({
        where: { weekday, startTime, endTime, termId },
        select: {
          id: true,
          capacity: true,
          title: true,
        },
      }),
    ]);

    if (!term) {
      throw new NotFoundException("Term Does Not Exist");
    }

    const termMeta: Term = {
      id: term.id.toString(),
      name: term.name,
    };

    return this.buildSlotPageFromOfferings(offerings, termMeta, {
      weekday,
      startTime,
      endTime,
      term: termMeta,
    });
  }

  private async buildSlotPageFromOfferings(
    offerings: { id: string; capacity: number; title: string }[],
    termMeta: Term,
    meta: SlotPage["meta"],
  ): Promise<SlotPage> {
    if (offerings.length === 0) {
      return {
        meta,
        days: [],
      };
    }

    const offeringIds = offerings.map((o) => o.id);
    const capacityMap = new Map(offerings.map((o) => [o.id, o.capacity]));

    // Step 2: Get sessions
    const sessions = await this.prisma.classSession.findMany({
      where: { offeringId: { in: offeringIds } },
      select: {
        id: true,
        date: true,
        offeringId: true,
        status: true,
        offering: {
          select: {
            title: true,
            notes: true,
            instructors: {
              where: { removedAt: null },
              select: {
                id: true,
                staffUserId: true,
                staffUser: {
                  select: {
                    fullName: true,
                  },
                },
                instructor: {
                  select: {
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { assignedAt: "asc" },
            },
          },
        },
      },
      orderBy: { date: "asc" },
    });

    if (sessions.length === 0) {
      return {
        meta,
        days: [],
      };
    }

    const sessionIds = sessions.map((s) => s.id);

    // Build session maps
    const sessionsByDate = new Map<string, typeof sessions>();
    for (const s of sessions) {
      const date = s.date.toISOString().slice(0, 10);
      const arr = sessionsByDate.get(date) ?? [];
      arr.push(s);
      sessionsByDate.set(date, arr);
    }

    // Step 3: Get enrollments first to get enrollment IDs
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        offeringId: { in: offeringIds },
        status: { in: ["active", "inactive"] },
      },
      select: {
        id: true,
        offeringId: true,
        studentId: true,
        classRatio: true,
        reportCardStatus: true,
        status: true,
        invoiceLineItem: {
          select: {
            invoice: {
              select: {
                id: true,
                invoiceNumber: true,
                status: true,
                totalAmount: true,
                payments: true,
              },
            },
          },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            shortCode: true,
            level: true,
            levelId: true,
            levelModel: { select: { id: true, name: true, category: true } },
            birthdate: true,
            notes: true,
          },
        },
      },
    });

    const enrollmentsByOffering = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const arr = enrollmentsByOffering.get(e.offeringId) ?? [];
      arr.push(e);
      enrollmentsByOffering.set(e.offeringId, arr);
    }

    const enrollmentIds = enrollments.map((e) => e.id);

    // Step 4: Fetch all remaining data IN PARALLEL
    const [
      attendanceRecords,
      skipRecords,
      makeUpBookings,
      trialBookings,
      nextTerm,
    ] = await Promise.all([
      // Query: Get attendance records
      this.prisma.attendance.findMany({
        where: {
          enrollmentId: { in: enrollmentIds },
          classSessionId: { in: sessionIds },
        },
        select: {
          id: true,
          enrollmentId: true,
          classSessionId: true,
          status: true,
          notes: true,
        },
      }),

      // Query: Get enrollment skips
      this.prisma.enrollmentSkip.findMany({
        where: {
          enrollmentId: { in: enrollmentIds },
          classSessionId: { in: sessionIds },
        },
        select: {
          enrollmentId: true,
          classSessionId: true,
        },
      }),

      // Query: Get make-up bookings
      this.prisma.makeUpBooking.findMany({
        where: { classSessionId: { in: sessionIds } },
        select: {
          id: true,
          classSessionId: true,
          studentId: true,
          status: true,
          classRatio: true,
          student: {
            select: {
              firstName: true,
              lastName: true,
              level: true,
              levelId: true,
              levelModel: { select: { id: true, name: true, category: true } },
              shortCode: true,
              birthdate: true,
            },
          },
        },
      }),

      // Query: Get trial bookings
      this.prisma.trialBooking.findMany({
        where: { classSessionId: { in: sessionIds } },
        select: {
          id: true,
          classSessionId: true,
          childName: true,
          childAge: true,
          parentPhone: true,
          status: true,
          classRatio: true,
          notes: true,
        },
      }),

      // Query: Next Term IDs
      (async () => {
        const queryTermId = termMeta.id;
        const currentTerm = await this.prisma.term.findUnique({
          where: { id: queryTermId },
          select: { startDate: true, locationId: true },
        });

        if (!currentTerm) return [];

        // Find all future terms containing regular offerings (Local OR Global)
        const futureTerms = await this.prisma.term.findMany({
          where: {
            startDate: { gt: currentTerm.startDate },
            OR: [
              { locationId: currentTerm.locationId },
              { locationId: null }, // Include global terms
            ],
            offerings: {
              some: {
                type: "regular",
              },
            },
          },
          orderBy: { startDate: "asc" },
          select: { id: true, startDate: true },
        });

        if (futureTerms.length === 0) return [];

        // Group by Date (YYYY-MM-DD) to handle time variances or exact matches
        const firstDateStr = futureTerms[0].startDate
          .toISOString()
          .slice(0, 10);

        // Filter terms that start on the same day as the first future term
        const nextTermIds = futureTerms
          .filter(
            (t) => t.startDate.toISOString().slice(0, 10) === firstDateStr,
          )
          .map((t) => t.id);

        return nextTermIds.map((id) => ({ id })); // return consistent structure
      })(),
    ]);

    // Fetch Next Term Enrollments
    const nextTermIds = nextTerm.map((t: { id: string }) => t.id);

    const studentIds = enrollments
      .map((e) => e.studentId)
      .filter((id): id is string => !!id);

    const nextTermEnrollments =
      nextTermIds.length > 0
        ? await this.prisma.enrollment.findMany({
            where: {
              offering: {
                termId: { in: nextTermIds },
                type: "regular",
              },
              studentId: { in: studentIds },
              status: "active",
            },
            select: {
              studentId: true,
              invoiceLineItem: {
                select: {
                  invoice: { select: { status: true } },
                },
              },
            },
          })
        : [];

    // Build maps

    // Build attendance map and excused count map
    const attendanceMap = new Map<
      string,
      Map<string, (typeof attendanceRecords)[0]>
    >();
    const excusedMap = new Map<string, number>();

    for (const a of attendanceRecords) {
      if (!attendanceMap.has(a.enrollmentId)) {
        attendanceMap.set(a.enrollmentId, new Map());
      }
      attendanceMap.get(a.enrollmentId)!.set(a.classSessionId, a);

      if (a.status === "excused") {
        excusedMap.set(
          a.classSessionId,
          (excusedMap.get(a.classSessionId) || 0) + 1,
        );
      }
    }

    // Build skip map and skip count map
    const skipMap = new Map<string, Set<string>>();
    const skipCountMap = new Map<string, number>();

    for (const skip of skipRecords) {
      if (!skipMap.has(skip.enrollmentId)) {
        skipMap.set(skip.enrollmentId, new Set());
      }
      skipMap.get(skip.enrollmentId)!.add(skip.classSessionId);

      skipCountMap.set(
        skip.classSessionId,
        (skipCountMap.get(skip.classSessionId) || 0) + 1,
      );
    }

    // Build makeup map and count map
    const makeUpsBySession = new Map<string, typeof makeUpBookings>();
    const makeupCountMap = new Map<string, number>();

    for (const m of makeUpBookings) {
      const arr = makeUpsBySession.get(m.classSessionId) ?? [];
      arr.push(m);
      makeUpsBySession.set(m.classSessionId, arr);

      makeupCountMap.set(
        m.classSessionId,
        (makeupCountMap.get(m.classSessionId) || 0) + 1,
      );
    }

    // Build trial map and count map
    const trialsBySession = new Map<string, typeof trialBookings>();
    const trialCountMap = new Map<string, number>();

    for (const t of trialBookings) {
      const arr = trialsBySession.get(t.classSessionId) ?? [];
      arr.push(t);
      trialsBySession.set(t.classSessionId, arr);

      if (t.status === "scheduled" || t.status === "attended") {
        trialCountMap.set(
          t.classSessionId,
          (trialCountMap.get(t.classSessionId) || 0) + 1,
        );
      }
    }

    // Build response
    const days = Array.from(sessionsByDate.entries())
      .sort()
      .map(([date, sessionList]) => {
        const rosters: RosterResponse[] = sessionList.map((s) => {
          const offeringEnrollments =
            enrollmentsByOffering.get(s.offeringId) ?? [];

          const instructorCount = s.offering.instructors.length;
          const capacity = capacityMap.get(s.offeringId) ?? 0;
          // Correct approach: Sum weights of PRESENT students.
          // PRESENT = All Active Enrollments MINUS Skipped/Excused Enrollments.

          // Map for next term enrollments for quick lookup
          const nextTermEnrollmentMap = new Map<
            string,
            (typeof nextTermEnrollments)[0]
          >();
          for (const nte of nextTermEnrollments) {
            nextTermEnrollmentMap.set(nte.studentId, nte);
          }

          let regularWeighted = 0;
          for (const enr of offeringEnrollments) {
            const isSkipped = skipMap.get(enr.id)?.has(s.id);
            const attendanceStatus = attendanceMap
              .get(enr.id)
              ?.get(s.id)?.status;
            const isExcused = attendanceStatus === "excused";
            const isAbsent = attendanceStatus === "absent";

            if (
              enr.status === "active" &&
              !isSkipped &&
              !isExcused &&
              !isAbsent
            ) {
              regularWeighted += getRatioWeight(enr.classRatio);
            }
          }

          // Makeups (Weighted & Status filtered)
          const sessionMakeUps = makeUpsBySession.get(s.id) ?? [];
          let makeupWeighted = 0;
          for (const m of sessionMakeUps) {
            if (["scheduled", "attended"].includes(m.status)) {
              makeupWeighted += getRatioWeight(m.classRatio);
            }
          }

          // Trials (Weighted & Status filtered)
          const sessionTrials = trialsBySession.get(s.id) ?? [];
          let trialsWeighted = 0;
          for (const t of sessionTrials) {
            if (["scheduled", "attended"].includes(t.status)) {
              trialsWeighted += getRatioWeight(t.classRatio);
            }
          }

          const totalFilled = regularWeighted + makeupWeighted + trialsWeighted;

          const dynamicMin = instructorCount >= 2 ? 5 : 0;
          const effectiveCapacity = Math.max(capacity, dynamicMin);
          const openSeats = Math.max(
            0,
            Math.floor(effectiveCapacity - totalFilled),
          );

          // Compatibility variables for return
          const finalCapacity = effectiveCapacity;
          const filled = totalFilled; // This is a number, possibly float.

          const makeUpsLite: MakeupLite[] = sessionMakeUps.map((m) => ({
            id: m.id,
            studentId: m.studentId,
            studentName: `${m.student.firstName} ${m.student.lastName}`,
            level: m.student.levelModel?.name ?? m.student.level,
            shortCode: m.student.shortCode,
            status: m.status,
            classRatio: m.classRatio,
            birthDate: m.student.birthdate?.toISOString() ?? null,
          }));

          const trialsLite: TrialLite[] = sessionTrials.map((t) => ({
            id: t.id,
            childName: t.childName,
            childAge: t.childAge,
            parentPhone: t.parentPhone,
            status: t.status,
            classRatio: t.classRatio,
            notes: t.notes,
          }));

          const rosterRows = offeringEnrollments.map((e) => {
            const studentSkips = skipMap.get(e.id) ?? new Set();
            const skippedSessionIds = Array.from(studentSkips);
            const studentAttendance = attendanceMap.get(e.id);
            const attendance = studentAttendance?.get(s.id);

            const paid = e.invoiceLineItem
              ? e.invoiceLineItem.invoice.payments.reduce((acc, payment) => {
                  return acc + Number(payment.amount);
                }, 0)
              : null;

            const balance = e.invoiceLineItem
              ? Number(e.invoiceLineItem.invoice.totalAmount) - paid
              : null;

            return {
              enrollmentId: e.id,
              paymentStatus: e.invoiceLineItem
                ? e.invoiceLineItem.invoice.status
                : null,
              balance,
              invoiceNumber: e.invoiceLineItem
                ? e.invoiceLineItem.invoice.invoiceNumber
                : null,
              classRatio: e.classRatio,
              reportCardStatus: e.reportCardStatus,
              nextTermStatus: (() => {
                const nextEnr = nextTermEnrollmentMap.get(e.student.id);
                if (!nextEnr) return "not_registered";
                return nextEnr.invoiceLineItem?.invoice.status === "paid"
                  ? "paid"
                  : "enrolled";
              })() as "not_registered" | "enrolled" | "paid",
              studentId: e.student.id,
              studentName: `${e.student.firstName} ${e.student.lastName}`,
              shortCode: e.student.shortCode,
              studentLevel: e.student.levelModel?.name ?? e.student.level,
              studentLevelId: e.student.levelId,
              studentBirthDate: e.student.birthdate?.toISOString() ?? null,
              skippedSessionIds,
              notes: e.student.notes,
              attendance: attendance
                ? {
                    id: attendance.id,
                    status: attendance.status,
                    notes: attendance.notes,
                  }
                : null,
              enrollmentStatus: e.status,
            };
          });

          return {
            session: {
              id: s.id,
              date: s.date.toISOString(),
              offeringId: s.offeringId,
              offeringTitle: s.offering.title,
              offeringNotes: s.offering.notes,
              instructors: s.offering.instructors.map((i) => ({
                id: i.id,
                staffUserId: i.staffUserId,
                staffName: i.instructor
                  ? `${i.instructor.firstName} ${i.instructor.lastName}`
                  : (i.staffUser?.fullName ?? "Unknown"),
              })),
            },
            roster: rosterRows,
            capacity: finalCapacity,
            filled,
            openSeats,
            status: s.status,
            makeups: makeUpsLite,
            trials: trialsLite,
          };
        });

        return { date: `${date}T04:00:00.000Z`, rosters };
      });

    return {
      meta,
      days,
    };
  }

  async getFlexibleSlotPage(termId: string): Promise<SlotPage> {
    const term = await this.prisma.term.findUnique({
      where: { id: termId },
      select: { id: true, name: true },
    });

    if (!term) {
      throw new NotFoundException("Term Does Not Exist");
    }

    const termMeta: Term = {
      id: term.id.toString(),
      name: term.name,
    };

    const offerings = await this.prisma.classOffering.findMany({
      where: { termId, type: "flexible" },
      select: {
        id: true,
        capacity: true,
        title: true,
      },
    });

    return this.buildSlotPageFromOfferings(offerings, termMeta, {
      weekday: -1,
      startTime: "",
      endTime: "",
      term: termMeta,
    });
  }

  async getDailySchedule(locationId: string | null, dateString: string) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      throw new BadRequestException("Invalid date format YYYY-MM-DD");
    }
    const targetDate = new Date(`${dateString}T04:00:00.000Z`);

    const offerings = await this.prisma.classOffering.findMany({
      where: {
        term: locationId
          ? {
              OR: [{ locationId }, { locationId: null }],
            }
          : undefined,
        sessions: { some: { date: targetDate } },
      },
      select: {
        id: true,
        termId: true,
        term: { select: { name: true } },
        title: true,
        type: true,
        startTime: true,
        endTime: true,
        capacity: true,
        notes: true,
        instructors: {
          where: { removedAt: null },
          select: {
            id: true,
            staffUserId: true,
            staffUser: { select: { fullName: true } },
            instructor: { select: { firstName: true, lastName: true } },
          },
          orderBy: { assignedAt: "asc" },
        },
      },
      orderBy: { startTime: "asc" },
    });

    if (offerings.length === 0) return { date: dateString, classes: [] };

    const offeringIds = offerings.map((o) => o.id);

    // Get exact sessions for this day
    const sessions = await this.prisma.classSession.findMany({
      where: {
        offeringId: { in: offeringIds },
        date: targetDate,
      },
      select: {
        id: true,
        offeringId: true,
        status: true,
        notes: true,
        startTime: true,
        endTime: true,
      },
    });

    if (sessions.length === 0) {
      return { date: dateString, classes: [] };
    }

    const sessionIds = sessions.map((s) => s.id);
    const sessionMap = new Map(sessions.map((s) => [s.offeringId, s]));

    // Get Enrollments (Students)
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        offeringId: { in: offeringIds },
        status: { in: ["active", "inactive"] },
      },
      select: {
        id: true,
        offeringId: true,
        studentId: true,
        classRatio: true,
        reportCardStatus: true,
        status: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            shortCode: true,
            level: true,
            levelId: true,
            levelModel: { select: { id: true, name: true, category: true } },
            birthdate: true,
            notes: true,
          },
        },
      },
    });

    const enrollmentIds = enrollments.map((e) => e.id);
    const enrollmentsByOffering = new Map<string, typeof enrollments>();
    for (const e of enrollments) {
      const arr = enrollmentsByOffering.get(e.offeringId) ?? [];
      arr.push(e);
      enrollmentsByOffering.set(e.offeringId, arr);
    }

    // Dynamic Data
    const [
      attendance,
      makeups,
      trials,
      skips,
      nextTermEnrollments,
      allOfferingSessions,
      allTermAttendance,
      allTermSkips,
    ] = await Promise.all([
      this.prisma.attendance.findMany({
        where: {
          classSessionId: { in: sessionIds },
          enrollmentId: { in: enrollmentIds },
        },
        select: { enrollmentId: true, status: true, id: true },
      }),
      this.prisma.makeUpBooking.findMany({
        where: { classSessionId: { in: sessionIds } },
        select: {
          id: true,
          classSessionId: true,
          status: true,
          classRatio: true,
          student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              level: true,
              levelId: true,
              levelModel: { select: { id: true, name: true, category: true } },
              birthdate: true,
              shortCode: true,
              notes: true,
            },
          },
        },
      }),
      this.prisma.trialBooking.findMany({
        where: { classSessionId: { in: sessionIds } },
        select: {
          id: true,
          classSessionId: true,
          childName: true,
          childAge: true,
          status: true,
          classRatio: true,
          notes: true,
        },
      }),
      this.prisma.enrollmentSkip.findMany({
        where: {
          classSessionId: { in: sessionIds },
          enrollmentId: { in: enrollmentIds },
        },
        select: { enrollmentId: true },
      }),
      (async () => {
        const studentIds = enrollments
          .map((e) => e.studentId)
          .filter((id): id is string => !!id);

        if (studentIds.length === 0) return [];

        const res = await this.prisma.enrollment.findMany({
          where: {
            studentId: { in: studentIds },
            offering: {
              type: "regular",
              term: {
                startDate: { gt: targetDate },
                offerings: { some: { type: "regular" } },
              },
            },
            status: "active",
          },
          select: {
            studentId: true,
            invoiceLineItem: {
              select: {
                invoice: { select: { status: true } },
              },
            },
          },
        });
        return res;
      })(),
      this.prisma.classSession.findMany({
        where: { offeringId: { in: offeringIds } },
        select: { id: true, offeringId: true, date: true, status: true },
        orderBy: { date: "asc" },
      }),
      this.prisma.attendance.findMany({
        where: { enrollmentId: { in: enrollmentIds } },
        select: { enrollmentId: true, classSessionId: true, status: true },
      }),
      this.prisma.enrollmentSkip.findMany({
        where: { enrollmentId: { in: enrollmentIds } },
        select: { enrollmentId: true, classSessionId: true },
      }),
    ]);

    const attendanceMap = new Map(attendance.map((a) => [a.enrollmentId, a]));
    const skipSet = new Set(skips.map((s) => s.enrollmentId));

    const makeupsBySession = new Map<string, typeof makeups>();
    for (const m of makeups) {
      const arr = makeupsBySession.get(m.classSessionId) ?? [];
      arr.push(m);
      makeupsBySession.set(m.classSessionId, arr);
    }

    const trialsBySession = new Map<string, typeof trials>();
    for (const t of trials) {
      const arr = trialsBySession.get(t.classSessionId) ?? [];
      arr.push(t);
      trialsBySession.set(t.classSessionId, arr);
    }

    const nextTermMap = new Map<string, string>(); // studentId -> status
    for (const ne of nextTermEnrollments) {
      if (!ne.studentId) continue;
      const paid = ne.invoiceLineItem?.invoice?.status === "paid";
      nextTermMap.set(ne.studentId, paid ? "paid" : "enrolled");
    }

    const sessionsByOffering = new Map<string, typeof allOfferingSessions>();
    for (const s of allOfferingSessions) {
      const arr = sessionsByOffering.get(s.offeringId) ?? [];
      arr.push(s);
      sessionsByOffering.set(s.offeringId, arr);
    }

    const termAttendanceMap = new Map<string, Map<string, string>>();
    for (const a of allTermAttendance) {
      if (!termAttendanceMap.has(a.enrollmentId)) {
        termAttendanceMap.set(a.enrollmentId, new Map());
      }
      termAttendanceMap.get(a.enrollmentId)!.set(a.classSessionId, a.status);
    }

    const termSkipMap = new Map<string, Set<string>>();
    for (const s of allTermSkips) {
      if (!termSkipMap.has(s.enrollmentId)) {
        termSkipMap.set(s.enrollmentId, new Set());
      }
      termSkipMap.get(s.enrollmentId)!.add(s.classSessionId);
    }

    const makeupStudentIds = makeups.map((m) => m.student.id);
    const termIds = Array.from(new Set(offerings.map((o) => o.termId)));
    const makeupEnrollments =
      makeupStudentIds.length > 0 && termIds.length > 0
        ? await this.prisma.enrollment.findMany({
            where: {
              studentId: { in: makeupStudentIds },
              offering: { termId: { in: termIds } },
              status: "active",
            },
            select: {
              studentId: true,
              offering: {
                select: {
                  termId: true,
                  weekday: true,
                  startTime: true,
                  endTime: true,
                },
              },
            },
          })
        : [];

    const makeupEnrollmentMap = new Map<
      string,
      (typeof makeupEnrollments)[0]
    >();
    for (const enr of makeupEnrollments) {
      const key = `${enr.studentId}_${enr.offering.termId}`;
      makeupEnrollmentMap.set(key, enr);
    }

    // Helper for age
    const getAge = (birthdate: Date) => {
      const today = new Date();
      let age = today.getFullYear() - birthdate.getFullYear();
      const m = today.getMonth() - birthdate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
        age--;
      }
      return age;
    };

    // Transform Data
    const classes = offerings
      .map((offering) => {
        const session = sessionMap.get(offering.id);
        if (!session) return null;

        const sessionMakeups = makeupsBySession.get(session.id) ?? [];
        const sessionTrials = trialsBySession.get(session.id) ?? [];
        const sessionEnrollments = enrollmentsByOffering.get(offering.id) ?? [];

        // COUNT LOGIC matching SlotBlock (Weighted)
        let regularWeighted = 0;
        for (const enr of sessionEnrollments) {
          const isSkipped = skipSet.has(enr.id);
          const att = attendanceMap.get(enr.id);
          const isExcused = att && att.status === "excused";
          const isAbsent = att && att.status === "absent";

          if (
            enr.status === "active" &&
            !isSkipped &&
            !isExcused &&
            !isAbsent
          ) {
            regularWeighted += getRatioWeight(enr.classRatio);
          }
        }

        // Active Makeups (Weighted)
        let makeupWeighted = 0;
        for (const m of sessionMakeups) {
          if (["scheduled", "attended"].includes(m.status)) {
            makeupWeighted += getRatioWeight(m.classRatio);
          }
        }

        // Active Trials (Weighted)
        let trialsWeighted = 0;
        for (const t of sessionTrials) {
          if (["scheduled", "attended"].includes(t.status)) {
            trialsWeighted += getRatioWeight(t.classRatio);
          }
        }

        // Total filled (float)
        const filled = regularWeighted + makeupWeighted + trialsWeighted;

        const roster = [
          ...sessionEnrollments.map((e) => {
            const isSkipped = skipSet.has(e.id);
            const att = attendanceMap.get(e.id);

            const offeringSessions = sessionsByOffering.get(offering.id) ?? [];
            const studentAttendance =
              termAttendanceMap.get(e.id) ?? new Map<string, string>();
            const studentSkips = termSkipMap.get(e.id) ?? new Set<string>();

            const timeline = offeringSessions.map((sess) => {
              const sessDateStr = sess.date.toISOString().slice(0, 10);
              const hasSkip = studentSkips.has(sess.id);
              const attendanceStatus = studentAttendance.get(sess.id);

              let timelineStatus:
                | "present"
                | "absent"
                | "excused"
                | "skipped"
                | "unmarked"
                | "upcoming";
              if (hasSkip) {
                timelineStatus = "skipped";
              } else if (attendanceStatus === "present") {
                timelineStatus = "present";
              } else if (attendanceStatus === "absent") {
                timelineStatus = "absent";
              } else if (attendanceStatus === "excused") {
                timelineStatus = "excused";
              } else if (sessDateStr > dateString) {
                timelineStatus = "upcoming";
              } else {
                timelineStatus = "unmarked";
              }

              return {
                date: sessDateStr,
                status: timelineStatus,
                isCurrent: sessDateStr === dateString,
              };
            });

            const presentCount = timeline.filter(
              (t) => t.status === "present" && t.date <= dateString,
            ).length;

            return {
              id: e.id, // Enrollment ID for updates
              type: "student",
              name: `${e.student.firstName} ${e.student.lastName}`,
              studentId: e.student.id,
              level: e.student.levelModel?.name ?? e.student.level,
              age: e.student.birthdate ? getAge(e.student.birthdate) : null,
              status: att?.status ?? (isSkipped ? "skipped" : null),
              ratio: e.classRatio,
              notes: e.student.notes,
              isSkipped,
              reportCardStatus: e.reportCardStatus,
              nextTermStatus:
                (nextTermMap.get(e.studentId) as
                  "paid" | "enrolled" | "not_registered") ?? "not_registered",
              attendanceCount: presentCount,
              totalSessionsCount: timeline.length,
              attendanceTimeline: timeline,
              enrollmentStatus: e.status,
            };
          }),
          ...sessionMakeups.map((m) => {
            const key = `${m.student.id}_${offering.termId}`;
            const matchingEnrollment = makeupEnrollmentMap.get(key);
            let normalSession = null;
            if (matchingEnrollment) {
              const off = matchingEnrollment.offering;
              if (
                off.weekday !== null &&
                off.weekday !== undefined &&
                off.startTime
              ) {
                const shortDays = [
                  "Sun",
                  "Mon",
                  "Tue",
                  "Wed",
                  "Thu",
                  "Fri",
                  "Sat",
                ];
                const dayName = shortDays[off.weekday] ?? `Day ${off.weekday}`;
                normalSession = `${dayName} ${formatTime(off.startTime)}`;
              }
            }
            return {
              id: m.id, // Makeup ID for updates
              type: "makeup",
              name: `${m.student.firstName} ${m.student.lastName}`,
              studentId: m.student.id,
              level: m.student.levelModel?.name ?? m.student.level,
              age: m.student.birthdate ? getAge(m.student.birthdate) : null,
              status: m.status,
              ratio: "3:1",
              notes: m.student.notes,
              isSkipped: false,
              reportCardStatus: null,
              nextTermStatus: "not_registered",
              normalSession,
              enrollmentStatus: null,
            };
          }),
          ...sessionTrials.map((t) => ({
            id: t.id, // Trial ID for updates
            type: "trial",
            name: t.childName,
            studentId: null,
            level: null,
            age: t.childAge,
            status: t.status,
            ratio: "3:1",
            notes: t.notes ?? "Trial",
            isSkipped: false,
            reportCardStatus: null,
            nextTermStatus: "not_registered",
            enrollmentStatus: null,
          })),
        ].sort((a, b) => a.name.localeCompare(b.name));

        return {
          id: session.id,
          offeringId: offering.id,
          termId: offering.termId,
          termName: offering.term.name,
          title: offering.title,
          type: offering.type,
          time: `${session.startTime ?? offering.startTime}-${session.endTime ?? offering.endTime}`,
          instructors: offering.instructors.map((i) => ({
            id: i.id,
            staffUserId: i.staffUserId,
            staffName: i.instructor
              ? `${i.instructor.firstName} ${i.instructor.lastName}`
              : (i.staffUser?.fullName ?? "Unknown"),
          })),
          capacity: offering.capacity,
          filled,
          roster,
        };
      })
      .filter(Boolean);

    return {
      date: dateString,
      classes: classes,
    };
  }
}
