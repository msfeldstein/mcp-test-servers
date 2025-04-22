#!/Users/michael/.venv/bin/python

from typing import Optional
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("ajgray_test")

@mcp.tool()
def fancy_optional_params_tool(a: Optional[str] = None, b: Optional[str] = None) -> str:
    return str(a is None), str(b is None)

mcp.run(transport="stdio") 