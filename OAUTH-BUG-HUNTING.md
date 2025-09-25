# OAuth Bug Hunting Guide

Since the basic OAuth flow is working correctly, we need to test edge cases that might trigger the Cursor 1.4.x discovery bug. The issue might be related to specific server behaviors, timing, or metadata variations.

## 🎯 **Bug Hunting Strategy**

The bug reported involves Cursor making these invalid requests **after** a successful OAuth callback:
- `/.well-known/oauth-protected-resource/mcp`
- `/.well-known/oauth-authorization-server/mcp`  
- `/.well-known/oauth-authorization-server` (on resource server)
- `/.well-known/openid-configuration/mcp`
- `/mcp/.well-known/openid-configuration`
- `/token` (on resource server)

## 🧪 **Edge Case Testing Server**

I've created `oauth-edge-case-server.js` that can simulate various conditions that might trigger the bug:

### Basic Usage
```bash
# Start with default settings
node src/oauth-edge-case-server.js

# Or with npx
npx @msfeldstein/mcp-test-servers oauth-edge-case
```

### Edge Case Configurations

#### 1. Network Latency Simulation
```bash
# Add 2-second delays to all responses
RESPONSE_DELAY=2000 node src/oauth-edge-case-server.js

# Add 5-second delay before OAuth redirect  
REDIRECT_DELAY=5000 node src/oauth-edge-case-server.js
```

**Theory**: Slow responses might cause Cursor to lose track of cached discovery data.

#### 2. Discovery Metadata Variations
```bash
# Add extra/confusing fields to discovery responses
DISCOVERY_VARIANT=extra-fields node src/oauth-edge-case-server.js

# Use minimal discovery responses
DISCOVERY_VARIANT=minimal node src/oauth-edge-case-server.js
```

**Theory**: Extra or missing fields might confuse Cursor's endpoint caching.

#### 3. Multiple Authorization Servers
```bash
# Include multiple auth servers in resource discovery
MULTIPLE_AUTH_SERVERS=true node src/oauth-edge-case-server.js
```

**Theory**: Multiple auth servers might cause endpoint confusion.

#### 4. Combined Edge Cases
```bash
# Maximum chaos mode
RESPONSE_DELAY=1500 \
REDIRECT_DELAY=3000 \
DISCOVERY_VARIANT=extra-fields \
MULTIPLE_AUTH_SERVERS=true \
node src/oauth-edge-case-server.js
```

## 🔍 **Testing Procedure**

### Step 1: Test Each Edge Case
For each configuration above:

1. **Start the edge case server**
2. **Configure Cursor** to use it:
   ```json
   {
     "mcpServers": {
       "oauth-edge-case": {
         "command": "node",
         "args": ["src/oauth-edge-case-server.js"],
         "cwd": "/path/to/mcp-test-servers",
         "env": {
           "RESPONSE_DELAY": "2000",
           "DISCOVERY_VARIANT": "extra-fields"
         }
       }
     }
   }
   ```
3. **Initiate OAuth flow** in Cursor
4. **Watch for bug indicators** after the callback:
   - `🚨 BUG DETECTED: Invalid endpoint accessed`
   - Multiple 404 responses to invalid endpoints

### Step 2: Timing Analysis
If the bug appears, note:
- **When** it happens (immediately after callback, after delay, etc.)
- **Which** invalid endpoints are accessed
- **Order** of the invalid requests
- **Timing** between callback and invalid requests

### Step 3: Compare Patterns
Compare the invalid request patterns with the original bug report:
- Are the same endpoints being accessed?
- Is the order the same?
- Are there timing differences?

## 🚨 **Bug Detection Indicators**

### Console Messages
Look for these specific log messages:
```
🚨 BUG DETECTED: Invalid endpoint accessed: /.well-known/oauth-protected-resource/mcp
🚨 BUG DETECTED: Token request to resource server!
```

### HTTP Response Patterns
- Multiple 404 responses after successful OAuth callback
- Requests to endpoints with `/mcp` appended incorrectly
- Token requests to resource server instead of auth server

### Debug Endpoint
Check `http://localhost:3006/debug/edge-cases` for:
```json
{
  "stats": {
    "invalid_endpoint_hits": 6,  // Should be > 0 if bug reproduced
    "recent_requests": [...]
  }
}
```

## 🎯 **Specific Test Scenarios**

### Scenario A: Real-World Server Simulation
```bash
# Simulate a typical production OAuth server
RESPONSE_DELAY=500 \
DISCOVERY_VARIANT=extra-fields \
node src/oauth-edge-case-server.js
```

### Scenario B: Slow Network Conditions
```bash
# Simulate slow/unreliable network
RESPONSE_DELAY=3000 \
REDIRECT_DELAY=2000 \
node src/oauth-edge-case-server.js
```

### Scenario C: Complex Discovery Metadata
```bash
# Simulate server with lots of OAuth metadata
DISCOVERY_VARIANT=extra-fields \
MULTIPLE_AUTH_SERVERS=true \
node src/oauth-edge-case-server.js
```

### Scenario D: Minimal Server Response
```bash
# Simulate bare-minimum OAuth server
DISCOVERY_VARIANT=minimal \
node src/oauth-edge-case-server.js
```

## 🔬 **Advanced Debugging**

### 1. Request Timing Analysis
The edge case server logs precise timestamps. Look for patterns like:
- Long gaps between callback and next request
- Rapid-fire invalid requests after callback
- Requests happening in specific order

### 2. Metadata Comparison
Compare what the server sends vs. what Cursor seems to expect:
- Are extra fields causing confusion?
- Is Cursor misinterpreting endpoint URLs?
- Are there URL construction issues?

### 3. PKCE and State Analysis
Check if the bug correlates with:
- PKCE parameter handling
- State parameter handling  
- Specific redirect URI formats

## 📊 **Data Collection**

If you reproduce the bug, collect:

1. **Complete request logs** from the edge case server
2. **Exact configuration** that triggered the bug
3. **Timing information** (delays, response times)
4. **Cursor version** and environment details
5. **Sequence of invalid requests** made

## 🚀 **Next Steps**

### If Bug Reproduced:
1. **Document exact conditions** that trigger it
2. **Create minimal reproduction case** with specific config
3. **Test if it's timing-related** by varying delays
4. **Check if it affects other OAuth flows** (non-MCP)

### If Bug Not Reproduced:
1. **Try with real-world OAuth servers** (if available)
2. **Test with HTTPS endpoints** (might be protocol-related)
3. **Check Cursor's internal logs** for more details
4. **Test with different MCP configurations**

## 🎪 **Quick Test Commands**

```bash
# Test all edge cases quickly
for delay in 0 1000 3000; do
  for variant in standard extra-fields minimal; do
    echo "Testing delay=$delay, variant=$variant"
    RESPONSE_DELAY=$delay DISCOVERY_VARIANT=$variant timeout 30 node src/oauth-edge-case-server.js &
    # Test with Cursor, then kill server
    kill %1
  done
done
```

The goal is to find the specific conditions that cause Cursor 1.4.x to lose track of the cached discovery endpoints and start making invalid requests. Once we identify the trigger, we can create a reliable reproduction case for the development team.

