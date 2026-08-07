export const SHIFT_TYPES = ["GENERAL", "FIRST", "SECOND", "THIRD"] as const;
export type ShiftTypeValue = (typeof SHIFT_TYPES)[number];

interface ShiftDefinition {
  label: string;
  /** 24-hour "HH:mm" start time. */
  startTime: string;
  /** 24-hour "HH:mm" end time. Crosses midnight when earlier than startTime. */
  endTime: string;
}

/**
 * Fixed V1.0 shift schedule (not user-configurable per the spec).
 * THIRD crosses midnight — endTime < startTime signals that to the
 * date-math helpers below.
 */
export const SHIFT_SCHEDULE: Record<ShiftTypeValue, ShiftDefinition> = {
  GENERAL: { label: "General Shift", startTime: "06:00", endTime: "14:00" },
  FIRST: { label: "1st Shift", startTime: "11:00", endTime: "19:00" },
  SECOND: { label: "2nd Shift", startTime: "16:00", endTime: "24:00" },
  THIRD: { label: "3rd Shift (Night)", startTime: "23:00", endTime: "07:00" },
};

function crossesMidnight(shiftType: ShiftTypeValue): boolean {
  const { startTime, endTime } = SHIFT_SCHEDULE[shiftType];
  return endTime <= startTime;
}

function combineDateAndTime(date: Date, hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const result = new Date(date);
  // "24:00" (SECOND's end) isn't a valid Date hour — treat it as
  // 00:00 the next day, which setHours naturally does not do, so
  // special-case it.
  if (hours === 24) {
    result.setDate(result.getDate() + 1);
    result.setHours(0, minutes, 0, 0);
    return result;
  }
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/** Actual start Date/time of a shift given its allocation date. */
export function getShiftStart(date: Date, shiftType: ShiftTypeValue): Date {
  return combineDateAndTime(date, SHIFT_SCHEDULE[shiftType].startTime);
}

/**
 * Actual end Date/time of a shift given its allocation date —
 * correctly lands on the next calendar day for overnight shifts
 * (THIRD) or a shift ending exactly at midnight (SECOND).
 */
export function getShiftEnd(date: Date, shiftType: ShiftTypeValue): Date {
  const end = combineDateAndTime(date, SHIFT_SCHEDULE[shiftType].endTime);
  if (crossesMidnight(shiftType) && SHIFT_SCHEDULE[shiftType].endTime !== "24:00") {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

/** True if `now` falls within the shift's actual start/end window. */
export function isShiftActive(date: Date, shiftType: ShiftTypeValue, now = new Date()): boolean {
  const start = getShiftStart(date, shiftType);
  const end = getShiftEnd(date, shiftType);
  return now >= start && now < end;
}
