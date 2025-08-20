#!/usr/bin/env node

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load servers configuration
const serversConfig = JSON.parse(readFileSync(join(__dirname, '..', 'servers.json'), 'utf8'));
const servers = serversConfig.servers;

const serverType = process.argv[2];

if (!serverType) {
  const serverNames = servers.map(s => s.name).join(', ');
  console.error(`Please specify a server type - ${serverNames}`);
  console.error('Example: npx @msfeldstein/mcp-test-servers ping');
  process.exit(1);
}

// Find the server configuration
const serverConfig = servers.find(s => s.name === serverType);

if (!serverConfig) {
  console.error('Unknown server type:', serverType);
  const serverNames = servers.map(s => s.name).join(', ');
  console.error(`Available servers: ${serverNames}`);
  process.exit(1);
}

// Execute the Node.js server
import(serverConfig.file); 