#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const RESOURCE_URI = "ui://ui-server/example";
const UI_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>MCP UI Tool Caller</title>
    <style>
      :root {
        --bg: #ffffff;
        --bg-alt: #f6f7f9;
        --text: #202124;
        --muted: #61656c;
        --border: #d6dae0;
      }
      body {
        margin: 0;
        padding: 16px;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .card {
        border: 1px solid var(--border);
        background: var(--bg-alt);
        border-radius: 10px;
        padding: 16px;
      }
      h1 {
        margin: 0 0 8px;
        font-size: 18px;
      }
      p {
        margin: 0 0 16px;
        color: var(--muted);
        font-size: 13px;
      }
      button {
        border: 1px solid var(--border);
        background: #fff;
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 13px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .actions {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }
      .time {
        font-size: 13px;
        margin-top: 12px;
      }
      .status {
        margin-top: 8px;
        font-size: 12px;
        color: var(--muted);
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>MCP AppUI Allowlist Demo</h1>
      <p>Click the button to call the <code>get-time</code> tool from inside the iframe.</p>
      <div class="actions">
        <button id="timeBtn">Get time</button>
        <button id="contextBtn">Add current time to prompt context</button>
        <button id="sendBtn">Send</button>
      </div>
      <div class="time" id="timeDisplay">Time: --</div>
      <div class="status" id="status">Ready.</div>
    </div>

    <script type="module">
      let nextId = 1;
      const pending = new Map();

      const timeBtn = document.getElementById("timeBtn");
      const contextBtn = document.getElementById("contextBtn");
      const sendBtn = document.getElementById("sendBtn");
      const timeDisplay = document.getElementById("timeDisplay");
      const status = document.getElementById("status");

      function sendRequest(method, params) {
        const id = nextId++;
        window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
        return new Promise((resolve, reject) => {
          pending.set(id, { resolve, reject });
        });
      }

      function sendNotification(method, params) {
        window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
      }

      function setStatus(text) {
        status.textContent = text;
      }

      async function callGetTime() {
        timeBtn.disabled = true;
        setStatus("Calling get-time...");
        try {
          const result = await sendRequest("tools/call", { name: "get-time", arguments: {} });
          const time = result?.structuredContent?.time || result?.content?.[0]?.text || "unknown";
          timeDisplay.textContent = "Time: " + time;
          setStatus("Rendered time from get-time.");
        } catch (error) {
          setStatus("get-time failed: " + (error?.message || "unknown error"));
        } finally {
          timeBtn.disabled = false;
        }
      }

      function getCurrentTimeMessage() {
        const now = new Date().toISOString();
        return "The current time is " + now;
      }

      async function updateModelContextWithTime() {
        contextBtn.disabled = true;
        setStatus("Updating model context with current time...");
        try {
          const text = getCurrentTimeMessage();
          await sendRequest("ui/update-model-context", {
            content: [{ type: "text", text }],
            structuredContent: { currentTime: text },
          });
          timeDisplay.textContent = "Time: " + text.replace("The current time is ", "");
          setStatus("Model context updated with current time.");
        } catch (error) {
          setStatus("update-model-context failed: " + (error?.message || "unknown error"));
        } finally {
          contextBtn.disabled = false;
        }
      }

      async function sendCurrentTimeMessage() {
        sendBtn.disabled = true;
        setStatus("Sending message...");
        try {
          const text = getCurrentTimeMessage();
          await sendRequest("ui/message", {
            role: "user",
            content: [{ type: "text", text }],
          });
          timeDisplay.textContent = "Time: " + text.replace("The current time is ", "");
          setStatus("IVE SENT IT");
        } catch (error) {
          setStatus("ui/message failed: " + (error?.message || "unknown error"));
        } finally {
          sendBtn.disabled = false;
        }
      }

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;

        if (message.id && pending.has(message.id)) {
          const { resolve, reject } = pending.get(message.id);
          pending.delete(message.id);
          if (message.error) reject(message.error);
          else resolve(message.result);
        }
      });

      timeBtn.addEventListener("click", callGetTime);
      contextBtn.addEventListener("click", updateModelContextWithTime);
      sendBtn.addEventListener("click", sendCurrentTimeMessage);

      async function initialize() {
        try {
          await sendRequest("ui/initialize", {
            protocolVersion: "2026-01-26",
            clientInfo: { name: "UI Example View", version: "1.0.0" },
            appCapabilities: { availableDisplayModes: ["inline"] },
          });
          sendNotification("ui/notifications/initialized", {});
          setStatus("Initialized.");
        } catch (error) {
          setStatus("Initialize failed: " + (error?.message || "unknown error"));
        }
      }

      initialize();
    </script>
  </body>
</html>`;

const server = new McpServer({
  name: "ui-server",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {},
  },
});

registerAppTool(
  server,
  "show-ui",
  {
    title: "Show UI",
    description: "Renders a UI with a button that calls the get-time tool.",
    inputSchema: z.object({}),
    _meta: {
      ui: {
        resourceUri: RESOURCE_URI,
      },
    },
  },
  async () => {
    console.warn("show-ui", ">>>>> show-ui BEING CALLED");
    return {
    content: [
      {
        type: "text",
        text: "Rendered AppUI demo. Use the Get time button in the iframe.",
      },
    ],
  };
});

server.tool("get-time", z.object({}), async () => {
  const now = new Date().toISOString();
  return {
    content: [{ type: "text", text: now }],
    structuredContent: { time: now },
  };
});

registerAppResource(
  server,
  "UI Tool Caller",
  RESOURCE_URI,
  {
    mimeType: RESOURCE_MIME_TYPE,
    _meta: {
      ui: {
        prefersBorder: true,
      },
    },
  },
  async () => ({
    contents: [
      {
        uri: RESOURCE_URI,
        mimeType: RESOURCE_MIME_TYPE,
        text: UI_HTML,
      },
    ],
  })
);

await server.connect(new StdioServerTransport());
