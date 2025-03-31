#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create a new MCP server with stdio transport
const server = new McpServer({
  name: "image-server",
  version: "1.0.0",
  capabilities: {
    tools: {
      generate_image: {
        description: "A tool that returns a red circle image",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
  },
});

// Replace this placeholder with your actual base64 encoded red circle image
const RED_CIRCLE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAS1SURBVHgB7Z3tTSMxEIaH0xWQ6yBUQOggVAAdABUkVBCoIFBBQgWBCqADoAKgAujAd69WPqIcIR+3zIw97yNZK+VXdv3sePyx9k76g5Cw/BASGgoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQHAoQnJ9SM+/vIvf3Iq+vIo+PIi8vTQH5mul0RLrdj2uvJ7K311zxW6XsVPdlECr89lbk5ubfSt4WSIByfCzS70tN1CFArvTptHnrvxNEB0hQiwypZGazlPp9GGxTer2UptNUMmUKgIrvdu0qfrHgvxQqQllNAEL9xUVz9Qiah7u75loIZXQD0a6fnYkcHPitfICkc3e3kbQQ/EcAPFRUfFsZvRaFRAPfEeD6WmR/v7zKB/jP+O9XV+Ka5JXzcz9J3v8W3ItTfAowHJZTuesW3JND/OUAp6fNgE6NnJyITCbiCV85ADL9Wisf4N5wj55IXqipzS8oJ/AhwOVlOZXXVnEycmifA+Tu0ndP4ngDU8wPD+bjBPYCYOSsxH5+G6DyIYHhegPbJBBDplErH+DejYeN7SJAHjcnzZCx0doCuwiA8X3SYBgFbARAfzhy6F8EM5xYwmaATRMQOfFbBhLC52fRRj8C8O3/HDwTgyigL4D36VFLDJ6NrgBo67A+n3wOno/yiiddAbDAg3wNlrcropsEMvlbDUYF395EC70IgNDGyl9N/pxNCT0BGP7XR7EZ0BOAyd/6KHYHdXIAhLVfv4RsAPIAhVlCnQjAt39zlPIAHQGenoRsCPY0UIARwCtKz0xHAHb/NkfpmekIEG29XxtUJQAjgFt0uoE7O0K2QKFquE1ccChAcChAcHQEKGjPHDcofSzCCOAVpZeGEcArVUUACrA5VUUA7LNLNkPpmTECeAU7lSvABSFeqWpBSN6Dn6yH4hkFet3AoyMha6KYM+kJcHgoZE1wFoESuh+GIA/g2oCvUf5KWHckEBslkq9R3ilEVwA2A6tRDP9Af4MI73v+W4LkD7uGKaI/GTQYCFmCwbPhFjFeCLNFDBiPhSwwGokFdvsEMhf4wOjtB3YLQoyMdwk2ijTCTgD0d4dDCQ9eBMN5EtvNojEqWOqhUG1gGPoztmsCMeOF8Ffx6dxLyfdujP2iULwFEXsFxqH/L8kLo5Hf0z3aLrhXJ/gRANR4XNxiGQySJ/wdG4cZw1p3FMNEj7NT0fx9GIIHVGP3EOP8Ho/ES16pKSdw1OYv4lcAMB6n1OmUU9GLBf99Mkme4fHx3wWPj2+JPFpW0twB2nsHZwKug/8IMI/3aID5DYhqdALYNpT1eXiOBjiB29Pbhf8ym5ke/7Y1qWSQYPV6dklev5/SbJZKpqwmYBlYWILBI40zCTCJg8EqrHAu7W3/hDoEmCfLgK1W29puFSEen7ZVUunz1CfAPFhvkEXAhtWIDvgtX+fJOQWuKPg8G1dUeMXT1XULQFbCTaKCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGCQwGC8xu7JirAhQupkQAAAABJRU5ErkJggg===";

// Register the generate_image tool
server.tool("generate_image", async (params) => {
  return {
    content: [
      {
        type: "image",
        data: RED_CIRCLE_BASE64,
        mimeType: "image/png",
      },
    ],
  };
});

// Connect to the transport and start the server
await server.connect(new StdioServerTransport());
