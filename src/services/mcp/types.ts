/**
 * MCP (Model Context Protocol) Types
 * Based on https://modelcontextprotocol.io/
 */

// ============================================================================
// Core MCP Types
// ============================================================================

export interface McpServer {
  name: string
  version: string
  capabilities: McpCapabilities
  tools: McpTool[]
  status: "connected" | "disconnected" | "error"
}

export interface McpCapabilities {
  resources?: boolean
  tools?: boolean
  prompts?: boolean
}

export interface McpTool {
  name: string
  description: string
  inputSchema: McpSchema
  handler: (params: unknown) => Promise<McpToolResult>
}

export interface McpSchema {
  type: "object" | "string" | "number" | "boolean" | "array"
  description?: string
  properties?: Record<string, McpSchema>
  required?: string[]
  items?: McpSchema
  enum?: unknown[]
  default?: unknown
}

export interface McpToolResult {
  content: McpContent[]
  isError?: boolean
}

export type McpContentType = "text" | "image" | "resource" | "embedded_resource"

export interface McpContent {
  type: McpContentType
  text?: string
  data?: string
  uri?: string
  mimeType?: string
}

// ============================================================================
// JSON-RPC 2.0 Types (MCP uses JSON-RPC for communication)
// ============================================================================

export interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: string | number
  method: string
  params?: unknown
}

export interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: string | number
  result?: unknown
  error?: JsonRpcError
}

export interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

// JSON-RPC Error Codes
export enum JsonRpcErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}

// ============================================================================
// MCP Client Configuration
// ============================================================================

export type McpTransportType = "stdio" | "http" | "sse" | "inline"

export interface McpClientConfig {
  name: string
  transport: McpTransportType
  timeout?: number
  // For stdio transport
  command?: string
  args?: string[]
  env?: Record<string, string>
  // For http/sse transport
  url?: string
  headers?: Record<string, string>
}

// ============================================================================
// MCP Protocol Methods
// ============================================================================

export type McpMethod =
  | "initialize"
  | "tools/list"
  | "tools/call"
  | "resources/list"
  | "resources/read"
  | "prompts/list"
  | "prompts/get"

export const McpMethod = {
  initialize: "initialize",
  tools_list: "tools/list",
  tools_call: "tools/call",
  resources_list: "resources/list",
  resources_read: "resources/read",
  prompts_list: "prompts/list",
  prompts_get: "prompts/get",
} as const

export interface McpInitializeParams {
  protocolVersion: string
  capabilities: McpCapabilities
  clientInfo: {
    name: string
    version: string
  }
}

export interface McpInitializeResult {
  protocolVersion: string
  capabilities: McpCapabilities
  serverInfo: {
    name: string
    version: string
  }
}

export interface McpToolsListResult {
  tools: Array<{
    name: string
    description: string
    inputSchema: McpSchema
  }>
}

export interface McpToolCallParams {
  name: string
  arguments?: Record<string, unknown>
}

// ============================================================================
// MCP Resource Types
// ============================================================================

export interface McpResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

export interface McpResourceTemplate {
  uriTemplate: string
  name: string
  description?: string
  mimeType?: string
}

export interface McpPrompt {
  name: string
  description?: string
  arguments?: McpSchema
}

// ============================================================================
// MCP Client Events
// ============================================================================

export type McpEventType =
  | "connected"
  | "disconnected"
  | "error"
  | "message"
  | "tool_called"

export interface McpEvent {
  type: McpEventType
  data?: unknown
  timestamp: Date
}

// ============================================================================
// Inline Server Types (for tools built into the app)
// ============================================================================

export interface McpInlineServerConfig {
  name: string
  tools: McpTool[]
  capabilities?: McpCapabilities
}

export interface McpInlineExecutionContext {
  sessionId?: string
  userId?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Helper Types
// ============================================================================

export interface McpConnectionState {
  isConnected: boolean
  isInitialized: boolean
  serverInfo: {
    name: string
    version: string
  } | null
}

export type McpMessageHandler = (message: JsonRpcResponse) => void | Promise<void>
