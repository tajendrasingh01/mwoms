export const SHIFT_TYPES = ["GENERAL", "FIRST", "SECOND", "THIRD"] as const;
export type ShiftTypeValue = (typeof SHIFT_TYPES)[number];

export const SHIFT_SCHEDULE: Record<ShiftTypeValue, { label: string; hours: string }> = {
  GENERAL: { label: "General Shift", hours: "6:00 AM – 2:00 PM" },
  FIRST: { label: "1st Shift", hours: "11:00 AM – 7:00 PM" },
  SECOND: { label: "2nd Shift", hours: "4:00 PM – 12:00 AM" },
  THIRD: { label: "3rd Shift (Night)", hours: "11:00 PM – 7:00 AM" },
};
