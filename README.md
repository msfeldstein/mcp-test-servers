# MCP Test Servers

A collection of test servers implementing the Model Context Protocol (MCP).

```
npx -y @msfeldstein/mcp-test-servers <server>
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
- `enum-param`: Tool has enum string parameter
- `env-check`: Checks for SHOULD_RUN environment variable being passed properly
- `env-echo`: Echoes the environment variables
- `headers`: FastMCP server that safely returns HTTP header information
- `image`: Tool returns an image of sonic the hedgehog
- `long-description`: Publicize a very long description configured via env var
- `long-running`: Server that sends progress notifications every 2 seconds for a 20-second task
- `many-resources`: Server with multiple resources
- `many-tools`: Server with 100 tools that each return 'ack'
- `math`: Server with basic math function tools (add, subtract, multiply, divide, power, sqrt, factorial)
- `missing-type`: Server with tools missing the required 'type' field in parameter schemas
- `missing-type-fastmcp`: FastMCP server with genuinely missing 'type' fields in tool schemas
- `named`: Server with configurable name via MCP_SERVER_NAME environment variable
- `number-param`: Tool with a number parameter
- `optional-param`: Tool has an optional param
- `pattern-param`: Tool has a parameter with a pattern match
- `ping`: A simple server that responds with 'pong'
- `prompts`: Server with two prompts - one static greeting and one dynamic story generator with character name and location parameters
- `raw-broken`: Raw JSON-RPC MCP server with genuinely broken schemas (no framework validation)
- `resource`: Resource server implementation
- `roots-echo`: Server that demonstrates MCP roots functionality by echoing back the roots provided by the client
- `stderr`: Server that logs to stderr
- `structured-output`: Demonstrates structuredContent responses with a simple echo tool

# Remote Servers

```
# Streamable HTTP
npm run http-ping

# SSE
npm run sse-ping
```
