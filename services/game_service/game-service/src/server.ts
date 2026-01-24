  /***********/
 /*	IMPORT	*/
/***********/

import { IS_TEST, PORT } from './config/env';
import { httpServer } from './app';


// Démarre le serveur
if (IS_TEST == false) {

	httpServer.listen(PORT, () => {
		console.log(`🎮 Game service started on port ${PORT}`);
		console.log(`🔌 WebSocket ready`);
	});
}