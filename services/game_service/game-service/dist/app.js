"use strict";
/***********/
/*	IMPORT	*/
/***********/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = exports.app = void 0;
exports.sum = sum;
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const WebsocketService_1 = require("./services/WebsocketService");
const cors_1 = __importDefault(require("cors"));
const game_routes_1 = require("./routes/game.routes");
const debug_routes_1 = require("./routes/debug.routes");
/*******/
/*	APP	*/
/*******/
// Crée l'application
exports.app = (0, express_1.default)();
exports.app.use((0, cors_1.default)());
exports.httpServer = (0, http_1.createServer)(exports.app);
exports.io = new socket_io_1.Server(exports.httpServer, {
    cors: {
        origin: '*',
    }
});
// Indique qu'on accepte du JSON
exports.app.use(express_1.default.json());
// Health check
exports.app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
//configuration pour les routes
exports.app.use('/test', debug_routes_1.debugRouter);
exports.app.use('/api', game_routes_1.gameRouter);
//configure les websocket
new WebsocketService_1.WebsocketService(exports.io);
/***************/
/*	Function	*/
/***************/
function sum(a, b) {
    return a + b;
}
