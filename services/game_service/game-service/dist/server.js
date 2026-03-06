"use strict";
/***********/
/*	IMPORT	*/
/***********/
Object.defineProperty(exports, "__esModule", { value: true });
const env_1 = require("./config/env");
const app_1 = require("./app");
// Démarre le serveur
if (env_1.IS_TEST == false) {
    app_1.httpServer.listen(env_1.PORT, () => {
        console.log(`🎮 Game service started on port ${env_1.PORT}`);
        console.log(`🔌 WebSocket ready`);
    });
}
