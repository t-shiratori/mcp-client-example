import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type {
    MessageParam,
    Tool,
} from "@anthropic-ai/sdk/resources/messages/messages.mjs";
import { Anthropic } from "@anthropic-ai/sdk";
import * as readline from "node:readline/promises";
import {
    AI_MODEL,
    ANTHROPIC_API_KEY,
    MCP_SERVER_SCRIPT_PATH,
} from "./const.js";

export class MCPClient {
    private readonly mpcClient: Client;
    private readonly anthropic: Anthropic;
    private transport: StdioClientTransport | null = null;
    private tools: Tool[] = [];

    constructor() {
        if (!ANTHROPIC_API_KEY) {
            throw new Error("ANTHROPIC_API_KEY is not set");
        }
        this.anthropic = new Anthropic({
            apiKey: ANTHROPIC_API_KEY,
        });
        this.mpcClient = new Client({
            name: "example-mcp-client",
            version: "1.0.0",
        });
    }

    /** Create command to run the MCP server */
    createCommand(serverScriptPath: string) {
        const isJs = serverScriptPath.endsWith(".js");
        const isPy = serverScriptPath.endsWith(".py");
        if (!isJs && !isPy) {
            throw new Error("Server script must be a .js or .py file");
        }
        const command = isPy
            ? process.platform === "win32"
                ? "python"
                : "python3"
            : process.execPath;

        return command;
    }

    /** Connect to the MCP server */
    async connectToServer() {
        try {
            if (!MCP_SERVER_SCRIPT_PATH) {
                throw new Error("MCP_SERVER_SCRIPT_PATH is not set");
            }

            /** Create a transport to communicate with the MCP server */
            this.transport = new StdioClientTransport({
                command: this.createCommand(MCP_SERVER_SCRIPT_PATH),
                args: [MCP_SERVER_SCRIPT_PATH],
            });

            /** Connect to the MCP server */
            this.mpcClient.connect(this.transport);

            /** Get mcp server tools */
            const toolsResult = await this.mpcClient.listTools();
            this.tools = toolsResult.tools.map((tool) => {
                return {
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                };
            });
            console.log(
                "Connected to server with tools:",
                this.tools.map(({ name }) => name),
            );
        } catch (e) {
            console.log("Failed to connect to MCP server: ", e);
            throw e;
        }
    }

    /** Close the connection to the MCP server */
    async cleanup() {
        await this.mpcClient.close();
    }

    /**
     * Creating an interactive user interface with the CLI
     */
    async chatLoop() {
        /** Create a readline interface for user input */
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            console.log("\nMCP Client Started!");
            console.log("Type your queries or 'quit' to exit.");

            while (true) {
                /** Accept input from user */
                const inputMessage = await rl.question("\n🖌 Query: ");
                if (inputMessage.toLowerCase() === "quit") {
                    break;
                }
                /** Start conversation with AI model  */
                const response = await this.processQuery(inputMessage);
                /** Display the AI model's response */
                console.log(`\n${response}`);
            }
        } catch (error) {
            console.error("Error in chat loop: ", error);
        } finally {
            rl.close();
        }
    }

    /**
     * Manage conversations for each question.
    
     */
    async processQuery(query: string) {
        /** For collecting input messages */
        const queryMessages: MessageParam[] = [
            {
                role: "user",
                content: query,
            },
        ];

        /**
         * Request question message and mcp tools to API.
         * The AI model will then generate the next conversational message.
         */
        const response = await this.anthropic.messages.create({
            model: AI_MODEL,
            max_tokens: 1000,
            messages: queryMessages,
            tools: this.tools,
        });

        // console.log("---------------------------------------------------");
        // console.log("First Query AI response: ", response);

        /** Collect final output message */
        const finalText = [];

        /**
         * AI processes AI-generated conversational messages.
         * - If it is just a message
         *   - returns text and that's it
         * - For messages using tools
         *   - Run the tools on the MCP server to get the results
         *   - Add the result to the message and request the API again
         */
        for (const content of response.content) {
            if (content.type === "text") {
                finalText.push(content.text);
            } else if (content.type === "tool_use") {
                const toolName = content.name;
                const toolArgs = content.input as
                    | { [x: string]: unknown }
                    | undefined;

                /** Call the MCP server's tools */
                const result = await this.mpcClient.callTool({
                    name: toolName,
                    arguments: toolArgs,
                });

                finalText.push(
                    `[Calling tool ${toolName} with args ${JSON.stringify(toolArgs)}]`,
                );

                queryMessages.push({
                    role: "user",
                    content: result.content as string,
                });

                const response = await this.anthropic.messages.create({
                    model: "claude-3-5-sonnet-20241022",
                    max_tokens: 1000,
                    messages: queryMessages,
                });

                // console.log(
                //     "---------------------------------------------------",
                // );
                // console.log("AI response with MCP Server Tools: ", response);

                /** Only the latest conversational messages are added to the final output result */
                finalText.push(
                    response.content[0].type === "text"
                        ? response.content[0].text
                        : "",
                );
            }
        }

        // console.log("---------------------------------------------------");
        // console.log({ queryMessages, finalText });

        return finalText.join("\n");
    }
}
