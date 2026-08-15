"use client";

// Client wrapper / helper types for searching tutors

export type TutorSearchFilters = {
  query?: string;
  subject?: string;
  classLevel?: string;
  district?: string;
  medium?: string;
  dayOfWeek?: string;
  minFee?: number;
  maxFee?: number;
};
