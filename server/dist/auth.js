"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOwnerId = getOwnerId;
const FALLBACK_OWNER_ID = 'guest_legacy';
/**
 * Extract the guest owner-ID from the request.
 *
 * Checks X-Verity-Guest-ID header, legacy X-Karma-Guest-ID, then query param ownerId.
 */
function getOwnerId(req) {
    const raw = req.header('X-Verity-Guest-ID')
        || req.header('X-Karma-Guest-ID')
        || req.query.ownerId;
    const ownerId = Array.isArray(raw) ? raw[0] : raw;
    if (typeof ownerId !== 'string')
        return FALLBACK_OWNER_ID;
    const normalized = ownerId.trim();
    if (!/^guest_[a-zA-Z0-9_-]{6,80}$/.test(normalized)) {
        return FALLBACK_OWNER_ID;
    }
    return normalized;
}
