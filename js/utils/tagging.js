// js/utils/tagging.js – @username parser

/**
 * Wraps @username tokens in <span class="tag">@name</span> for display.
 * @param {string} text
 * @returns {string} HTML string
 */
export function parseComment(text) {
    if (!text) return "";
    // Escape HTML first
    const safe = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    // Replace @username patterns
    return safe.replace(
        /@([a-zA-Z0-9_.-]+)/g,
        '<span class="tag">@$1</span>'
    );
}

/**
 * Extract all @username strings from raw comment text.
 * @param {string} text
 * @returns {string[]}
 */
export function extractMentions(text) {
    if (!text) return [];
    const matches = text.match(/@([a-zA-Z0-9_.-]+)/g) || [];
    return matches.map((m) => m.slice(1));
}
