import {
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
  eachWeekOfInterval,
  eachDayOfInterval,
  format,
} from "date-fns";
import { TZDate } from "@date-fns/tz";

const getNow = (timeZone?: string) =>
  timeZone ? new TZDate(Date.now(), timeZone) : new Date();

export const getThisWeekRange = (timeZone?: string) => {
  const now = getNow(timeZone);
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
};

export const getThisMonthRange = (timeZone?: string) => {
  const now = getNow(timeZone);
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};

export const getPreviousWeekRange = (timeZone?: string) => {
  const previousWeek = subWeeks(getNow(timeZone), 1);
  return {
    start: startOfWeek(previousWeek, { weekStartsOn: 1 }),
    end: endOfWeek(previousWeek, { weekStartsOn: 1 }),
  };
};

export const getPreviousMonthRange = (timeZone?: string) => {
  const previousMonth = subMonths(getNow(timeZone), 1);
  return {
    start: startOfMonth(previousMonth),
    end: endOfMonth(previousMonth),
  };
};

export const getRangeByPeriod = (
  period: string | undefined,
  startDate?: string,
  endDate?: string,
  timeZone?: string,
) => {
  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }
  switch (period) {
    case "THIS_WEEK":
      return getThisWeekRange(timeZone);
    case "PREVIOUS_WEEK":
      return getPreviousWeekRange(timeZone);
    case "THIS_MONTH":
      return getThisMonthRange(timeZone);
    case "PREVIOUS_MONTH":
      return getPreviousMonthRange(timeZone);
    default:
      return null;
  }
};

export const generateTrendIntervals = (
  start: Date,
  end: Date,
  resetStrategy: "MONTHLY" | "WEEKLY" | "DAILY",
) => {
  const intervals: { label: string; start: Date; end: Date }[] = [];

  if (resetStrategy === "MONTHLY") {
    const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 });
    weeks.forEach((weekStart, index) => {
      let weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      if (weekEnd > end) weekEnd = end;
      intervals.push({
        label: `Week ${index + 1}`,
        start: weekStart,
        end: weekEnd,
      });
    });
  } else if (resetStrategy === "WEEKLY") {
    const days = eachDayOfInterval({ start, end });
    days.forEach((day) => {
      intervals.push({
        label: format(day, "EEEE"),
        start: day,
        end: day,
      });
    });
  } else {
    intervals.push({
      label: "Today",
      start,
      end,
    });
  }

  return intervals;
};
