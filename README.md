# MCP Test Servers

This package provides a collection of simple MCP (Model Context Protocol) servers for testing and demonstration purposes.

## Available Servers

### Ping Server
A simple server that provides a single tool called "ping" which returns "pong".

To run:
```bash
# Using npm script
npm run ping

# Using npx (after npm link)
npx mcp-test-servers ping

# Using npx (after publishing)
npx @msfeldstein/mcp-test-servers ping
```

### Resource Server
A server that provides a simple text resource with the content "Hello, world".

To run:
```bash
# Using npm script
npm run resource

# Using npx (after npm link)
npx mcp-test-servers resource

# Using npx (after publishing)
npx @msfeldstein/mcp-test-servers resource
```

The resource server exposes:
- Resource URI: `test://hello.txt`
- MIME Type: `text/plain`
- Content: "Hello, world"

### Combined Server
A server that combines both the ping tool and the text resource functionality.

To run:
```bash
# Using npm script
npm run combined

# Using npx (after npm link)
npx mcp-test-servers combined

# Using npx (after publishing)
npx @msfeldstein/mcp-test-servers combined
```

The combined server provides:
- The "ping" tool that returns "pong"
- A text resource at `test://hello.txt` containing "Hello, world"

### Broken Tool Server
A server that starts successfully but has a tool that crashes when called. Useful for testing error handling in tool execution.

To run:
```bash
# Using npm script
npm run broken-tool

# Using npx (after npm link)
npx mcp-test-servers broken-tool

# Using npx (after publishing)
npx @msfeldstein/mcp-test-servers broken-tool
```

The broken-tool server provides:
- A "crash" tool that throws an error when called
- Error message: "This tool is intentionally broken!"

### Crash On Startup Server
A server that crashes immediately during initialization. Useful for testing server startup error handling.

To run:
```bash
# Using npm script
npm run crash-on-startup

# Using npx (after npm link)
npx mcp-test-servers crash-on-startup

# Using npx (after publishing)
npx @msfeldstein/mcp-test-servers crash-on-startup
```

The crash-on-startup server:
- Throws an error before MCP server initialization
- Error message: "Server crashed during startup!"

### Environment Check Server
A server that demonstrates environment variable validation. The server will only start if the SHOULD_RUN environment variable is set to "true".

To run:
```bash
# Using npm script with environment variable
SHOULD_RUN=true npm run env-check

# Using npx (after npm link)
SHOULD_RUN=true npx mcp-test-servers env-check

# Using npx (after publishing)
SHOULD_RUN=true npx @msfeldstein/mcp-test-servers env-check
```

The env-check server provides:
- A "status" tool that confirms the server is running
- Crashes on startup if SHOULD_RUN is not set to "true"
- Error message: "SHOULD_RUN environment variable must be set to 'true' to start this server"

## Development

To work on this project locally:

1. Clone the repository
2. Install dependencies: `npm install`
3. Link the package: `npm link`
4. Run any server using the commands above

## Publishing

To publish this package:

1. Make sure you're logged in to npm with the correct account:
   ```bash
   npm login
   ```

2. Publish the package:
   ```bash
   npm publish
   ```

Note: This package is published under the `@msfeldstein` namespace and is configured for public access.

## License
ISC 