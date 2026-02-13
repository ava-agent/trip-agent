/**
 * MCP (Model Context Protocol) Service Entry Point
 * Exports all MCP-related functionality
 */

// ============================================================================
// Core Exports
// ============================================================================

export * from "./types"
export * from "./McpProtocol"
export * from "./McpClient"
export * from "./InlineServer"

// ============================================================================
// Convenience Re-exports
// ============================================================================

export {
  McpClient,
  connectServer,
  disconnectServer,
  listAllTools as listAllMcpTools,
  callTool,
  isServerReady,
  getServerInfo,
  onMcpEvent
} from "./McpClient"

export {
  BUILTIN_TOOLS,
  INLINE_SERVER_CONFIG,
  getBuiltinTools,
  getTool,
  getToolNames
} from "./InlineServer"

// ============================================================================
// Summary
// ============================================================================

/**
 * MCP Service provides the following capabilities:
 *
 * 1. **Protocol Implementation**: Full JSON-RPC 2.0 support for MCP communication
 * 2. **Client**: Connect to external MCP servers or use inline (built-in) tools
 * 3. **Inline Server**: Built-in tools for:
 *    - get_current_date: Current date/time
 *    - get_weather: Weather data for a location
 *    - search_places: Search for attractions, restaurants, hotels
 *    - search_hotels: Hotel search with dates
 *    - calculate_distance: Distance and travel time calculation
 * 4. **Type Safety**: Full TypeScript support for all MCP types
 *
 * Usage Example:
 * ```typescript
 * import { connectServer, callTool, INLINE_SERVER_CONFIG } from '@/services/mcp'
 *
 * // Register inline (built-in) tools
 * await connectServer({
 *   name: 'builtin',
 *   transport: 'inline',
 *   ...INLINE_SERVER_CONFIG
 * })
 *
 * // Call a built-in tool
 * const result = await callTool('builtin', 'get_weather', {
 *   location: 'Tokyo'
 * })
 * ```
 */
