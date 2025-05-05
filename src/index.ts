import { MCPClient } from "./MCPClient.js";

async function main() {
    const mcpClient = new MCPClient();
    try {
        await mcpClient.connectToServer();
        await mcpClient.chatLoop();
    } finally {
        await mcpClient.cleanup();
        process.exit(0);
    }
}

main();
