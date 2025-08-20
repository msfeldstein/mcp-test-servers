#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serversJsonPath = join(__dirname, '..', 'servers.json');

function addServer(name, displayName, description, file) {
  // Load existing servers
  const serversConfig = JSON.parse(readFileSync(serversJsonPath, 'utf8'));
  
  // Check if server already exists
  if (serversConfig.servers.find(s => s.name === name)) {
    console.error(`Server '${name}' already exists!`);
    process.exit(1);
  }
  
  // Add new server
  const newServer = {
    name,
    displayName,
    description,
    file,
    type: 'node'
  };
  
  serversConfig.servers.push(newServer);
  
  // Sort servers alphabetically by name
  serversConfig.servers.sort((a, b) => a.name.localeCompare(b.name));
  
  // Write back to file
  writeFileSync(serversJsonPath, JSON.stringify(serversConfig, null, 2));
  
  console.log(`✅ Added server '${name}' to servers.json`);
  console.log(`📝 Remember to create the server file: ${file}`);
}

// Parse command line arguments
const [,, name, displayName, description, file] = process.argv;

if (!name || !displayName || !description || !file) {
  console.error('Usage: node add-server.js <name> <displayName> <description> <file>');
  console.error('Example: node add-server.js "my-server" "My Server" "A cool server" "./my-server.js"');
  process.exit(1);
}

addServer(name, displayName, description, file);
