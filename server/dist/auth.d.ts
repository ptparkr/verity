import { Request } from 'express';
/**
 * Extract the guest owner-ID from the request.
 *
 * Checks X-Verity-Guest-ID header, legacy X-Karma-Guest-ID, then query param ownerId.
 */
export declare function getOwnerId(req: Request): string;
