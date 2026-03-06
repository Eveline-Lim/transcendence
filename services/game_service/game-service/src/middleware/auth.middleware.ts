  /****************/
 /*	IMPORT		*/
/****************/

import { Request, Response, NextFunction } from 'express';


  /****************/
 /*	MIDDLEWARE	*/
/****************/

/**
 * Extracts the authenticated user ID and username injected by the API gateway
 * via the `X-User-Id` and `X-Username` headers and attaches them to `req.userId`
 * and `req.username`. Returns 401 if either header is missing.
 */
export function extractUserId(req: Request, res: Response, next: NextFunction): void {
	const userId   = req.headers['x-user-id'];   // Node.js lowercases all header names
	const username = req.headers['x-username'];

	if (!userId || Array.isArray(userId)) {
		res.status(401).json({ error: 'Unauthorized: missing or invalid X-User-Id header' });
		return;
	}

	if (!username || Array.isArray(username)) {
		res.status(401).json({ error: 'Unauthorized: missing or invalid X-Username header' });
		return;
	}

	req.userId   = userId;
	req.username = username;
	next();
}
