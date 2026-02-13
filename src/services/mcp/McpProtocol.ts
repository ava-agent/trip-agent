/**
 * MCP (Model Context Protocol) Protocol Handler
 * Implements JSON-RPC 2.0 communication for MCP
 */

import type {
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcError,
  McpMethod
} from "./types"
import { JsonRpcErrorCode } from "./types"

// ============================================================================
// JSON-RPC 2.0 Implementation
// ============================================================================

let requestIdCounter = 0

/**
 * Generate a unique request ID
 */
function generateRequestId(): string {
  return `mcp_${Date.now()}_${++requestIdCounter}`
}

/**
 * Create a JSON-RPC request
 */
export function createRequest(
  method: McpMethod | string,
  params?: unknown
): JsonRpcRequest {
  return {
    jsonrpc: "2.0",
    id: generateRequestId(),
    method,
    params
  }
}

/**
 * Create a JSON-RPC response
 */
export function createResponse(
  id: string | number,
  result?: unknown,
  error?: JsonRpcError
): JsonRpcResponse {
  const response: JsonRpcResponse = {
    jsonrpc: "2.0",
    id
  }

  if (error) {
    response.error = error
  } else {
    response.result = result
  }

  return response
}

/**
 * Create a JSON-RPC error
 */
export function createError(
  code: JsonRpcErrorCode,
  message: string,
  data?: unknown
): JsonRpcError {
  const error: JsonRpcError = {
    code,
    message
  }

  if (data !== undefined) {
    error.data = data
  }

  return error
}

/**
 * Parse a JSON string as a JSON-RPC response
 */
export function parseResponse(data: string): JsonRpcResponse | null {
  try {
    const parsed = JSON.parse(data) as JsonRpcResponse

    // Validate JSON-RPC 2.0 format
    if (parsed.jsonrpc !== "2.0") {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

/**
 * Validate a JSON-RPC request
 */
export function isValidRequest(request: unknown): request is JsonRpcRequest {
  if (typeof request !== "object" || request === null) {
    return false
  }

  const req = request as Record<string, unknown>

  return (
    req.jsonrpc === "2.0" &&
    (typeof req.id === "string" || typeof req.id === "number") &&
    typeof req.method === "string"
  )
}

/**
 * Validate a JSON-RPC response
 */
export function isValidResponse(response: unknown): response is JsonRpcResponse {
  if (typeof response !== "object" || response === null) {
    return false
  }

  const res = response as Record<string, unknown>

  return (
    res.jsonrpc === "2.0" &&
    (typeof res.id === "string" || typeof res.id === "number") &&
    (res.result !== undefined || res.error !== undefined)
  )
}

// ============================================================================
// MCP Protocol Utilities
// ============================================================================

/**
 * Get the expected response ID for a given request
 */
export function getExpectedResponseId(request: JsonRpcRequest): string | number {
  return request.id
}

/**
 * Check if a response is an error response
 */
export function isErrorResponse(response: JsonRpcResponse): boolean {
  return response.error !== undefined
}

/**
 * Check if a response is a successful response
 */
export function isSuccessfulResponse(response: JsonRpcResponse): boolean {
  return response.error === undefined && response.result !== undefined
}

/**
 * Extract error message from a JSON-RPC error response
 */
export function getErrorMessage(error: JsonRpcError): string {
  if (error.data && typeof error.data === "string") {
    return error.data
  }

  return error.message
}

// ============================================================================
// MCP Method Builders
// ============================================================================

/**
 * Create initialize method parameters
 */
export function createInitializeParams(
  clientName: string,
  clientVersion: string,
  capabilities: Record<string, boolean>
) {
  return {
    protocolVersion: "2024-11-05",
    capabilities: {
      resources: capabilities.resources ?? false,
      tools: capabilities.tools ?? true,
      prompts: capabilities.prompts ?? false
    },
    clientInfo: {
      name: clientName,
      version: clientVersion
    }
  }
}

/**
 * Create tools/call method parameters
 */
export function createToolCallParams(
  toolName: string,
  args?: Record<string, unknown>
) {
  return args ? { name: toolName, arguments: args } : { name: toolName }
}

/**
 * Create resources/read method parameters
 */
export function createResourceReadParams(uri: string) {
  return { uri }
}

// ============================================================================
// Message Serialization
// ============================================================================

/**
 * Serialize a JSON-RPC request to a string
 */
export function serializeRequest(request: JsonRpcRequest): string {
  return JSON.stringify(request)
}

/**
 * Serialize a JSON-RPC response to a string
 */
export function serializeResponse(response: JsonRpcResponse): string {
  return JSON.stringify(response)
}

// ============================================================================
// Error Factories
// ============================================================================

/**
 * Create a parse error
 */
export function makeParseError(data: string): JsonRpcError {
  return createError(
    JsonRpcErrorCode.ParseError,
    "Failed to parse MCP message",
    data
  )
}

/**
 * Create an invalid request error
 */
export function makeInvalidRequestError(request: unknown): JsonRpcError {
  return createError(
    JsonRpcErrorCode.InvalidRequest,
    "Invalid MCP request format",
    request
  )
}

/**
 * Create a method not found error
 */
export function makeMethodNotFoundError(method: string): JsonRpcError {
  return createError(
    JsonRpcErrorCode.MethodNotFound,
    `MCP method not found: ${method}`
  )
}

/**
 * Create an invalid params error
 */
export function makeInvalidParamsError(params: unknown): JsonRpcError {
  return createError(
    JsonRpcErrorCode.InvalidParams,
    "Invalid parameters for MCP method",
    { params }
  )
}

/**
 * Create an internal error
 */
export function makeInternalError(message: string, data?: unknown): JsonRpcError {
  return createError(JsonRpcErrorCode.InternalError, message, data)
}

// ============================================================================
// Response Helpers
// ============================================================================

/**
 * Extract the result from a successful response
 */
export function extractResult<T = unknown>(response: JsonRpcResponse): T | null {
  if (isSuccessfulResponse(response)) {
    return response.result as T
  }
  return null
}

/**
 * Check if response matches request ID
 */
export function matchesRequestId(response: JsonRpcResponse, expectedId: string | number): boolean {
  return response.id === expectedId
}
