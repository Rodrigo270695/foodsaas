import {
    addDays,
    endOfMonth,
    endOfWeek,
    endOfYear,
    startOfDay,
    startOfMonth,
    startOfWeek,
    startOfYear,
    subDays,
    subMonths,
    subWeeks,
} from 'date-fns';

export type DateRange = { from: Date; to: Date };

export function rangeToday(): DateRange {
    const n = startOfDay(new Date());
    return { from: n, to: n };
}

export function rangeYesterday(): DateRange {
    const n = startOfDay(subDays(new Date(), 1));
    return { from: n, to: n };
}

export function rangeTomorrow(): DateRange {
    const n = startOfDay(addDays(new Date(), 1));
    return { from: n, to: n };
}

export function rangeLast7Days(): DateRange {
    const today = startOfDay(new Date());
    return { from: subDays(today, 6), to: today };
}

export function rangeLast30Days(): DateRange {
    const today = startOfDay(new Date());
    return { from: subDays(today, 29), to: today };
}

export function rangeThisWeek(): DateRange {
    const n = new Date();
    return {
        from: startOfWeek(n, { weekStartsOn: 1 }),
        to: endOfWeek(n, { weekStartsOn: 1 }),
    };
}

export function rangeLastWeek(): DateRange {
    const ref = subWeeks(new Date(), 1);
    return {
        from: startOfWeek(ref, { weekStartsOn: 1 }),
        to: endOfWeek(ref, { weekStartsOn: 1 }),
    };
}

export function rangeThisMonth(): DateRange {
    const n = new Date();
    return { from: startOfMonth(n), to: endOfMonth(n) };
}

export function rangeLastMonth(): DateRange {
    const ref = subMonths(new Date(), 1);
    return { from: startOfMonth(ref), to: endOfMonth(ref) };
}

export function rangeThisYear(): DateRange {
    const n = new Date();
    return { from: startOfYear(n), to: endOfYear(n) };
}
