# OAuth Testing Instructions for Cursor 1.4.x Bug

Based on your logs, I can see that Cursor is successfully completing the OAuth discovery and client registration phases, but it's not proceeding to the authorization request. This suggests we need to ensure the full OAuth flow works properly.

## Current Status Analysis

From your logs, I can see:
1. ✅ MCP initialization attempt (correctly gets 401 without auth)
2. ✅ OAuth protected resource discovery 
3. ✅ OAuth authorization server discovery
4. ✅ Client registration with dynamic registration

**But missing**: Authorization request to `/oauth/authorize`

## Updated Servers

I've enhanced both `oauth-debug-server.js` and `oauth-repro-server.js` to:
- Handle dynamic client registration (what Cursor is doing)
- Support `token_endpoint_auth_method: "none"` (no client secret)
- Accept the exact redirect URI from your logs: `cursor-dev://anysphere.cursor-retrieval/oauth/user-oauther/callback`

## Testing Steps

### 1. Restart the OAuth Debug Server

```bash
# Stop current server (Ctrl+C)
# Then restart:
node src/oauth-debug-server.js
```

### 2. Configure Cursor MCP

Make sure your Cursor MCP configuration points to the debug server:

```json
{
  "mcpServers": {
    "oauth-debug": {
      "command": "node",
      "args": ["src/oauth-debug-server.js"],
      "cwd": "/Users/michael/Source/mcp-test-servers"
    }
  }
}
```

### 3. Expected Flow

After restarting, you should see this sequence:

1. **MCP Init** → 401 (expected)
2. **Discovery** → Resource and Auth server metadata
3. **Client Registration** → Dynamic client created  
4. **🎯 NEW: Authorization Request** → Should now see:
   ```
   🚀 AUTHORIZATION REQUEST:
      Client ID: cursor_xxxxxxxx
      Redirect URI: cursor-dev://anysphere.cursor-retrieval/oauth/user-oauther/callback
      Response Type: code
      Scope: mcp.read mcp.write
      PKCE Challenge: Present
   ```

5. **Browser Redirect** → Authorization page opens
6. **Callback** → After user approval
7. **Token Exchange** → Should work with 'none' auth method
8. **MCP Request** → Finally authenticated

### 4. What to Look For

#### Success Indicators:
- `✅ Registered new client: cursor_xxxxxxxx`
- `🚀 AUTHORIZATION REQUEST:` (this was missing before)
- Browser opens to authorization page
- `🔄 Redirecting to: cursor-dev://...`

#### Bug Indicators (after callback):
- `❌ BUG REPRODUCED: Cursor trying invalid endpoint`
- Multiple failed discovery requests
- Token requests to wrong server

### 5. Manual Testing

You can also test the authorization flow manually:

```bash
# 1. Get a client ID by registering
curl -X POST http://localhost:3004/oauth/register \
  -H "Content-Type: application/json" \
  -d '{
    "redirect_uris": ["http://localhost:3004/callback"],
    "token_endpoint_auth_method": "none",
    "grant_types": ["authorization_code"],
    "response_types": ["code"],
    "client_name": "Manual Test"
  }'

# 2. Use the returned client_id in authorization URL
# http://localhost:3004/oauth/authorize?client_id=cursor_xxxxxxxx&redirect_uri=http://localhost:3004/callback&response_type=code&scope=mcp.read
```

### 6. Debug Endpoints

While testing, you can check:
- `http://localhost:3003/debug/requests` - All request history
- `http://localhost:3003/debug/oauth-state` - Current OAuth state

## Common Issues

### Issue: No Authorization Request
**Cause**: Client registration might not be working correctly
**Solution**: Check that the registration response includes all required fields

### Issue: Browser Doesn't Open  
**Cause**: Cursor might not recognize the authorization_endpoint
**Solution**: Verify the discovery metadata format

### Issue: Callback Fails
**Cause**: Redirect URI mismatch
**Solution**: Ensure exact match between registered and requested URIs

## Next Steps

1. **If authorization request now appears**: Great! Continue through the flow and watch for the bug after callback
2. **If still no authorization request**: Check Cursor's internal logs or try with a simpler OAuth server
3. **If bug reproduces**: Document the exact sequence of invalid requests for the development team

## Debugging Tips

- Enable verbose logging in Cursor if available
- Compare working vs broken request patterns  
- Use browser dev tools to inspect any redirects
- Check if PKCE parameters are being handled correctly

The key breakthrough will be seeing the `🚀 AUTHORIZATION REQUEST` log message, which means Cursor is proceeding past the registration phase.

