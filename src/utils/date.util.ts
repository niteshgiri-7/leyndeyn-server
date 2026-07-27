import { endOfMonth } from "date-fns/endOfMonth";
import { endOfWeek } from "date-fns/endOfWeek";
import { startOfMonth } from "date-fns/startOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";

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
