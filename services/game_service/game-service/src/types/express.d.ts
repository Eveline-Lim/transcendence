// Augment Express Request to carry the authenticated user ID and username
// injected by the API gateway via the `X-User-Id` and `X-Username` headers.
declare namespace Express {
	interface Request {
		userId?:   string;
		username?: string;
	}
}
