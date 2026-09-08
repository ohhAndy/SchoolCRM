export interface TrialDate {
  date: string;
  dayOfWeek: string;
}

export interface LocationOption {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
}

export const TRIAL_LOCATIONS: LocationOption[] = [
  {
    id: "loc_main_branch_001",
    slug: "newmarket",
    name: "Newmarket",
    address: "17215 Lesile St",
    city: "Newmarket",
  },
  {
    id: "markham_branch",
    slug: "markham",
    name: "Markham",
    address: "8500 Warden Ave",
    city: "Markham",
  },
  {
    id: "AGC_branch",
    slug: "Angus-glen",
    name: "Swim Team",
    address: "3990 Major Mackenzie Drive East",
    city: "Markham",
  },
];

export type ParticipantType = "child" | "adult";

export interface ChildSwimmer {
  id: string;
  name: string;
  age: string;
  skillLevel: string;
}

export type SiblingPreference = "simultaneous" | "flexible";
export type TimePreference =
  | "weekday_early"
  | "weekday_late"
  | "weekend_morning"
  | "weekend_afternoon"
  | "flexible";

export interface FormData {
  participantType: ParticipantType;
  locationSlug: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  children: ChildSwimmer[];
  siblingPreference: SiblingPreference;
  isSelfBooking: boolean;
  swimmerName: string;
  swimmerAge: string;
  skillLevelOrGoal: string;
  preferredDates: string[];
  timePreferences: string[];
  timePreference?: TimePreference;
  notes: string;
}

export const COOKIE_NAME = "__swan_trial";
export const MAX_DATES = 3;
export const MAX_CHILDREN = 5;

export const CHILD_LEVEL_OPTIONS = [
  "Beginner (No prior water experience)",
  "Water Confident (Can submerge & float)",
  "Intermediate (Can swim basic strokes)",
  "Advanced (Stroke development & endurance)",
];

export const ADULT_GOAL_OPTIONS = [
  "Learn to Swim (Beginner / Overcome fear)",
  "Stroke Technique & Form Refinement",
  "Fitness, Endurance & Lap Training",
  "Triathlon / Masters Swimming Prep",
];
