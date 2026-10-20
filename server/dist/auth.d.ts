import { Request } from 'express';
/**
 * Extract the guest owner-ID from the request.
 *
 * Checks X-Verity-Guest-ID header, then query param ownerId.
 */
export declare function getOwnerId(req: Request): string;
