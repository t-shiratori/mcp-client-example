import dotenv from "dotenv";

/** Load environment variables from .env file */
dotenv.config();

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
export const MCP_SERVER_SCRIPT_PATH = process.env.MCP_SERVER_SCRIPT_PATH;

export const AI_MODEL = "claude-3-7-sonnet-20250219";
