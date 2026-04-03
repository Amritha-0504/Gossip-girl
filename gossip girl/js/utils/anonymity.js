// js/utils/anonymity.js – Centralised identity masking

/**
 * Returns a user's PUBLIC display name (pen name / alias).
 * Non-admins always see pen names — never real Gmail names.
 * Admins see the real name when they explicitly call maskUser().
 */
export function publicName(user) {
    if (!user) return "Anonymous";
    return user.penName || user.username || "Anonymous";
}

/**
 * Returns an avatar string for a user — emoji if set, else first letter.
 */
export function userAvatar(user) {
    if (!user) return "?";
    if (user.avatarEmoji) return user.avatarEmoji;
    return (user.penName || user.username || "?").charAt(0).toUpperCase();
}

/**
 * Avatar background colour — stored as avatarColor or falls back to a default.
 */
export function avatarColor(user) {
    return user?.avatarColor || "#7c3aed";
}

/**
 * ADMIN ONLY: reveals the real identity (realName + email).
 * Everyone else gets the pen name.
 */
export function maskUser(targetUser, currentUser) {
    if (!targetUser) return "Anonymous Reader";
    if (currentUser?.role === "admin") {
        return targetUser.realName || targetUser.email || publicName(targetUser);
    }
    return publicName(targetUser);
}

/**
 * Should this user see real identity metadata at all?
 * Only admins.
 */
export function canRevealIdentities(currentUser) {
    return currentUser?.role === "admin";
}
