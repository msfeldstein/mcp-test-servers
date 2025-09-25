# OAuth Debug Implementation Summary

This document summarizes the OAuth debugging tools created to reproduce and analyze the Cursor 1.4.x OAuth discovery issue.

## Issue Overview

**Problem**: Cursor 1.4.x loses track of OAuth authorization server endpoints after receiving the OAuth callback, leading to failed token exchanges.

**Reported Symptoms**:
- OAuth flow starts correctly with proper endpoint discovery
- After callback, Cursor makes 6 failed requests to invalid endpoints
- Token exchange fails with "HTTP 403: Invalid OAuth error"
- Issue affects internal MCP servers but works fine with Claude Code and Cursor 1.3.x

## Created Debug Tools

### 1. Enhanced OAuth Reproduction Server
**File**: `src/oauth-repro-server.js`  
**Ports**: Resource server (3001), Auth server (3002)

**Enhancements Made**:
- Added comprehensive request logging with timestamps
- Implemented handlers for all invalid endpoints mentioned in bug report
- Enhanced authorization code generation to match reported format
- Added detailed console output with ✅/❌ indicators
- Updated client configuration to match exact redirect URI from bug report

**Key Features**:
- Tracks all invalid endpoint requests: `/.well-known/oauth-protected-resource/mcp`, etc.
- Logs when Cursor tries to access token endpoint on wrong server
- Provides clear visual indicators when bug is reproduced

### 2. OAuth Debug Server  
**File**: `src/oauth-debug-server.js`
**Ports**: Resource server (3003), Auth server (3004)

**Features**:
- Maximum visibility OAuth flow logging with emoji indicators
- Request history tracking (last 1000 requests)
- Debug endpoints for runtime analysis:
  - `/debug/requests` - View all requests with filtering
  - `/debug/oauth-state` - Inspect active OAuth state
- Enhanced console output with color coding
- MCP tool for OAuth debugging information

**Logging Categories**:
- 🔐 AUTH - Authorization server requests
- 📦 RESOURCE - Resource server requests  
- 🔍 DISCOVERY - Well-known endpoint requests
- 🔄 CALLBACK - OAuth callback handling
- 🎫 TOKEN - Token-related requests

### 3. OAuth Callback Test Server
**File**: `src/oauth-callback-test-server.js`
**Port**: 3005

**Purpose**: Focused testing of callback handling scenario

**Features**:
- Callback simulation tools for testing without full OAuth flow
- Bug sequence triggers to reproduce exact invalid request pattern
- Web interface for easy testing at `http://localhost:3005`
- Detailed callback status tracking
- Manual bug reproduction endpoints

### 4. Comprehensive Test Documentation
**File**: `src/oauth-debug-scenarios.md`

**Contents**:
- Step-by-step reproduction scenarios
- Expected vs actual request patterns
- Debugging checklists
- Environment configuration
- Manual testing commands
- Troubleshooting guide

### 5. Setup and Launch Scripts
**File**: `scripts/oauth-debug-setup.js`

**Features**:
- Easy launching of individual or all debug servers
- Automated process management
- Quick test URL references
- Graceful shutdown handling

## Request Pattern Analysis

### Correct Flow (Working in 1.3.x)
1. `GET /.well-known/oauth-protected-resource` → Discovers auth server
2. `GET {auth_server}/.well-known/oauth-authorization-server` → Discovers endpoints  
3. Authorization redirect and callback
4. `POST {auth_server}/oauth/token` → Token exchange (uses cached discovery)

### Broken Flow (Bug in 1.4.x)
1. Initial discovery works correctly ✅
2. Authorization and callback work correctly ✅
3. **Bug manifests here**: Instead of using cached endpoints, makes invalid requests:
   - `GET /.well-known/oauth-protected-resource/mcp` ❌
   - `GET /.well-known/oauth-authorization-server/mcp` ❌  
   - `GET /.well-known/oauth-authorization-server` (on resource server) ❌
   - `GET /.well-known/openid-configuration/mcp` ❌
   - `GET /mcp/.well-known/openid-configuration` ❌
   - `POST /token` (on resource server) ❌

## Configuration Updates

### servers.json
Added three new server entries:
- `oauth-debug` - Comprehensive debug server
- `oauth-callback-test` - Callback-focused testing
- Enhanced `oauth-repro` description

### README.md  
Added descriptions for new OAuth debug servers with port information.

### CLI Integration
All new servers are automatically available via:
```bash
npx @msfeldstein/mcp-test-servers oauth-debug
npx @msfeldstein/mcp-test-servers oauth-callback-test
```

## Usage Instructions

### Quick Start
```bash
# Start all debug servers
node scripts/oauth-debug-setup.js all

# Or start individual servers
node scripts/oauth-debug-setup.js debug
node scripts/oauth-debug-setup.js callback
```

### Testing with Cursor
1. Configure MCP server in Cursor settings
2. Initiate OAuth flow
3. Monitor server console logs for bug indicators
4. Check debug endpoints for detailed analysis

### Manual Testing
```bash
# Test discovery endpoints
curl -s http://localhost:3001/.well-known/oauth-protected-resource | jq
curl -s http://localhost:3002/.well-known/oauth-authorization-server | jq

# Test invalid endpoints (should show bug reproduction)
curl http://localhost:3001/.well-known/oauth-protected-resource/mcp
curl http://localhost:3001/token

# View debug information
curl -s http://localhost:3003/debug/requests | jq
```

## Expected Outcomes

When testing with Cursor 1.4.x, you should see:

### Console Indicators
```
❌ BUG REPRODUCED: Cursor trying invalid endpoint /.well-known/oauth-protected-resource/mcp
❌ BUG REPRODUCED: Cursor trying /token on RESOURCE server instead of AUTH server
```

### Debug Endpoint Data
- Request logs showing the transition from correct to incorrect endpoint usage
- OAuth state showing active tokens but failed exchanges
- Invalid endpoint access counts

### HTTP Responses
- 404 responses for invalid discovery endpoints
- 405 responses for incorrect HTTP methods
- Detailed error descriptions in JSON responses

## Next Steps for Bug Resolution

1. **Collect Evidence**: Use these tools to gather comprehensive logs of the bug
2. **Compare Versions**: Test same servers with Cursor 1.3.x vs 1.4.x  
3. **Identify Root Cause**: Focus on callback handler's endpoint caching logic
4. **Test Fixes**: Use these same servers to validate any proposed fixes
5. **Regression Testing**: Ensure fixes don't break other OAuth flows

## Files Created/Modified

### New Files
- `src/oauth-debug-server.js` - Comprehensive OAuth debugging server
- `src/oauth-callback-test-server.js` - Callback-focused test server  
- `src/oauth-debug-scenarios.md` - Detailed testing scenarios
- `scripts/oauth-debug-setup.js` - Server launch script
- `OAUTH-DEBUG-SUMMARY.md` - This summary document

### Modified Files
- `src/oauth-repro-server.js` - Enhanced with bug reproduction features
- `servers.json` - Added new server configurations
- `README.md` - Added descriptions for new servers

This comprehensive OAuth debugging toolkit provides everything needed to reproduce, analyze, and ultimately fix the Cursor 1.4.x OAuth discovery issue.
