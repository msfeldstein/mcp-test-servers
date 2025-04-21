#!/usr/bin/env node

const serverType = process.argv[2];

if (!serverType) {
  console.error('Please specify a server type: ping, resource, combined, broken-tool, crash-on-startup, env-check, env-echo, many-resources, duplicate-names, image, big-response, date, time, many-tools, named, long-description');
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
  case 'combined':
    import('./combined-server.js');
    break;
  case 'broken-tool':
    import('./broken-tool-server.js');
    break;
  case 'crash-on-startup':
    import('./crash-on-startup-server.js');
    break;
  case 'env-check':
    import('./env-check-server.js');
    break;
  case 'env-echo':
    import('./env-echo-server.js');
    break;
  case 'many-resources':
    import('./many-resources-server.js');
    break;
  case 'duplicate-names':
    import('./duplicate-names-server.js');
    break;
  case 'image':
    import('./image-server.js');
    break;
  case 'big-response':
    import('./big-response-server.js');
    break;
  case 'date':
    import('./date-server.js');
    break;
  case 'time':
    import('./time-server.js');
    break;
  case 'many-tools':
    import('./many-tools-server.js');
    break;
  case 'named':
    import('./named-server.js');
    break;
  case 'bad-param':
    import('./bad-param-server.js');
    break;
  case 'stderr':
    import('./stderr-server.js');
    break;
  case 'optional-param':
    import('./optional-param-server.js');
    break;
  case 'long-description':
    import('./long-description-server.js');
    break;
  default:
    console.error('Unknown server type:', serverType);
    console.error('Available types: ping, resource, combined, broken-tool, crash-on-startup, env-check, env-echo, many-resources, duplicate-names, image, big-response, date, time, many-tools, named, long-description');
    process.exit(1);
} 