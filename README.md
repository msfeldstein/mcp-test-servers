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
- `crash-on-startup`: Server that crashes on startup
- `combined`: Server with tools and resources
- `duplicate-names`: Server with duplicate names for resources
- `enum-param`: Tool has enum string parameter
- `env-check`: Checks for SHOULD_RUN environment variable being passed properly
- `env-echo`: Echoes the environment variables
- `image`: Tool returns an image of sonic the hedgehog
- `long-description`: Publicize a very long description configured via env var
- `many-resources`: Server with multiple resources
- `many-tools`: Server with 100 tools that each return 'ack'
- `named`: Server with configurable name via MCP_SERVER_NAME environment variable
- `number-param`: Tool with a number parameter
- `optional-param`: Tool has an optional param
- `pattern-param`: Tool has a parameter with a pattern match
- `ping`: A simple server that responds with 'pong'
- `resource`: Resource server implementation
- `stderr`: Server that logs to stderr
- `stdout` Servert that illegally logs to stdout

# Remote Servers

```
# Streamable HTTP
npm run http-ping

# SSE
npm run sse-ping
```