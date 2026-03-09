"use strict";
/****************/
/*	IMPORT		*/
/****************/
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractUserId = extractUserId;
/****************/
/*	MIDDLEWARE	*/
/****************/
/**
 * Extracts the authenticated user ID and username injected by the API gateway
 * via the `X-User-Id` and `X-Username` headers and attaches them to `req.userId`
 * and `req.username`. Returns 401 if either header is missing.
 */
function extractUserId(req, res, next) {
    const userId = req.headers['x-user-id']; // Node.js lowercases all header names
    const username = req.headers['x-username'];
    if (!userId || Array.isArray(userId)) {
        res.status(401).json({ error: 'Unauthorized: missing or invalid X-User-Id header' });
        return;
    }
    if (!username || Array.isArray(username)) {
        res.status(401).json({ error: 'Unauthorized: missing or invalid X-Username header' });
        return;
    }
    req.userId = userId;
    req.username = username;
    next();
}
