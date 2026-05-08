const MONTHS   = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Parse a WP ACF datetime string into display parts.
 * Returns null if raw is empty or not a valid date.
 *
 * @param {string} raw  - e.g. "2026-05-08 20:00:00"
 * @returns {{ datetime: string, label_date: string, label_time: string, ampm: string } | null}
 */
export function formatEventDate(raw) {
    if (!raw) return null;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return null;
    const hour    = d.getHours() % 12 || 12;
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm    = d.getHours() < 12 ? 'AM' : 'PM';
    return {
        datetime:   raw.replace(' ', 'T'),
        label_date: `${WEEKDAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
        label_time: `${hour}:${minutes}`,
        ampm,
    };
}

/**
 * True for any value that is not undefined, null, or empty string.
 * @param {any} value
 * @returns {boolean}
 */
export const hasValue = (value) => value !== undefined && value !== null && value !== '';