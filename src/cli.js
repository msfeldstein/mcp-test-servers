#!/usr/bin/env node

const serverType = process.argv[2];

if (!serverType) {
  console.error('Please specify a server type - ping, resource, combined, broken-tool, crash-on-startup, env-check, env-echo, many-resources, duplicate-names, image, big-response, date, time, many-tools, named, long-description, enum-param, number-param, all-types, pattern-param, stdout, math, long-running, structured-output, prompts, string-escape');
  console.error('Example: npx @msfeldstein/mcp-test-servers ping');
  process.exit(1);
}

switch (serverType) {
  case 'all-types':
    import('./all-types-server.js');
    break;
  case 'bad-param':
    import('./bad-param-server.js');
    break;
  case 'big-response':
    import('./big-response-server.js');
    break;
  case 'broken-tool':
    import('./broken-tool-server.js');
    break;
  case 'crash-on-startup':
    import('./crash-on-startup-server.js');
    break;
  case 'combined':
    import('./combined-server.js');
    break;
  case 'duplicate-names':
    import('./duplicate-names-server.js');
    break;
  case 'enum-param':
    import('./enum-param-server.js');
    break;
  case 'env-check':
    import('./env-check-server.js');
    break;
  case 'env-echo':
    import('./env-echo-server.js');
    break;
  case 'image':
    import('./image-server.js');
    break;
  case 'long-description':
    import('./long-description-server.js');
    break;
  case 'long-running':
    import('./long-running-server.js');
    break;
  case 'many-resources':
    import('./many-resources-server.js');
    break;
  case 'many-tools':
    import('./many-tools-server.js');
    break;
  case 'math':
    import('./math-server.js');
    break;
  case 'named':
    import('./named-server.js');
    break;
  case 'number-param':
    import('./number-param-server.js');
    break;
  case 'optional-param':
    import('./optional-param-server.js');
    break;
  case 'pattern-param':
    import('./pattern-param-server.js');
    break;
  case 'ping':
    import('./ping-server.js');
    break;
  case 'prompts':
    import('./prompts-server.js');
    break;
  case 'resource':
    import('./resource-server.js');
    break;
  case 'stderr':
    import('./stderr-server.js');
    break;
  case 'stdout':
    import('./stdout-server.js');
    break;
  case 'string-escape':
    import('./string-escape-server.js');
    break;
  case 'dynamic-tools':
    import('./dynamic-tools-server.js');
    break;
  case 'root-echo':
    import('./root-echo-server.js');
    break;
  case 'structured-output':
    import('./structured-output-server.js');
    break;
  default:
    console.error('Unknown server type:', serverType);
    process.exit(1);
} 