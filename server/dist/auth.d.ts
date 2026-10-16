import { Request } from 'express';
/**
 * Extract the guest owner-ID from the request.
 *
 * Checks X-Verity-Guest-ID first (new header), then X-Karma-Guest-ID (legacy
 * header kept for backward compatibility), then query param ownerId.
 * This dual-header approach allows a zero-downtime migration.
 */
export declare function getOwnerId(req: Request): string;
