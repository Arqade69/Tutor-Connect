export const CLASS_LEVELS = [
  "Class 1-8",
  "SSC",
  "HSC",
  "O-Level",
  "A-Level",
  "Admission (Uni)",
  "Other",
] as const;

export const DISTRICTS = [
  "Dhaka", "Chattogram", "Khulna", "Rajshahi", "Sylhet", "Barishal", "Rangpur", "Mymensingh",
  "Gazipur", "Narayanganj", "Comilla", "Bogura", "Dinajpur", "Jashore", "Tangail", "Noakhali",
  "Other",
] as const;

export type ClassLevel = (typeof CLASS_LEVELS)[number];

// ---- Tutor Profile & Schedule Management -------------------------------

export const SUBJECTS = [
  "Physics", "Chemistry", "Biology", "Higher Math", "General Math",
  "English", "Bangla", "ICT", "Economics", "Accounting", "Other",
  "Admission Test Prep", "Programming", "Statistics", "Business Studies", "IELTS",
] as const;

export const TEACHING_MEDIUMS = ["Bangla", "English", "Both"] as const;

export const DAYS_OF_WEEK = [
  "Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
] as const;

export type Subject = (typeof SUBJECTS)[number];
export type TeachingMedium = (typeof TEACHING_MEDIUMS)[number];
export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];
