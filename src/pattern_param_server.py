#!/Users/michael/.venv/bin/python

import re
from typing import Dict, Any
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("pattern_param_server")

@mcp.tool(
    description="This tool will take a URL of an error in Bugsnag, and will parse out the organization slug, project slug, and error ID. Returns fields for org_slug, project_slug, and error_id"
)
def parse_bugsnag_error_url(error_url: str) -> Dict[str, str]:
    """
    Parse a Bugsnag error URL to extract organization, project, and error IDs.
    
    Args:
        error_url: URL in the format https://app.bugsnag.com/{org}/{project}/errors/{error_id}
        
    Returns:
        Dictionary containing org_slug, project_slug, and error_id
    """
    pattern = r'^https://app\.bugsnag\.com/([^/]+)/([^/]+)/errors/([^/]+)'
    match = re.match(pattern, error_url)
    
    if not match:
        raise ValueError("Invalid Bugsnag URL format")
    
    org_slug, project_slug, error_id = match.groups()
    
    return {
        "org_slug": org_slug,
        "project_slug": project_slug,
        "error_id": error_id
    }

if __name__ == "__main__":
    mcp.run(transport="stdio") 