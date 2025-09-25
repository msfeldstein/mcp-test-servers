# OAuth Debug Scenarios for Cursor 1.4.x Bug Reproduction

This document provides comprehensive test scenarios to reproduce and debug the OAuth discovery issue reported in Cursor 1.4.x.

## Bug Summary

**Issue**: Cursor 1.4.x loses track of OAuth authorization server endpoints after receiving the OAuth callback, causing it to make invalid requests to non-existent endpoints.

**Symptoms**:
- OAuth flow starts correctly with proper discovery
- After callback, Cursor makes 6 failed requests to invalid endpoints
- Token exchange fails with "HTTP 403: Invalid OAuth error"

**Root Cause**: Cursor's callback handler is not properly caching/using the discovered authorization server endpoints from the initial discovery phase.

## Test Servers

We have created three specialized test servers to reproduce this issue:

### 1. Enhanced OAuth Repro Server (`oauth-repro-server.js`)
- **Ports**: Resource server on 3001, Auth server on 3002  
- **Purpose**: Enhanced version of existing server with comprehensive logging
- **Features**: Tracks all invalid endpoint requests mentioned in bug report

### 2. OAuth Debug Server (`oauth-debug-server.js`)
- **Ports**: Resource server on 3003, Auth server on 3004
- **Purpose**: Maximum visibility into OAuth flow with detailed logging
- **Features**: 
  - Color-coded request logging
  - Debug endpoints for request analysis
  - Request history tracking
  - OAuth state inspection

### 3. OAuth Callback Test Server (`oauth-callback-test-server.js`)
- **Port**: 3005
- **Purpose**: Focused on callback scenario testing
- **Features**:
  - Callback simulation tools
  - Bug sequence triggers
  - Endpoint validation

## Test Scenarios

### Scenario 1: Basic Bug Reproduction

**Objective**: Reproduce the basic OAuth discovery bug

**Steps**:
1. Start the enhanced OAuth repro server:
   ```bash
   cd /Users/michael/Source/mcp-test-servers
   node src/oauth-repro-server.js
   ```

2. Configure Cursor to use the MCP server:
   ```json
   {
     "mcpServers": {
       "oauth-test": {
         "command": "node",
         "args": ["src/oauth-repro-server.js"],
         "env": {
           "PORT": "3001",
           "AUTH_SERVER_PORT": "3002"
         }
       }
     }
   }
   ```

3. Initiate OAuth flow in Cursor

4. Complete authorization (will redirect to `cursor://anysphere.cursor-retrieval/oauth/user-hound/callback`)

5. **Expected Bug Behavior**: Watch server logs for these invalid requests:
   - `❌ BUG REPRODUCED: /.well-known/oauth-protected-resource/mcp`
   - `❌ BUG REPRODUCED: /.well-known/oauth-authorization-server/mcp`
   - `❌ BUG REPRODUCED: /.well-known/oauth-authorization-server` (on resource server)
   - `❌ BUG REPRODUCED: /.well-known/openid-configuration/mcp`
   - `❌ BUG REPRODUCED: /mcp/.well-known/openid-configuration`
   - `❌ BUG REPRODUCED: /token` (on resource server)

### Scenario 2: Debug Mode Testing

**Objective**: Maximum visibility into the OAuth flow for debugging

**Steps**:
1. Start the OAuth debug server:
   ```bash
   node src/oauth-debug-server.js
   ```

2. Monitor the enhanced console output with emojis and detailed logging

3. Use debug endpoints during testing:
   - `http://localhost:3003/debug/requests` - View all requests
   - `http://localhost:3003/debug/oauth-state` - View OAuth state

4. Look for patterns in the request log that show the transition from correct to incorrect endpoint usage

### Scenario 3: Callback Simulation Testing

**Objective**: Test callback handling in isolation

**Steps**:
1. Start the callback test server:
   ```bash
   node src/oauth-callback-test-server.js
   ```

2. Open `http://localhost:3005` in browser

3. Use "Simulate OAuth Callback" to trigger callback without full OAuth flow

4. Trigger bug sequence simulation via:
   ```bash
   curl -X POST http://localhost:3005/debug/trigger-bug-sequence
   ```

5. Monitor console for bug reproduction indicators

### Scenario 4: Comparative Testing (1.3.x vs 1.4.x)

**Objective**: Compare behavior between working and broken versions

**Prerequisites**: 
- Access to both Cursor 1.3.x and 1.4.x
- Same MCP server configuration

**Steps**:
1. Test with Cursor 1.3.x (should work correctly)
   - Log all requests made during OAuth flow
   - Note the correct sequence of endpoint usage

2. Test with Cursor 1.4.x (should show bug)
   - Compare request patterns
   - Identify where the behavior diverges

3. Document differences in endpoint discovery and caching

## Expected Request Patterns

### Correct Flow (Cursor 1.3.x, Claude Code)
1. `GET /.well-known/oauth-protected-resource` → Discovers auth server URL
2. `GET {auth_server}/.well-known/oauth-authorization-server` → Discovers endpoints
3. Browser redirect to `{auth_server}/oauth/authorize`
4. OAuth callback to `cursor://anysphere.cursor-retrieval/oauth/user-hound/callback`
5. `POST {auth_server}/oauth/token` → Token exchange (using cached discovery info)

### Broken Flow (Cursor 1.4.x)
1. `GET /.well-known/oauth-protected-resource` → ✅ Correct
2. `GET {auth_server}/.well-known/oauth-authorization-server` → ✅ Correct  
3. Browser redirect to `{auth_server}/oauth/authorize` → ✅ Correct
4. OAuth callback to `cursor://anysphere.cursor-retrieval/oauth/user-hound/callback` → ✅ Correct
5. **BUG STARTS HERE** - Instead of using cached endpoints, makes invalid requests:
   - `GET /.well-known/oauth-protected-resource/mcp` → ❌ Invalid
   - `GET /.well-known/oauth-authorization-server/mcp` → ❌ Invalid
   - `GET /.well-known/oauth-authorization-server` → ❌ Wrong server
   - `GET /.well-known/openid-configuration/mcp` → ❌ Invalid
   - `GET /mcp/.well-known/openid-configuration` → ❌ Invalid
   - `POST /token` → ❌ Wrong server
6. Token exchange fails → HTTP 403 error

## Debugging Checklist

When testing, verify these points:

### Initial Discovery Phase
- [ ] Resource server discovery request made correctly
- [ ] Authorization server discovery request made correctly  
- [ ] Discovery responses contain correct endpoint URLs
- [ ] Authorization redirect works properly

### Callback Phase (Where Bug Occurs)
- [ ] Callback received with valid authorization code
- [ ] No invalid endpoint requests made after callback
- [ ] Token exchange uses correct authorization server endpoint
- [ ] Token exchange includes proper client credentials
- [ ] PKCE validation (if used) works correctly

### Error Indicators
- [ ] Any 404 responses to discovery endpoints
- [ ] Token requests to wrong server
- [ ] Multiple failed discovery attempts
- [ ] Invalid path construction (appending/prepending /mcp)

## Logging Analysis

Look for these patterns in server logs:

### Success Indicators
```
✅ CORRECT: Serving oauth-protected-resource discovery
✅ DISCOVERY: OAuth authorization server metadata requested  
✅ Token issued successfully
```

### Bug Indicators
```
❌ BUG REPRODUCED: Cursor trying invalid endpoint /.well-known/oauth-protected-resource/mcp
❌ BUG REPRODUCED: Cursor trying /token on RESOURCE server instead of AUTH server
❌ BUG REPRODUCED: Cursor trying /.well-known/oauth-authorization-server on RESOURCE server
```

## Environment Variables

All test servers support these environment variables for customization:

```bash
# OAuth Repro Server
PORT=3001                    # Resource server port
AUTH_SERVER_PORT=3002        # Auth server port  
BASE_URL=http://localhost:3001
AUTH_SERVER_URL=http://localhost:3002

# OAuth Debug Server  
PORT=3003
AUTH_SERVER_PORT=3004
BASE_URL=http://localhost:3003
AUTH_SERVER_URL=http://localhost:3004

# Callback Test Server
PORT=3005
BASE_URL=http://localhost:3005
```

## Manual Testing Commands

Use these curl commands for manual testing:

```bash
# Test discovery endpoints
curl -s http://localhost:3001/.well-known/oauth-protected-resource | jq
curl -s http://localhost:3002/.well-known/oauth-authorization-server | jq

# Test invalid endpoints (should return 404)
curl -s http://localhost:3001/.well-known/oauth-protected-resource/mcp
curl -s http://localhost:3001/.well-known/oauth-authorization-server/mcp
curl -s http://localhost:3001/token

# Test MCP endpoint (should require auth)
curl -I http://localhost:3001/mcp

# View debug info
curl -s http://localhost:3003/debug/requests | jq
curl -s http://localhost:3003/debug/oauth-state | jq
```

## Troubleshooting

### Common Issues

1. **Ports in use**: Change PORT environment variables
2. **No callback received**: Check redirect URI configuration  
3. **PKCE errors**: Ensure code_verifier matches code_challenge
4. **Token validation fails**: Check client credentials and token format

### Debug Tips

1. Enable verbose logging in all test servers
2. Use browser developer tools to inspect redirect flows
3. Compare request patterns between working and broken versions
4. Check Cursor's internal logs for OAuth-related errors
5. Verify discovery document responses match OAuth 2.0 specs

## Next Steps

After reproducing the bug:

1. **Document exact request sequences** from both working and broken versions
2. **Identify the root cause** in Cursor's OAuth callback handling code  
3. **Create minimal reproduction case** for Cursor development team
4. **Test proposed fixes** using these same test servers
5. **Verify fix doesn't break other OAuth flows** (non-MCP OAuth, different providers)
