import { test, after } from "node:test";
import Fastify from "fastify";
import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { GenericContainer } from "testcontainers";
import crypto from "node:crypto";
import speakeasy from "speakeasy";

// Start a Redis container before importing any module that connects at load time
const redisContainer = await new GenericContainer("redis:7-alpine")
	.withExposedPorts(6379)
	.start();

process.env.REDIS_URL = `redis://localhost:${redisContainer.getMappedPort(6379)}/0`;
process.env.JWT_SECRET = "test-secret-for-unit-tests";

// Dynamic imports so REDIS_URL is set before redisClient.js runs its top-level connect
const { redisClient } = await import("../../redisClient.js");
const { Service } = await import("../service.js");
const { default: fastifyPlugin } = await import("../index.js");

after(async () => {
	await redisClient.quit();
	await redisContainer.stop();
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const specification = join(__dirname, "../openApi.json");
const service = new Service();
const opts = { specification, service };

// Shared state across tests
const state = {};

// Test data
const username = "testuser";
const email = "test@test.fr";
const password = "Test1234!";
const changedPassword = "Helloworld1!";
const displayName = "Test User";
const avatarUrl = "https://example.com/avatar.png";
const has2FAEnabled = false;

test("testing register", async (t) => {
	await redisClient.flushDb();
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/register",
		payload: { username, displayName, password, email, avatarUrl, has2FAEnabled },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 201);
	await fastify.close();
});

test("testing login", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/login",
		payload: { identifier: username, password },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	state.accessToken = body.accessToken;
	state.refreshToken = body.refreshToken;
	console.log("Captured accessToken:", !!state.accessToken);
	await fastify.close();
});

test("testing verifyToken", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "GET",
		url: "/auth/verify",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	await fastify.close();
});

test("testing refresh token", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/refresh",
		payload: { refreshToken: state.refreshToken },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	state.accessToken = body.accessToken;
	state.refreshToken = body.refreshToken;
	await fastify.close();
});

test("testing forgotPassword", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/password/forgot",
		payload: { email },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 202);
	await fastify.close();
});

test("testing resetPassword", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	// Manually seed a reset token the way the stub service expects
	const resetToken = crypto.randomBytes(32).toString("hex");
	const userHash = await redisClient.hGetAll(`user:${username}`);
	await redisClient.set(`resetToken:${resetToken}`, userHash.id, { EX: 3600 });

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/password/reset",
		payload: { token: resetToken, password: changedPassword },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	await fastify.close();
});

test("testing changePassword", async (t) => {
	// After resetPassword the stored password is changedPassword — change it back
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/password/change",
		payload: { currentPassword: changedPassword, newPassword: password },
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	await fastify.close();
});

test("testing enable2FA", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/2fa/enable",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	state.twoFASecret = body.secret;
	await fastify.close();
});

test("testing verify2FA", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const code = speakeasy.totp({ secret: state.twoFASecret, encoding: "base32" });

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/2fa/verify",
		payload: { code },
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	state.accessToken = body.accessToken;
	state.refreshToken = body.refreshToken;
	await fastify.close();
});

test("testing disable2FA", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const code = speakeasy.totp({ secret: state.twoFASecret, encoding: "base32" });

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/2fa/disable",
		payload: { code, password },
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	await fastify.close();
});

test("testing listSessions", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "GET",
		url: "/auth/sessions",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	const body = JSON.parse(res.payload);
	state.sessionId = body.sessions?.find((s) => s !== null)?.id;
	console.log("Captured sessionId:", state.sessionId);
	await fastify.close();
});

test("testing revokeSession", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "DELETE",
		url: `/auth/sessions/${state.sessionId}`,
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 204);
	await fastify.close();
});

test("testing revokeAllSessions", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/sessions/revoke-all",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 200);
	await fastify.close();
});

test("testing initiateOAuth", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);

	const res = await fastify.inject({
		method: "GET",
		url: "/auth/oauth/fortytwo",
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 302);
	await fastify.close();
});

test("testing logout", async (t) => {
	const fastify = Fastify();
	fastify.register(fastifyPlugin, opts);
	await fastify.ready();

	const res = await fastify.inject({
		method: "POST",
		url: "/auth/logout",
		headers: { authorization: `Bearer ${state.accessToken}` },
	});
	console.log(res.statusCode, res.payload);
	assert.equal(res.statusCode, 204);
	await fastify.close();
});

