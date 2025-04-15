import {
  McpServer,
  mcpExpressMiddleware,
  ProxyOAuthServerProvider,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk";
import express from "express";

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const AUTH_EXTERNAL_BASE_URL = "https://auth.external.com"; // Replace with your actual auth provider base URL
const AUTH_EXTERNAL_AUTHORIZE_URL = `${AUTH_EXTERNAL_BASE_URL}/oauth2/v1/authorize`;
const AUTH_EXTERNAL_TOKEN_URL = `${AUTH_EXTERNAL_BASE_URL}/oauth2/v1/token`;
const AUTH_EXTERNAL_REVOKE_URL = `${AUTH_EXTERNAL_BASE_URL}/oauth2/v1/revoke`;
const YOUR_CLIENT_ID = "YOUR_CLIENT_ID"; // Replace with actual client ID
const YOUR_CLIENT_SECRET = "YOUR_CLIENT_SECRET"; // Replace with actual client secret, if needed by provider
const SERVICE_DOCUMENTATION_URL = "https://docs.example.com/"; // Replace with your service docs URL

const app = express();

// Configure the OAuth Proxy Provider
const proxyProvider = new ProxyOAuthServerProvider({
  endpoints: {
    authorizationUrl: AUTH_EXTERNAL_AUTHORIZE_URL,
    tokenUrl: AUTH_EXTERNAL_TOKEN_URL,
    revocationUrl: AUTH_EXTERNAL_REVOKE_URL,
  },
  // Basic token verification - replace with actual verification logic
  verifyAccessToken: async (token) => {
    console.log("Verifying access token:", token);
    // --- Add your real token verification logic here --- 
    // Example: Call your provider's userinfo endpoint or validate JWT signature
    // This is a placeholder and insecure for production
    return {
      token,
      clientId: YOUR_CLIENT_ID, // This might come from the token introspection result
      scopes: ["ping_scope"], // This should ideally come from the token
    };
  },
  // Client verification - replace with actual lookup if needed
  getClient: async (client_id) => {
    console.log("Getting client info for:", client_id);
    // --- Add your real client lookup/verification logic here --- 
    // This might involve checking a database of registered clients
    if (client_id === YOUR_CLIENT_ID) {
      return {
        client_id,
        // Ensure this redirect URI matches what's configured in your MCP client and OAuth provider
        redirect_uris: [`${BASE_URL}/callback`], 
        // Add other client properties if needed (e.g., client_secret for token endpoint auth)
        client_secret: YOUR_CLIENT_SECRET, // Include if your provider requires it for token exchange
      };
    }
    return null; // Indicate client not found/invalid
  },
});

// Set up MCP Auth routes
app.use(
  mcpAuthRouter({
    provider: proxyProvider,
    issuerUrl: new URL(AUTH_EXTERNAL_BASE_URL), // Issuer ID for discovery
    baseUrl: new URL(BASE_URL), // Base URL where this server is hosted
    serviceDocumentationUrl: new URL(SERVICE_DOCUMENTATION_URL),
  })
);

// Configure the MCP Server itself
const server = new McpServer({
  // transportOptions removed - handled by express middleware
  serverInfo: {
    name: "oauth-ping-server",
    version: "1.0.0",
    // Define the authentication strategy using the configured proxy
    authenticationStrategies: [
      {
        id: "oauth2-proxy-example", // Must match provider ID if only one
        type: "oauth2",
        title: "Example OAuth2 (Proxy)",
        authorizationUrl: `${BASE_URL}/authorize`, // Use the local proxy endpoint
        tokenUrl: `${BASE_URL}/token`, // Use the local proxy endpoint
        // clientId is often handled by the interaction with the proxy
        clientId: YOUR_CLIENT_ID, 
        scopes: ["ping_scope"],
        pkce: true, // PKCE is handled by the SDK/proxy router
      },
    ],
    // You can also include discovery document URL
    wellKnownUrl: `${BASE_URL}/.well-known/mcp-configuration`, 
  },
  loggerOptions: {
    level: "debug",
  },
});

// Define the simple ping tool
server.registerTool({
  toolName: "ping",
  description: "A simple ping tool that requires authentication.",
  // Add authentication requirement
  authentication: {
    strategies: ["oauth2-proxy-example"], // Reference the strategy ID
    // Optional: specify required scopes
    // scopes: ["ping_scope"],
  },
  run: async (params, context) => {
    // Access authentication details from context
    const authContext = context?.authentication?.find(auth => auth.strategyId === 'oauth2-proxy-example');
    if (authContext && authContext.type === 'oauth2') {
      console.log("Ping tool executed with access token:", authContext.accessToken);
      // You can use the accessToken to make authenticated calls to backend services
    } else {
      console.warn("Ping tool executed without expected authentication context.");
    }
    console.log("Ping tool executed successfully (OAuth authenticated).");
    return { pong: true };
  },
});

// Add MCP middleware to handle MCP requests (e.g., tool calls)
// Ensure this comes *after* the auth router if auth is required for tools
app.use(mcpExpressMiddleware(server));

// Start the Express server
app.listen(PORT, () => {
  console.log(`OAuth Ping MCP Server listening on port ${PORT}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`MCP Configuration: ${BASE_URL}/.well-known/mcp-configuration`);
  console.log(`OAuth Authorize Endpoint: ${BASE_URL}/authorize`);
  console.log(`OAuth Token Endpoint: ${BASE_URL}/token`);
}); 