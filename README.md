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