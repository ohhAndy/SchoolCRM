export type RosterItem = {
  id: string; // EnrollmentID, MakeupID, or TrialID
  type: "student" | "makeup" | "trial";
  name: string;
  studentId: string | null;
  level: string | null;
  age: number | null;
  status: string | null;
  ratio: string | null;
  notes: string | null;
  isSkipped: boolean;
  reportCardStatus: string | null;
  nextTermStatus: "not_registered" | "enrolled" | "paid" | null;
  normalSession?: string | null;
  attendanceCount?: number | null;
  totalSessionsCount?: number | null;
  attendanceTimeline?:
    | {
        date: string;
        status:
          | "present"
          | "absent"
          | "excused"
          | "skipped"
          | "unmarked"
          | "upcoming";
        isCurrent: boolean;
      }[]
    | null;
  enrollmentStatus?: string;
};
