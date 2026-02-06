// implementation of the security schemes in the openapi specification

export class Security {
	async initialize(schemes) {
		// schemes will contain securitySchemes as found in the openapi specification
		console.log("Initialize:", JSON.stringify(schemes));
	}

	// Security scheme: bearerAuth
	// Type: http
	async bearerAuth(_req, _reply, _params) {
		console.log("bearerAuth: Authenticating request");
		// If validation fails: throw new Error('Could not authenticate request')
		// Else, simply return.

		// The request object can also be mutated here (e.g. to set 'req.user')
	}
}
