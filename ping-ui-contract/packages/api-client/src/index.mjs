// @ping/api-client entry point.
// Three trust-specific clients over one gateway transport.
// UI visibility is UX; the gateway enforces.

export { createGatewayTransport, TransportError } from "./transport.mjs";
export { PublicPingClient } from "./public-client.mjs";
export { AuthenticatedPingClient } from "./authenticated-client.mjs";
export { OperatorPingClient } from "./operator-client.mjs";
