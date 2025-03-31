# MCP Test Servers

A collection of test servers implementing the Model Context Protocol (MCP).

## Available Servers

- `ping`: A simple server that responds with 'pong'
- `resource`: Resource server implementation
- `combined`: Combined server implementation
- `broken-tool`: Server with intentionally broken tool
- `crash-on-startup`: Server that crashes on startup
- `env-check`: Server for environment checking
- `env-echo`: Server that echoes environment variables
- `many-resources`: Server with multiple resources
- `duplicate-names`: Server with duplicate name implementations
- `image`: Server for image handling
- `big-response`: Server that returns large responses
- `date`: Server for date operations
- `time`: Server that returns the current time in ISO format
- `many-tools`: Server with 100 tools that each return 'ack'
- `named`: Server with configurable name via MCP_SERVER_NAME environment variable

## Usage

To run a server, use:

```bash
npx @msfeldstein/mcp-test-servers <server-type>
```

Example:
```bash
npx @msfeldstein/mcp-test-servers time
```

For the named server, you can set a custom name using the MCP_SERVER_NAME environment variable:
```bash
MCP_SERVER_NAME="my-custom-server" npx @msfeldstein/mcp-test-servers named
```

## Server Details

### Ping Server
The ping server provides a simple ping-pong interaction:
- Tool: `ping`
- Returns: "pong"
- No parameters required

### Resource Server
The resource server provides a single text resource:
- Resource name: "Hello World Text"
- URI: "test://hello.txt"
- Content: "Hello, world"
- MIME type: "text/plain"

### Combined Server
The combined server implements both tool and resource capabilities:
- Tool: `ping` - Returns "pong"
- Tool: `fizzbuzz` - Generates a FIZZY sequence up to the specified number
- Resource: "Hello World Text" - Same as resource server

### Broken Tool Server
The broken tool server intentionally throws an error when the tool is called:
- Tool: `crash`
- Behavior: Throws an error with message "This tool is intentionally broken!"

### Crash on Startup Server
This server crashes during initialization, useful for testing error handling.

### Environment Check Server
The env-check server requires an environment variable to run:
- Environment variable: `SHOULD_RUN=true` (required)
- Tool: `status`
- Returns: "Server is running with SHOULD_RUN=true"

### Environment Echo Server
The env-echo server returns all environment variables:
- Tool: `echo_env`
- Returns: A formatted list of all environment variables

### Many Resources Server
The many-resources server provides multiple resources (600):
- Resources: "Resource 1" through "Resource 600"
- Each has unique content and URI

### Duplicate Names Server
The duplicate-names server provides resources with duplicate names:
- Three sets of resources with names "Common Resource", "Duplicate File", and "Same Name Different Content"
- Each name has 3 versions with different content and URIs

### Image Server
The image server provides an image resource:
- Tool: `generate_image`
- Returns: A red circle image in base64 format

### Big Response Server
The big-response server can generate large responses:
- Tool: `generate_big_response`
- Parameter: `stringLength` - The length of the random string to generate
- Returns: A random string of the specified length

### Date Server
The date server provides date operations:
- Tool: Provides date operations (details may vary)

### Time Server
The time server provides a simple tool to get the current time:
- Tool: `get-time`
- Returns: Current time in ISO format
- No parameters required

### Many Tools Server
The many tools server provides 100 simple tools:
- Tools: `tool_1` through `tool_100`
- Each tool returns: 'ack'
- No parameters required

### Named Server
The named server allows testing with custom server names:
- Tool: `<server-name>_get_name` (e.g., "my-custom-server_get_name")
- Returns: The server's configured name
- No parameters required
- Name can be set via MCP_SERVER_NAME environment variable
- Defaults to 'unnamed-server' if no name is provided