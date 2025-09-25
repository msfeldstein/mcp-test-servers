#!/usr/bin/env node

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log("🔧 OAuth Debug Setup Script");
console.log("============================");

const mode = process.argv[2] || 'help';

const servers = {
  'repro': {
    name: 'OAuth Reproduction Server',
    file: '../src/oauth-repro-server.js',
    ports: 'Resource: 3001, Auth: 3002'
  },
  'debug': {
    name: 'OAuth Debug Server', 
    file: '../src/oauth-debug-server.js',
    ports: 'Resource: 3003, Auth: 3004'
  },
  'callback': {
    name: 'OAuth Callback Test Server',
    file: '../src/oauth-callback-test-server.js', 
    ports: 'Server: 3005'
  }
};

function showHelp() {
  console.log("Usage: node oauth-debug-setup.js <mode>");
  console.log("");
  console.log("Available modes:");
  Object.entries(servers).forEach(([key, server]) => {
    console.log(`  ${key.padEnd(10)} - ${server.name} (${server.ports})`);
  });
  console.log("  all        - Start all servers in parallel");
  console.log("  help       - Show this help message");
  console.log("");
  console.log("Examples:");
  console.log("  node scripts/oauth-debug-setup.js repro");
  console.log("  node scripts/oauth-debug-setup.js all");
  console.log("");
  console.log("After starting servers, see oauth-debug-scenarios.md for test procedures.");
}

function startServer(key, server) {
  console.log(`🚀 Starting ${server.name}...`);
  console.log(`   Ports: ${server.ports}`);
  
  const serverPath = join(__dirname, server.file);
  const child = spawn('node', [serverPath], {
    stdio: 'inherit',
    cwd: join(__dirname, '..')
  });
  
  child.on('error', (error) => {
    console.error(`❌ Failed to start ${server.name}:`, error.message);
  });
  
  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`❌ ${server.name} exited with code ${code}`);
    } else {
      console.log(`✅ ${server.name} stopped cleanly`);
    }
  });
  
  return child;
}

function startAllServers() {
  console.log("🚀 Starting all OAuth debug servers...");
  console.log("");
  
  const processes = [];
  
  Object.entries(servers).forEach(([key, server]) => {
    const child = startServer(key, server);
    processes.push(child);
  });
  
  console.log("");
  console.log("📋 All servers started! Use Ctrl+C to stop all servers.");
  console.log("");
  console.log("🔗 Quick test URLs:");
  console.log("   http://localhost:3001/.well-known/oauth-protected-resource");
  console.log("   http://localhost:3003/debug/requests");
  console.log("   http://localhost:3005/debug/simulate-callback");
  console.log("");
  
  // Handle Ctrl+C to stop all processes
  process.on('SIGINT', () => {
    console.log("\n🛑 Stopping all servers...");
    processes.forEach(child => {
      child.kill('SIGTERM');
    });
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  });
  
  // Keep the script running
  processes.forEach(child => {
    child.on('exit', () => {
      const stillRunning = processes.some(p => !p.killed && p.exitCode === null);
      if (!stillRunning) {
        console.log("✅ All servers stopped");
        process.exit(0);
      }
    });
  });
}

// Main execution
switch (mode) {
  case 'help':
    showHelp();
    break;
    
  case 'all':
    startAllServers();
    break;
    
  default:
    if (servers[mode]) {
      startServer(mode, servers[mode]);
    } else {
      console.error(`❌ Unknown mode: ${mode}`);
      console.log("");
      showHelp();
      process.exit(1);
    }
    break;
}
