#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps/server";

const RESOURCE_URI = "ui://tldraw-server/main";
const TLDRAW_VERSION = "3.12.2";

const diagramNodeSchema = z.object({
  id: z.string().optional().describe("Stable node id used by edges."),
  text: z.string().describe("Label rendered inside the node."),
  x: z.number().optional().describe("Node x position in canvas coordinates."),
  y: z.number().optional().describe("Node y position in canvas coordinates."),
  width: z.number().optional().describe("Optional node width. Defaults to 220."),
  height: z.number().optional().describe("Optional node height. Defaults to 100."),
});

const diagramEdgeSchema = z.object({
  from: z.string().describe("Source node id."),
  to: z.string().describe("Destination node id."),
  label: z.string().optional().describe("Optional edge label."),
});

const diagramToolInputSchema = z.object({
  title: z.string().optional().describe("Optional diagram title."),
  description: z.string().optional().describe("Optional short description."),
  reset: z
    .boolean()
    .optional()
    .describe("If true (default), clear the current page before drawing."),
  nodes: z
    .array(diagramNodeSchema)
    .optional()
    .describe("Nodes to render as rounded rectangles."),
  edges: z
    .array(diagramEdgeSchema)
    .optional()
    .describe("Directed arrows connecting nodes by id."),
});

const UI_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>tldraw Diagram UI</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/tldraw@${TLDRAW_VERSION}/tldraw.css" />
    <style>
      :root {
        --bg: #ffffff;
        --panel: #f8fafc;
        --text: #111827;
        --muted: #4b5563;
        --border: #d1d5db;
      }
      body {
        margin: 0;
        padding: 0;
        background: var(--bg);
        color: var(--text);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      .shell {
        height: 640px;
        min-height: 640px;
        display: flex;
        flex-direction: column;
      }
      .toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        border-bottom: 1px solid var(--border);
        background: var(--panel);
        padding: 10px 12px;
      }
      .title-block {
        margin-right: auto;
      }
      .title-block .title {
        font-size: 14px;
        font-weight: 600;
      }
      .title-block .subtitle {
        font-size: 12px;
        color: var(--muted);
      }
      button {
        border: 1px solid var(--border);
        border-radius: 8px;
        background: #fff;
        color: var(--text);
        padding: 7px 12px;
        font-size: 12px;
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.6;
        cursor: default;
      }
      .status {
        border-bottom: 1px solid var(--border);
        padding: 6px 12px;
        font-size: 12px;
        color: var(--muted);
      }
      #tldraw-root {
        flex: 1;
        min-height: 0;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="toolbar">
        <div class="title-block">
          <div class="title">tldraw Diagram UI</div>
          <div class="subtitle">The agent can call show-diagram-ui with nodes and edges to render a diagram.</div>
        </div>
        <button id="sampleBtn">Load sample diagram</button>
        <button id="contextBtn">Add summary to model context</button>
      </div>
      <div class="status" id="status">Initializing...</div>
      <div id="tldraw-root"></div>
    </div>

    <script type="module">
      import React from "https://esm.sh/react@18.2.0";
      import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
      import { Tldraw, createShapeId, toRichText } from "https://esm.sh/tldraw@${TLDRAW_VERSION}?deps=react@18.2.0,react-dom@18.2.0";

      const statusEl = document.getElementById("status");
      const sampleBtn = document.getElementById("sampleBtn");
      const contextBtn = document.getElementById("contextBtn");
      const rootEl = document.getElementById("tldraw-root");

      let editor = null;
      let nextId = 1;
      let pending = new Map();
      let latestDiagramInput = null;
      let latestSummary = "No diagram has been drawn yet.";

      function setStatus(text) {
        statusEl.textContent = text;
      }

      function sendRequest(method, params) {
        const id = nextId++;
        window.parent.postMessage({ jsonrpc: "2.0", id, method, params }, "*");
        return new Promise((resolve, reject) => {
          const timeoutId = window.setTimeout(() => {
            pending.delete(id);
            reject(new Error("Request timeout: " + method));
          }, 4000);
          pending.set(id, { resolve, reject, timeoutId });
        });
      }

      function sendNotification(method, params) {
        window.parent.postMessage({ jsonrpc: "2.0", method, params }, "*");
      }

      function toFiniteNumber(value, fallback) {
        const n = Number(value);
        return Number.isFinite(n) ? n : fallback;
      }

      function summarize(diagram) {
        const nodeCount = diagram.nodes.length;
        const edgeCount = diagram.edges.length;
        const title = diagram.title ? '"' + diagram.title + '"' : "Untitled";
        const description = diagram.description ? " Description: " + diagram.description : "";
        return title + " with " + nodeCount + " node(s) and " + edgeCount + " edge(s)." + description;
      }

      function normalizeDiagramInput(input) {
        const raw = input && typeof input === "object" ? input : {};
        const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
        const edges = Array.isArray(raw.edges) ? raw.edges : [];
        return {
          title: typeof raw.title === "string" ? raw.title : "",
          description: typeof raw.description === "string" ? raw.description : "",
          reset: raw.reset !== false,
          nodes: nodes.map((node, idx) => {
            const id = typeof node?.id === "string" && node.id.trim().length > 0
              ? node.id.trim()
              : "node-" + (idx + 1);
            return {
              id,
              text: typeof node?.text === "string" && node.text.length > 0 ? node.text : id,
              x: toFiniteNumber(node?.x, 80 + idx * 280),
              y: toFiniteNumber(node?.y, 120),
              width: Math.max(80, toFiniteNumber(node?.width, 220)),
              height: Math.max(50, toFiniteNumber(node?.height, 100)),
            };
          }),
          edges: edges
            .map((edge) => ({
              from: typeof edge?.from === "string" ? edge.from : "",
              to: typeof edge?.to === "string" ? edge.to : "",
              label: typeof edge?.label === "string" ? edge.label : "",
            }))
            .filter((edge) => edge.from.length > 0 && edge.to.length > 0),
        };
      }

      function clearCurrentPage() {
        if (!editor || typeof editor.getCurrentPageShapeIds !== "function") return;
        const shapeIds = Array.from(editor.getCurrentPageShapeIds());
        if (shapeIds.length > 0) {
          editor.deleteShapes(shapeIds);
        }
      }

      function buildShapes(diagram) {
        const shapes = [];
        const centers = new Map();

        for (const node of diagram.nodes) {
          const shapeId = createShapeId();
          shapes.push({
            id: shapeId,
            type: "geo",
            x: node.x,
            y: node.y,
            props: {
              geo: "rectangle",
              w: node.width,
              h: node.height,
              richText: toRichText(node.text),
              align: "middle",
              verticalAlign: "middle",
              labelColor: "black",
              font: "sans",
              size: "m",
              color: "blue",
              fill: "solid",
            },
          });
          centers.set(node.id, {
            x: node.x + node.width / 2,
            y: node.y + node.height / 2,
          });
        }

        for (const edge of diagram.edges) {
          const from = centers.get(edge.from);
          const to = centers.get(edge.to);
          if (!from || !to) continue;
          shapes.push({
            id: createShapeId(),
            type: "arrow",
            x: from.x,
            y: from.y,
            props: {
              start: { x: 0, y: 0 },
              end: { x: to.x - from.x, y: to.y - from.y },
              text: edge.label,
            },
          });
        }

        return shapes;
      }

      function drawDiagram(input, sourceLabel) {
        if (!editor) {
          latestDiagramInput = input;
          return;
        }
        const diagram = normalizeDiagramInput(input);
        latestDiagramInput = diagram;
        latestSummary = summarize(diagram);

        if (diagram.reset) {
          clearCurrentPage();
        }

        const shapes = buildShapes(diagram);
        if (shapes.length > 0) {
          editor.createShapes(shapes);
          setStatus("Rendered " + shapes.length + " shape(s) from " + sourceLabel + ".");
          return;
        }

        setStatus("No drawable content in " + sourceLabel + ". Provide nodes or edges.");
      }

      function getSampleDiagram() {
        return {
          title: "Incident Response Flow",
          description: "Sample diagram rendered directly in the tldraw UI.",
          reset: true,
          nodes: [
            { id: "alert", text: "Alert Triggered", x: 80, y: 150, width: 220, height: 100 },
            { id: "triage", text: "On-call Triage", x: 380, y: 150, width: 220, height: 100 },
            { id: "fix", text: "Mitigation + Fix", x: 680, y: 150, width: 220, height: 100 },
          ],
          edges: [
            { from: "alert", to: "triage", label: "page" },
            { from: "triage", to: "fix", label: "assign" },
          ],
        };
      }

      async function addSummaryToModelContext() {
        contextBtn.disabled = true;
        try {
          await sendRequest("ui/update-model-context", {
            content: [{ type: "text", text: "Diagram summary: " + latestSummary }],
            structuredContent: { diagramSummary: latestSummary },
          });
          setStatus("Updated model context with the latest diagram summary.");
        } catch (error) {
          setStatus("Could not update model context (" + (error?.message || "unknown error") + ").");
        } finally {
          contextBtn.disabled = false;
        }
      }

      sampleBtn.addEventListener("click", () => {
        drawDiagram(getSampleDiagram(), "local sample");
      });
      contextBtn.addEventListener("click", addSummaryToModelContext);

      window.addEventListener("message", (event) => {
        const message = event.data;
        if (!message || message.jsonrpc !== "2.0") return;

        if (message.id && pending.has(message.id)) {
          const pendingRequest = pending.get(message.id);
          pending.delete(message.id);
          window.clearTimeout(pendingRequest.timeoutId);
          if (message.error) pendingRequest.reject(message.error);
          else pendingRequest.resolve(message.result);
          return;
        }

        if (message.method === "ui/notifications/tool-input") {
          const args = message.params?.arguments || {};
          drawDiagram(args, "tool input");
          return;
        }
      });

      const reactRoot = createRoot(rootEl);
      reactRoot.render(
        React.createElement(Tldraw, {
          onMount: (mountedEditor) => {
            editor = mountedEditor;
            if (latestDiagramInput) {
              drawDiagram(latestDiagramInput, "pending input");
            }
          },
        })
      );

      async function initialize() {
        try {
          await sendRequest("ui/initialize", {
            protocolVersion: "2026-01-26",
            appInfo: { name: "tldraw Diagram UI", version: "1.0.0" },
            appCapabilities: { availableDisplayModes: ["inline"] },
          });
          sendNotification("ui/notifications/initialized", {});
          setStatus("Connected. Waiting for tool input from show-diagram-ui.");
        } catch (error) {
          setStatus("Host unavailable. Running in local preview mode.");
          drawDiagram(getSampleDiagram(), "local preview");
        }
      }

      initialize();
    </script>
  </body>
</html>`;

const server = new McpServer({
  name: "tldraw-server",
  version: "1.0.0",
  capabilities: {
    tools: {},
    resources: {},
  },
});

registerAppTool(
  server,
  "show-diagram-ui",
  {
    title: "Show Diagram UI",
    description:
      "Render a tldraw canvas in MCP Apps. Provide nodes and edges to let the agent draw diagrams.",
    inputSchema: diagramToolInputSchema,
    _meta: {
      ui: {
        resourceUri: RESOURCE_URI,
      },
    },
  },
  async () => ({
    content: [
      {
        type: "text",
        text: "Rendered tldraw diagram UI. Use nodes/edges arguments in show-diagram-ui to draw diagrams.",
      },
    ],
  })
);

registerAppResource(
  server,
  "tldraw Diagram UI",
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
        _meta: {
          ui: {
            csp: {
              resourceDomains: [
                "https://esm.sh",
                "https://cdn.jsdelivr.net",
                "https://assets.tldraw.dev",
              ],
            },
          },
        },
      },
    ],
  })
);

await server.connect(new StdioServerTransport());
