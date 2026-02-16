/**
 * MCP (Model Context Protocol) Client
 * Manages connections to MCP servers and handles tool calls
 */

import type {
  McpTool,
  McpClientConfig,
  McpConnectionState,
  JsonRpcResponse,
  McpToolResult,
  McpInlineServerConfig,
  McpInlineExecutionContext
} from "./types"
import {
  createRequest,
  parseResponse,
  isValidResponse,
  isErrorResponse,
  getErrorMessage,
  createInitializeParams,
  serializeRequest
} from "./McpProtocol"

// ============================================================================
// Pending Requests Tracking
// ============================================================================

interface PendingRequest {
  id: string | number
  method: string
  resolve: (response: JsonRpcResponse) => void
  reject: (error: Error) => void
  timestamp: number
}

// ============================================================================
// MCP Client Implementation
// ============================================================================

class McpClientClass {
  private connections = new Map<string, Worker | WebSocket>()
  private pendingRequests = new Map<string | number, PendingRequest>()
  private inlineServers = new Map<string, McpTool[]>()
  private connectionState: Map<string, McpConnectionState> = new Map()
  private eventHandlers: Array<(event: { type: string; data?: unknown }) => void> = []

  /**
   * Register an event handler
   */
  onEvent(handler: (event: { type: string; data?: unknown }) => void): () => void {
    this.eventHandlers.push(handler)
    return () => {
      this.eventHandlers = this.eventHandlers.filter(h => h !== handler)
    }
  }

  /**
   * Emit an event to all handlers
   */
  private emit(event: { type: string; data?: unknown }): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event)
      } catch (error) {
        if (import.meta.env.DEV) console.error("[McpClient] Event handler error:", error)
      }
    }
  }

  /**
   * Connect to an MCP server via stdio (using Web Worker)
   */
  async connectStdio(config: McpClientConfig & { transport: "stdio" }): Promise<void> {
    const { name } = config

    if (import.meta.env.DEV) console.log(`[McpClient] Connecting to stdio server: ${name}`)

    // Create a Web Worker for stdio communication
    // In a real implementation, we would create a worker from a command
    // For now, we'll use a mock worker
    const worker = {
      postMessage: () => {},
      terminate: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      onerror: null,
      onmessage: null,
      onmessageerror: null
    } as unknown as Worker

    this.connections.set(name, worker)
    this.setConnectionState(name, {
      isConnected: true,
      isInitialized: false,
      serverInfo: { name, version: "unknown" }
    })

    this.emit({ type: "connected", data: { server: name } })
  }

  /**
   * Connect to an MCP server via HTTP/SSE
   */
  async connectHttp(config: McpClientConfig & { transport: "http" | "sse" }): Promise<void> {
    const { name, url } = config

    if (import.meta.env.DEV) console.log(`[McpClient] Connecting to HTTP server: ${name} at ${url}`)

    // Create WebSocket connection for SSE
    if (!url) {
      throw new Error("URL is required for HTTP/SSE transport")
    }
    const ws = new WebSocket(url)

    ws.onopen = () => {
      if (import.meta.env.DEV) console.log(`[McpClient] Connected to ${name}`)
      this.setConnectionState(name, {
        isConnected: true,
        isInitialized: false,
        serverInfo: { name, version: "unknown" }
      })

      // Send initialize request
      const initRequest = createRequest("initialize", createInitializeParams(
        "trip-agent",
        "1.0.0",
        { tools: true, resources: false, prompts: false }
      ))

      ws.send(serializeRequest(initRequest))
    }

    ws.onmessage = async (event) => {
      const response = parseResponse(event.data)

      if (!response || !isValidResponse(response)) {
        if (import.meta.env.DEV) console.warn("[McpClient] Invalid response received:", event.data)
        return
      }

      await this.handleResponse(response)
    }

    ws.onerror = (error) => {
      if (import.meta.env.DEV) console.error(`[McpClient] WebSocket error for ${name}:`, error)
      this.setConnectionState(name, {
        isConnected: false,
        isInitialized: false,
        serverInfo: null
      })

      this.emit({ type: "error", data: { server: name, error } })
    }

    ws.onclose = () => {
      if (import.meta.env.DEV) console.log(`[McpClient] Disconnected from ${name}`)
      this.setConnectionState(name, {
        isConnected: false,
        isInitialized: false,
        serverInfo: null
      })

      this.emit({ type: "disconnected", data: { server: name } })
    }

    this.connections.set(name, ws as unknown as Worker)
  }

  /**
   * Register an inline server (built into the app)
   */
  registerInlineServer(config: McpInlineServerConfig): void {
    if (import.meta.env.DEV) console.log(`[McpClient] Registering inline server: ${config.name}`)

    this.inlineServers.set(config.name, config.tools)
    this.setConnectionState(config.name, {
      isConnected: true,
      isInitialized: true,
      serverInfo: { name: config.name, version: "1.0.0" }
    })

    this.emit({ type: "connected", data: { server: config.name, inline: true } })
  }

  /**
   * Initialize an MCP server connection
   */
  async initialize(serverName: string): Promise<void> {
    if (import.meta.env.DEV) console.log(`[McpClient] Initializing server: ${serverName}`)

    const state = this.getConnectionState(serverName)
    if (!state?.isConnected) {
      throw new Error(`Server ${serverName} is not connected`)
    }

    // For inline servers, no initialization needed
    if (this.inlineServers.has(serverName)) {
      this.setConnectionState(serverName, {
        ...state,
        isInitialized: true
      })
      return
    }

    // For external servers, wait for initialization response
    // This is handled by the message handler
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnect(serverName: string): Promise<void> {
    if (import.meta.env.DEV) console.log(`[McpClient] Disconnecting from: ${serverName}`)

    const connection = this.connections.get(serverName)
    if (connection) {
      if (connection instanceof WebSocket) {
        connection.close()
      } else if (connection instanceof Worker) {
        connection.terminate()
      }
    }

    this.connections.delete(serverName)
    this.inlineServers.delete(serverName)
    this.connectionState.delete(serverName)

    // Clean up pending requests for this server
    for (const [id, request] of this.pendingRequests) {
      // Check if request belongs to this server
      if (request.method.includes(serverName) || request.method === "initialize") {
        request.reject(new Error(`Connection to ${serverName} closed`))
        this.pendingRequests.delete(id)
      }
    }

    this.emit({ type: "disconnected", data: { server: serverName } })
  }

  /**
   * List available tools from all connected servers
   */
  listTools(): McpTool[] {
    const allTools: McpTool[] = []

    for (const [name, tools] of this.inlineServers) {
      const state = this.getConnectionState(name)
      if (state?.isInitialized) {
        allTools.push(...tools)
      }
    }

    // For external servers, we would request tools/list
    // For now, just return inline tools

    return allTools
  }

  /**
   * Call a tool on a connected server
   */
  async callTool(
    serverName: string,
    toolName: string,
    args?: Record<string, unknown>,
    context?: McpInlineExecutionContext
  ): Promise<McpToolResult> {
    if (import.meta.env.DEV) console.log(`[McpClient] Calling tool: ${serverName}.${toolName}`, args)

    const startTime = Date.now()

    this.emit({
      type: "tool_called",
      data: { server: serverName, tool: toolName, args }
    })

    // Check if server is an inline server
    if (this.inlineServers.has(serverName)) {
      const tools = this.inlineServers.get(serverName)!
      const tool = tools.find(t => t.name === toolName)

      if (!tool) {
        throw new Error(`Tool ${toolName} not found on server ${serverName}`)
      }

      try {
        const result = await tool.handler({ ...args, context })
        const duration = Date.now() - startTime
        if (import.meta.env.DEV) console.log(`[McpClient] Tool ${toolName} completed in ${duration}ms`)
        return result
      } catch (error) {
        if (import.meta.env.DEV) console.error(`[McpClient] Tool ${toolName} error:`, error)
        return {
          content: [{
            type: "text",
            text: error instanceof Error ? error.message : "Unknown error"
          }],
          isError: true
        }
      }
    }

    // For external servers, we would send tools/call via the transport
    // For now, throw an error
    throw new Error(`External server tool calls not yet implemented for ${serverName}`)
  }

  /**
   * Handle an incoming MCP response
   */
  private async handleResponse(response: JsonRpcResponse): Promise<void> {
    const pending = this.pendingRequests.get(response.id)

    if (!pending) {
      if (import.meta.env.DEV) console.warn("[McpClient] No pending request for response:", response.id)
      return
    }

    // Clean up pending request
    this.pendingRequests.delete(response.id)

    if (isErrorResponse(response)) {
      const error = getErrorMessage(response.error!)
      pending.reject(new Error(error))
      return
    }

    pending.resolve(response)
  }

  /**
   * Get connection state for a server
   */
  getConnectionState(serverName: string): McpConnectionState | undefined {
    return this.connectionState.get(serverName)
  }

  /**
   * Set connection state for a server
   */
  private setConnectionState(serverName: string, state: McpConnectionState): void {
    this.connectionState.set(serverName, state)
  }

  /**
   * Get all registered servers
   */
  getRegisteredServers(): string[] {
    return [
      ...Array.from(this.inlineServers.keys()),
      ...Array.from(this.connections.keys())
    ]
  }

  /**
   * Get server info
   */
  getServerInfo(serverName: string): { name: string; version: string } | null {
    const state = this.getConnectionState(serverName)
    return state?.serverInfo || null
  }

  /**
   * Check if a server is connected and initialized
   */
  isServerReady(serverName: string): boolean {
    const state = this.getConnectionState(serverName)
    return state?.isConnected === true && state?.isInitialized === true
  }

  /**
   * Disconnect from all servers
   */
  async disconnectAll(): Promise<void> {
    const servers = this.getRegisteredServers()

    for (const server of servers) {
      await this.disconnect(server)
    }
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const McpClient = new McpClientClass()

// Convenience functions
export async function connectServer(config: McpClientConfig): Promise<void> {
  if (config.transport === "stdio") {
    return McpClient.connectStdio(config as McpClientConfig & { transport: "stdio" })
  } else if (config.transport === "http" || config.transport === "sse") {
    return McpClient.connectHttp(config as McpClientConfig & { transport: "http" | "sse" })
  } else if (config.transport === "inline") {
    McpClient.registerInlineServer(config as unknown as McpInlineServerConfig)
    return Promise.resolve()
  }
  throw new Error(`Unknown transport type: ${config.transport}`)
}

export async function disconnectServer(serverName: string): Promise<void> {
  return McpClient.disconnect(serverName)
}

export function listAllTools(): McpTool[] {
  return McpClient.listTools()
}

export async function callTool(
  serverName: string,
  toolName: string,
  args?: Record<string, unknown>,
  context?: McpInlineExecutionContext
): Promise<McpToolResult> {
  return McpClient.callTool(serverName, toolName, args, context)
}

export function isServerReady(serverName: string): boolean {
  return McpClient.isServerReady(serverName)
}

export function getServerInfo(serverName: string): { name: string; version: string } | null {
  return McpClient.getServerInfo(serverName)
}

export function onMcpEvent(
  handler: (event: { type: string; data?: unknown }) => void
): () => void {
  return McpClient.onEvent(handler)
}
