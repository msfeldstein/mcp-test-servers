#!/usr/bin/env node

const serverType = process.argv[2];

if (!serverType) {
  console.error('Please specify a server type: ping or resource');
  console.error('Example: npx @msfeldstein/mcp-test-servers ping');
  process.exit(1);
}

switch (serverType) {
  case 'ping':
    import('./ping-server.js');
    break;
  case 'resource':
    import('./resource-server.js');
    break;
  default:
    console.error('Unknown server type:', serverType);
    console.error('Available types: ping, resource');
    process.exit(1);
} 