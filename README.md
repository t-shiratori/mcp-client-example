# Mcp client example

This is a sample CLI chat application for an AI assistant using the Anthropic API in conjunction with an MCP client and MCP server.

Reference:
[For Client Developers - Model Context Protocol](https://modelcontextprotocol.io/quickstart/client#node)

Anthropic API:
[Initial setup - Anthropic](https://docs.anthropic.com/en/docs/initial-setup)
[Messages - Anthropic](https://docs.anthropic.com/en/api/messages)

<b>System diagram</b>

<img src="https://github.com/user-attachments/assets/8682e5c8-d0af-4800-ab85-a731d29dfc80" width="600" >


<b>Sequence diagram</b>

```mermaid
sequenceDiagram
    participant User
    participant MCPClient
    participant AnthropicAPI
    participant MCPServer

    User->>MCPClient: Run
    MCPClient->>MCPServer: Connect and get tool info
    MCPServer-->>MCPClient: Tool info

    loop Chat loop (until 'quit' is entered)
        User->>MCPClient: Enter query
        MCPClient->>AnthropicAPI: Send query
        AnthropicAPI-->>MCPClient: AI response

        alt When tool usage is required
            MCPClient->>MCPServer: Call tool
            MCPServer-->>MCPClient: Tool execution result
            MCPClient->>AnthropicAPI: Send query again including tool result
            AnthropicAPI-->>MCPClient: Final response
        end

        MCPClient-->>User: Display response
    end

    User->>MCPClient: Enter 'quit'
    MCPClient->>MCPServer: Disconnect
    MCPClient-->>User: Exit
```

## Setup

```bash
pnpm install
```

.env
```txt
ANTHROPIC_API_KEY=your-api-key
MCP_SERVER_SCRIPT_PATH=/path/to/mcp-server.js
```

## Run

```bash
pnpm start
```

### Output example

Use this mcp server
https://github.com/t-shiratori/time-tools-mcp-server

```shell-session

mcp-client-example $ pnpm start

> mcp-client-example@1.0.0 start /path/to/mcp-client-example
> node build/index.js

Example MCP Server running on stdio
Connected to server with tools: [ 'get_current_date_time', 'get_elapsed_time' ]

MCP Client Started!
Type your queries or 'quit' to exit.

🖌 Query: Hello

Hello! I'm here to assist you. I can help you with tasks related to date and time, such as getting the current date and time or calculating the elapsed time between two dates.

Is there something specific you'd like to know about dates or times today?

🖌 Query: What time is it?

I can check the current date and time for you.
[Calling tool get_current_date_time with args {}]
Based on the given timestamp, the time is 10:37:19 AM on May 6th, 2025.

```
