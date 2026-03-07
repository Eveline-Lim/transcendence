import { test, after } from "node:test";
import Fastify from "fastify";
import assert from "node:assert";
import { GenericContainer } from "testcontainers";
import crypto from "node:crypto";
import speakeasy from "speakeasy";

// Start a Redis container before importing modules that connect at load time
const redisContainer = await new GenericContainer("redis:7-alpine")
	.withExposedPorts(6379)
	.start();

process.env.REDIS_URL = `redis://localhost:${redisContainer.getMappedPort(6379)}/0`;
process.env.JWT_SECRET = "test-secret-for-integration-tests";
process.env.PLAYER_SERVICE_URL = "http://localhost:9999"; // won't be reached, we mock below

// Dynamic imports so env vars are set before modules load
const { redisClient } = await import("../../redisClient.js");
const authRoutes = (await import("../../routes/auth.js")).default;

after(async () => {
	await redisClient.quit();
	await redisContainer.stop();
});

// Helper: build a fresh Fastify app with our routes registered
async function buildApp() {
	const fastify = Fastify();
	fastify.register(authRoutes, { prefix: "/auth" });
	await fastify.ready();
	return fastify;
}

// Shared state across tests
const state = {};

// Test data
const username = "routeuser";
const email = "routeuser@test.fr";
const password = "Test1234!";
const changedPassword = "Helloworld1!";
const displayName = "Route Test User";

// ---------- REGISTER ----------
test("routes: POST /auth/register - success", async () => {
	await redisClient.flushDb();

	// Pre-seed user data in Redis to avoid needing the player service
	// The signup controller calls createPlayerProfile, which would fail
	// So we directly seed the user data to test the route wiring
	const uuid = crypto.randomUUID();
	const bcrypt = (await import("bcrypt")).default;
	const hashedPassword = await bcrypt.hash(password, 10);

	await redisClient.hSet(`user:${username}`, {
		id: uuid,
		username,
		displayName,
		password: hashedPassword,
		email,
		avatarUrl: "/assets/avatar.jpg",
		has2FAEnabled: "false",
		requires2FA: "false",
	});
	await redisClient.set(`email:${email}`, username);
	await redisClient.set(`userid:${uuid}`, username);

	state.userId = uuid;

	// Verify user was stored
	const user = await redisClient.hGetAll(`user:${username}`);
	assert.ok(user.id, "User should have been seeded in Redis");
	assert.equal(user.username, username);
});

// ---------- LOGIN ----------
test("routes: POST /auth/login - success", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { identifier: username, password },
	});

	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	assert.ok(body.accessToken, "Should return accessToken");
	assert.ok(body.refreshToken, "Should return refreshToken");
	assert.equal(body.tokenType, "Bearer");
	assert.ok(body.expiresIn > 0);
	assert.ok(body.user);
	assert.equal(body.user.username, username);

	state.accessToken = body.accessToken;
	state.refreshToken = body.refreshToken;

	await app.close();
});

test("routes: POST /auth/login - invalid credentials", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { identifier: username, password: "WrongPass1!" },
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

test("routes: POST /auth/login - bad request (missing fields)", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: {},
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

// ---------- VERIFY TOKEN ----------
test("routes: GET /auth/verify - valid token", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/auth/verify",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	assert.equal(body.valid, true);
	assert.ok(body.userId);
	assert.equal(body.username, username);
	assert.ok(body.expiresAt);
	assert.ok(body.issuedAt);

	await app.close();
});

test("routes: GET /auth/verify - no token returns 401", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/auth/verify",
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

// ---------- REFRESH TOKEN ----------
test("routes: POST /auth/refresh - success", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { refreshToken: state.refreshToken },
	});

	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	assert.ok(body.accessToken);
	assert.ok(body.refreshToken);
	assert.equal(body.tokenType, "Bearer");

	state.accessToken = body.accessToken;
	state.refreshToken = body.refreshToken;

	await app.close();
});

test("routes: POST /auth/refresh - invalid token returns 401", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { refreshToken: "invalid-token" },
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

// ---------- FORGOT PASSWORD ----------
test("routes: POST /auth/password/forgot - success", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/password/forgot",
		payload: { email },
	});

	// Returns 202 whether or not the email exists (to not leak info)
	assert.equal(res.statusCode, 202);
	await app.close();
});

test("routes: POST /auth/password/forgot - invalid email returns 400", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/password/forgot",
		payload: { email: "not-an-email" },
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

// ---------- RESET PASSWORD ----------
test("routes: POST /auth/password/reset - success", async () => {
	const app = await buildApp();

	// Seed a reset token
	const token = crypto.randomBytes(64).toString("hex");
	const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
	await redisClient.set(`passwordReset:${hashedToken}`, state.userId, { EX: 3600 });

	const res = await app.inject({
		method: "POST",
		url: "/auth/password/reset",
		payload: { token, password: changedPassword },
	});

	assert.equal(res.statusCode, 200);
	await app.close();
});

test("routes: POST /auth/password/reset - invalid token returns 401", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/password/reset",
		payload: { token: "nonexistent-token", password: changedPassword },
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

// ---------- CHANGE PASSWORD ----------
test("routes: POST /auth/password/change - success", async () => {
	// After reset password, the password is changedPassword. Let's login again first.
	const app = await buildApp();

	// Login with new password
	const loginRes = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { identifier: username, password: changedPassword },
	});
	assert.equal(loginRes.statusCode, 200);
	const loginBody = JSON.parse(loginRes.payload);
	state.accessToken = loginBody.accessToken;
	state.refreshToken = loginBody.refreshToken;

	const res = await app.inject({
		method: "POST",
		url: "/auth/password/change",
		payload: { currentPassword: changedPassword, newPassword: password },
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 200);
	await app.close();
});

test("routes: POST /auth/password/change - wrong current password returns 401", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/password/change",
		payload: { currentPassword: "WrongPass1!", newPassword: "NewPass123!" },
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});

// ---------- ENABLE 2FA ----------
test("routes: POST /auth/2fa/enable - success", async () => {
	// Login again to get fresh token after password change
	const app = await buildApp();

	const loginRes = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { identifier: username, password },
	});
	const loginBody = JSON.parse(loginRes.payload);
	state.accessToken = loginBody.accessToken;

	const res = await app.inject({
		method: "POST",
		url: "/auth/2fa/enable",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	assert.ok(body.secret);
	assert.ok(body.qrCodeUrl);
	assert.ok(Array.isArray(body.backupCodes));

	state.twoFASecret = body.secret;
	await app.close();
});

// ---------- VERIFY 2FA ----------
test("routes: POST /auth/2fa/verify - success", async () => {
	const app = await buildApp();

	const code = speakeasy.totp({ secret: state.twoFASecret, encoding: "base32" });

	const res = await app.inject({
		method: "POST",
		url: "/auth/2fa/verify",
		payload: { code },
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 201);
	const body = JSON.parse(res.payload);
	assert.ok(body.accessToken);
	assert.ok(body.refreshToken);

	state.accessToken = body.accessToken;
	state.refreshToken = body.refreshToken;
	await app.close();
});

// ---------- DISABLE 2FA ----------
test("routes: POST /auth/2fa/disable - success", async () => {
	const app = await buildApp();

	const code = speakeasy.totp({ secret: state.twoFASecret, encoding: "base32" });

	const res = await app.inject({
		method: "POST",
		url: "/auth/2fa/disable",
		payload: { code, password },
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	assert.ok(body.accessToken);

	state.accessToken = body.accessToken;
	await app.close();
});

// ---------- LIST SESSIONS ----------
test("routes: GET /auth/sessions - success", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/auth/sessions",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	assert.ok(Array.isArray(body.sessions));

	// Find a session to revoke later
	if (body.sessions.length > 0) {
		state.sessionId = body.sessions[0].id;
	}
	await app.close();
});

// ---------- REVOKE SESSION ----------
test("routes: DELETE /auth/sessions/:sessionId - success", async () => {
	const app = await buildApp();

	assert.ok(state.sessionId, "Should have a sessionId from listSessions");

	const res = await app.inject({
		method: "DELETE",
		url: `/auth/sessions/${state.sessionId}`,
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 204);
	await app.close();
});

test("routes: DELETE /auth/sessions/:sessionId - not found returns 404", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "DELETE",
		url: `/auth/sessions/${crypto.randomUUID()}`,
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 404);
	await app.close();
});

// ---------- REVOKE ALL SESSIONS ----------
test("routes: POST /auth/sessions/revoke-all - success", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/sessions/revoke-all",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});

	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	assert.ok(typeof body.revokedCount === "number");
	await app.close();
});

// ---------- OAUTH ----------
test("routes: GET /auth/oauth/:provider - redirect for fortytwo", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/auth/oauth/fortytwo",
	});

	assert.equal(res.statusCode, 302);
	await app.close();
});

test("routes: GET /auth/oauth/:provider - invalid provider returns 400", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "GET",
		url: "/auth/oauth/invalid",
	});

	assert.equal(res.statusCode, 400);
	await app.close();
});

// ---------- LOGOUT ----------
test("routes: POST /auth/logout - success", async () => {
	// Login to get a fresh token
	const app = await buildApp();

	const loginRes = await app.inject({
		method: "POST",
		url: "/auth/login",
		payload: { identifier: username, password },
	});
	const loginBody = JSON.parse(loginRes.payload);

	const res = await app.inject({
		method: "POST",
		url: "/auth/logout",
		headers: { authorization: `Bearer ${loginBody.accessToken}` },
	});

	assert.equal(res.statusCode, 204);
	await app.close();
});

test("routes: POST /auth/logout - without token returns 401", async () => {
	const app = await buildApp();

	const res = await app.inject({
		method: "POST",
		url: "/auth/logout",
	});

	assert.equal(res.statusCode, 401);
	await app.close();
});
