// js/utils/dateUtils.js – Date string helpers (YYYY-MM-DD) — local timezone safe

export function todayStr() {
    const d = new Date();
    return formatISO(d);
}

export function prevDay(str) {
    const d = new Date(str + "T12:00:00"); // noon to avoid DST edge cases
    d.setDate(d.getDate() - 1);
    return formatISO(d);
}

export function nextDay(str) {
    const d = new Date(str + "T12:00:00"); // noon to avoid DST edge cases
    d.setDate(d.getDate() + 1);
    return formatISO(d);
}

export function formatDisplay(str) {
    // "2026-02-25" → "Wed, Feb 25"
    const d = new Date(str + "T12:00:00");
    return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
    });
}

export function isFuture(str) {
    return str > todayStr();
}

/** Returns true if the given Firestore Timestamp / Date is within 1 hour of now */
export function withinOneHour(timestamp) {
    if (!timestamp) return false;
    const ms = timestamp?.toMillis ? timestamp.toMillis() : new Date(timestamp).getTime();
    return Date.now() - ms < 60 * 60 * 1000;
}

/** Format a Date object as YYYY-MM-DD using local timezone */
function formatISO(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}
