# MCP Test Servers Demo

This repository contains a comprehensive collection of Model Context Protocol (MCP) test servers for testing and development purposes.

## ✅ Working Servers

### 1. **Ping Server** (`ping`)
- **Description**: Simple server that responds with 'pong'
- **Tools**: `ping`, `long-running-ping`, `echo`
- **Use Case**: Basic connectivity testing

### 2. **Math Server** (`math`)
- **Description**: Mathematical operations server
- **Tools**: `add`, `subtract`, `multiply`, `divide`, `power`, `sqrt`, `factorial`
- **Use Case**: Testing numerical operations and parameter validation

### 3. **Image Server** (`image`)
- **Description**: Image generation server
- **Tools**: `generate_image` (returns a red circle image)
- **Use Case**: Testing binary/image content responses

### 4. **Prompts Server** (`prompts`)
- **Description**: Server with prompt templates
- **Tools**: Static greeting and dynamic story generator
- **Use Case**: Testing prompt functionality

### 5. **Structured Output Server** (`structured-output`)
- **Description**: Demonstrates structured content responses
- **Tools**: Simple echo with structured output
- **Use Case**: Testing structured content capabilities

### 6. **Resource Server** (`resource`)
- **Description**: Resource server implementation
- **Use Case**: Testing resource functionality

### 7. **Combined Server** (`combined`)
- **Description**: Server with both tools and resources
- **Use Case**: Testing mixed capabilities

### 8. **Environment Servers**
- **env-echo**: Echoes environment variables
- **env-check**: Checks for SHOULD_RUN environment variable
- **Use Case**: Testing environment variable handling

### 9. **Parameter Testing Servers**
- **enum-param**: Tool with enum string parameter
- **number-param**: Tool with number parameter
- **optional-param**: Tool with optional parameter
- **pattern-param**: Tool with pattern matching parameter
- **all-types**: Demonstrates various parameter types

### 10. **Special Purpose Servers**
- **many-tools**: Server with 100 tools
- **many-resources**: Server with multiple resources
- **long-running**: Server with progress notifications
- **long-description**: Server with very long descriptions

## 🧨 Error Testing Servers

### 1. **Crash on Startup** (`crash-on-startup`)
- **Purpose**: Tests client handling of server crashes
- **Behavior**: Throws error during initialization

### 2. **Broken Tool** (`broken-tool`)
- **Purpose**: Tests client handling of broken tools
- **Behavior**: Tool throws error when called

### 3. **Bad Parameter** (`bad-param`)
- **Purpose**: Tests parameter validation
- **Behavior**: Malformed parameter name

### 4. **Duplicate Names** (`duplicate-names`)
- **Purpose**: Tests duplicate resource name handling
- **Behavior**: Resources with duplicate names

## 🌐 Remote Servers

### HTTP Ping Server
```bash
npm run http-ping
```
- Runs on `http://localhost:3001/mcp`
- Uses StreamableHTTP transport

### SSE Ping Server
```bash
npm run sse-ping
```
- Server-Sent Events implementation

## 🚀 Usage

### Basic Usage
```bash
npx @msfeldstein/mcp-test-servers <server-name>
```

### Examples
```bash
# Test basic ping functionality
npx @msfeldstein/mcp-test-servers ping

# Test math operations
npx @msfeldstein/mcp-test-servers math

# Test image generation
npx @msfeldstein/mcp-test-servers image

# Test error handling
npx @msfeldstein/mcp-test-servers crash-on-startup
```

### Direct Node.js Usage
```bash
node src/cli.js <server-name>
```

## 📋 Available Server Types

- `all-types` - Various parameter types
- `bad-param` - Malformed parameter
- `big-response` - Large responses
- `broken-tool` - Broken tool implementation
- `combined` - Tools and resources
- `crash-on-startup` - Startup crash
- `duplicate-names` - Duplicate resource names
- `enum-param` - Enum parameters
- `env-check` - Environment variable check
- `env-echo` - Environment variable echo
- `image` - Image generation
- `long-description` - Long descriptions
- `long-running` - Long-running operations
- `many-resources` - Multiple resources
- `many-tools` - Multiple tools
- `math` - Mathematical operations
- `named` - Configurable name
- `number-param` - Number parameters
- `optional-param` - Optional parameters
- `pattern-param` - Pattern parameters
- `ping` - Basic ping
- `prompts` - Prompt templates
- `resource` - Resource server
- `root-echo` - Roots functionality
- `stderr` - Stderr logging
- `stdout` - Stdout logging
- `structured-output` - Structured content

## 🔧 Development

### Dependencies
- `@modelcontextprotocol/sdk`: MCP SDK
- `express`: HTTP server (for remote servers)
- `cors`: CORS middleware
- `zod`: Parameter validation

### Project Structure
```
src/
├── cli.js                    # Main CLI entry point
├── ping-server.js           # Basic ping server
├── math-server.js           # Math operations
├── image-server.js          # Image generation
├── http-ping-server.js      # HTTP transport
├── sse-ping-server.js       # SSE transport
└── ...                      # Other server implementations
```

## 🎯 Testing Scenarios

This collection covers:
- ✅ Basic MCP functionality
- ✅ Tool parameter validation
- ✅ Resource handling
- ✅ Error conditions
- ✅ Long-running operations
- ✅ Binary content (images)
- ✅ Structured output
- ✅ Environment variable handling
- ✅ Multiple transport types
- ✅ Edge cases and failures

Perfect for comprehensive MCP client testing and development!