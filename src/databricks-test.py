# A simple FastMCP server example intended for Databricks or local testing
# It exposes a single `print_string` tool that prints/logs the provided string.
from fastmcp import FastMCP
import os
import argparse
import logging

# Set up basic logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Global variable to store the string argument
DEFAULT_STRING = None


def print_string() -> str:
    """
    Print a string message
    """
    message = DEFAULT_STRING
    if message is None:
        return "No string provided"
    print(message)
    logger.info(f"Printed command-line string: {message}")
    return f"Successfully printed command-line string: {message}"


def register_tools(mcp):
    mcp.tool()(print_string)


if __name__ == "__main__":
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description="Jarvis MCP Server")
    parser.add_argument(
        "--string",
        type=str,
        help="Default string to print when using print_string tool",
    )
    args = parser.parse_args()

    # Log the parsed arguments for debugging
    logger.warning(f"Parsed command-line arguments: {args}")

    # Set global string if provided
    if args.string:
        DEFAULT_STRING = args.string
        logger.info(f"Using command-line string: {DEFAULT_STRING}")

    # Initialize MCP
    mcp = FastMCP("jarvis", log_level="WARNING")

    # Register tools
    register_tools(mcp)

    # Run the MCP server
    mcp.run()