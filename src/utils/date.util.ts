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

export const getThisWeekRange = (now = new Date()) => {
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 }),
  };
};

export const getThisMonthRange = (now = new Date()) => {
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
};

export const getPreviousWeekRange = (now = new Date()) => {
  const previousWeek = subWeeks(now, 1);
  return {
    start: startOfWeek(previousWeek, { weekStartsOn: 1 }),
    end: endOfWeek(previousWeek, { weekStartsOn: 1 }),
  };
};

export const getPreviousMonthRange = (now = new Date()) => {
  const previousMonth = subMonths(now, 1);
  return {
    start: startOfMonth(previousMonth),
    end: endOfMonth(previousMonth),
  };
};

export const getRangeByPeriod = (
  period: string | undefined,
  startDate?: string,
  endDate?: string,
) => {
  if (startDate && endDate) {
    return { start: new Date(startDate), end: new Date(endDate) };
  }
  switch (period) {
    case "THIS_WEEK":
      return getThisWeekRange();
    case "PREVIOUS_WEEK":
      return getPreviousWeekRange();
    case "THIS_MONTH":
      return getThisMonthRange();
    case "PREVIOUS_MONTH":
      return getPreviousMonthRange();
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
    // Generate weekly intervals for a month
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
    // Generate daily intervals for a week
    const days = eachDayOfInterval({ start, end });
    days.forEach((day) => {
      intervals.push({
        label: format(day, "EEEE"), // Monday, Tuesday, etc.
        start: day,
        end: day,
      });
    });
  } else {
    // Daily strategy - perhaps just one interval
    intervals.push({
      label: "Today",
      start,
      end,
    });
  }

  return intervals;
};
