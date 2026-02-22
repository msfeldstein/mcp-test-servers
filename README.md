# MCP Test Servers

A collection of test servers implementing the Model Context Protocol (MCP).

## 🚀 Quick Install Gallery

Visit our **[GitHub Pages Gallery](https://msfeldstein.github.io/mcp-test-servers/)** for one-click install buttons that work directly with Cursor!

## Manual Installation

```
npx -y @msfeldstein/mcp-test-servers <server>
```

## Development

Use the cli.js directly for development

```
{
  "mcpServers": {
    "test-server": {
      "command": "/Users/feldstein/Source/mcp-test-servers/src/cli.js",
      "args": [
        "ping"
      ],
      "env": {}
    }
  }
}
```

## Available Servers

- `all-types`: Demonstrates various tool parameter types supported by MCP
- `bad-param`: Server with an intentionally malformed parameter name
- `big-response`: Server that returns large responses
- `broken-tool`: Server with intentionally broken tool
- `broken-schema`: Server with invalid JSON schema using oneOf/allOf/anyOf at top level
- `broken-schema-fastmcp`: FastMCP server with genuinely broken schemas using oneOf/allOf/anyOf at top level
- `crash-on-startup`: Server that crashes on startup
- `combined`: Server with tools and resources
- `duplicate-names`: Server with duplicate names for resources
- `elicitation`: Server demonstrating MCP elicitation feature - requests user information (name, age, contact details, preferences) through structured forms
- `enum-param`: Tool has enum string parameter
- `integer-anyof-bug`: Reproduces Cursor's integer validation bug with anyOf schema - parameters with `{"anyOf": [{"type": "integer"}, {"type": "null"}]}` fail validation with 'got number' error
- `env-check`: Checks for SHOULD_RUN environment variable being passed properly
- `env-echo`: Echoes the environment variables
- `gpt5-breaker`: Server with SQL query execution tool using complex parameter validation
- `graphing`: MCP Apps server with `show-graphing-ui`; UI renders an inline chart with Chart.js
- `headers`: FastMCP server that safely returns HTTP header information
- `instructions`: Server with instructions and a makeRequest tool that returns success for value 42
- `image`: Tool returns an image of sonic the hedgehog
- `long-description`: Publicize a very long description configured via env var
- `long-running`: Server that sends progress notifications every 2 seconds for a 20-second task
- `many-resources`: Server with multiple resources
- `many-tools`: Server with 100 tools that each return 'ack'
- `math`: Server with basic math function tools (add, subtract, multiply, divide, power, sqrt, factorial)
- `missing-type`: Server with tools missing the required 'type' field in parameter schemas
- `missing-type-fastmcp`: FastMCP server with genuinely missing 'type' fields in tool schemas
- `named`: Server with configurable name via MCP_SERVER_NAME environment variable
- `notion-gemini-repro`: Server with complex nested schema that breaks on some models (Notion API reproduction case) - inline schema
- `notion-gemini-repro-raw`: Server with complex nested schema that breaks on some models (Notion API reproduction case) - exact raw schema object
- `number-param`: Tool with a number parameter
- `oauth-repro`: Reproduces OAuth 2.0 flow issues with proper discovery endpoints - runs resource server on port 3001 and auth server on port 3002
- `oauth-debug`: OAuth debugging server with comprehensive logging and endpoint tracking - runs resource server on port 3003 and auth server on port 3004
- `oauth-callback-test`: OAuth callback testing server that simulates Cursor 1.4.x endpoint discovery bugs - runs on port 3005
- `oauth-edge-case`: OAuth server with configurable edge cases to trigger discovery bugs - resource server on port 3006, auth server on port 3007
- `oauth-bug-trigger`: Specialized server designed to reproduce the exact Cursor 1.4.x OAuth discovery bug - resource server on port 3008, auth server on port 3009
- `optional-param`: Tool has an optional param
- `pattern-param`: Tool has a parameter with a pattern match
- `ping`: A simple server that responds with 'pong'
- `prompts`: Server with two prompts - one static greeting and one dynamic story generator with character name and location parameters
- `raw-broken`: Raw JSON-RPC MCP server with genuinely broken schemas (no framework validation)
- `resource`: Resource server implementation
- `resource-lister`: Server that publishes 5 resources and has a tool to list them
- `roots-echo`: Server that demonstrates MCP roots functionality by echoing back the roots provided by the client
- `session-inactivity`: Streamable HTTP server that expires sessions after 30 seconds of inactivity to test session management
- `session-management`: HTTP server that implements MCP session management behavior - assigns session IDs, requires them in requests, returns 404 for terminated sessions
- `sse-timeout`: Streamable HTTP server that establishes SSE connections but times out after 30 seconds to test client reconnection
- `stderr`: Server that logs to stderr
- `structured-output`: Demonstrates structuredContent responses with a simple echo tool
- `ui`: MCP Apps server with `show-ui`; the rendered UI button calls the `get-time` tool and shows the current time inline
- `dual-content`: Demonstrates different outputs for structuredContent and content in the same response
- `everything`: Comprehensive server testing all MCP features - tools with/without params, resources, prompts, elicitation, dynamic tools, roots echo, env vars

## 🚀 Quick Start: Automated Testing

For instant comprehensive testing, use the built-in AI agent testing prompt:

1. Start the everything server: `npx @msfeldstein/mcp-test-servers everything`
2. In Cursor, use the slash command: `/test-everything`
3. The AI will automatically execute all 20 test steps and provide a complete validation report

# Test Plan for Everything Server

The `everything` server is designed to comprehensively test all MCP features. Here's how to test each feature:

## Tools Testing

### 0. Setup

```
{
    "mcpServers": {
        "everything": {
            "command": "npx @msfeldstein/mcp-test-servers everything",
            "env": {
                "MY_ENV_VAR": "My Special Token"
            }
        }
    }
}
```

### 1. Tool with Parameters

**Tool:** `echo_with_params`
**Test:** Call with various parameter combinations:

```

- message: "Hello World", repeat_count: 3, uppercase: true
- message: "Test", repeat_count: 1, uppercase: false
- message: "MCP" (using defaults)

```

**Expected:** Should echo the message with specified repetitions and case transformation.

### 2. Tool without Parameters

**Tool:** `simple_ping`
**Test:** Call without any parameters
**Expected:** Should return "pong"

### 3. Tool Returning Mixed Content

**Tool:** `get_mixed_resources`
**Test:** Call the tool
**Expected:** Should return both text content and a small test image in the same response

### 4. Elicitation Testing

**Tool:** `test_all_elicitations`
**Test:** Call the tool and respond to all prompts:

- String input (name)
- Boolean input (programming preference)
- Number input (years of experience, 0-50)
- Enum input (programming language selection)
  **Expected:** Should collect all inputs and display a summary

### 5. Dynamic Tool Management

**Tool:** `toggle_dynamic_tool`
**Test:**

1. Call `toggle_dynamic_tool` to enable the dynamic tool
2. Verify `dynamic_feature` tool becomes available
3. Call `dynamic_feature` with optional action parameter
4. Call `toggle_dynamic_tool` again to disable
5. Verify `dynamic_feature` tool is no longer available
   **Expected:** Tool availability should change dynamically

### 6. MCP Roots Echo

**Tool:** `echo_mcp_roots`
**Test:** Call the tool
**Expected:** Should return JSON representation of MCP roots provided by the client

### 7. Environment Variable Echo

**Tool:** `echo_env_var`
**Test:** prompt: "Call the echo_env_var MCP tool"
**Expected:** Should return "MY_ENV_VAR = My Special Token"

### 8. Long-Running Progress Tool

**Tool:** `long_running_progress`
**Test:** Call with optional task_name parameter
**Expected:** Should run for 20 seconds with progress updates every 2 seconds, showing:

- Progress from 0 to 10 (total steps)
- Descriptive messages for each step
- Final completion message
- Client should receive progress notifications

## Resources Testing

### 9. Text Resource

**Resource:** `everything://docs.txt`
**Test:** Request the resource
**Expected:** Should return comprehensive documentation about the server

### 10. Image Resource

**Resource:** `everything://test-image.png`
**Test:** Request the resource
**Expected:** Should return a small test image in PNG format

## Prompts Testing

### 11. Prompt without Parameters

**Prompt:** `simple-greeting`
**Test:** Type /sim and /simple-greeting should be suggested. Submit it.
**Expected:** Should return a friendly greeting message about the Everything Server

### 12. Prompt with Parameters

**Prompt:** `personalized-message`
**Test:** submit /personalized-message:

- name: "Alice"
- topic: "AI Development"
  **Expected:** Should return a personalized message mentioning Alice and AI Development

### 13. AI Agent Testing Prompt

**Prompt:** `test-everything`
**Test:** Use this prompt in Cursor with a slash command: `/test-everything`
**Expected:** Should return comprehensive step-by-step testing instructions for an AI agent to systematically test all MCP features
**Usage:** Perfect for automated testing - the AI will execute all 20 testing steps automatically and provide a complete validation report

## Complete Test Sequence

1. **Setup:** Set `MY_ENV_VAR="My Special Token"` in environment
2. **Basic Tools:** Test `simple_ping` and `echo_with_params``
3. **Mixed Content:** Test `get_mixed_resources`
4. **Elicitation:** Run through `test_all_elicitations` completely
5. **Dynamic Tools:** Toggle dynamic tool on/off and test availability
6. **System Info:** Test `echo_mcp_roots` and `echo_env_var`
7. **Long-Running:** Test `long_running_progress` with progress notifications
8. **Resources:** Fetch both text and image resources
9. **Prompts:** Test both parameterized and non-parameterized prompts

This comprehensive test ensures all MCP protocol features are working correctly.
