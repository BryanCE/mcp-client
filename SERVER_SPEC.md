# MCP Client - Server Specification

## Architecture Overview

### Technology Stack
- **Runtime**: Node.js with NextJS App Router
- **Type Safety**: TypeScript with strict mode
- **API Layer**: tRPC for end-to-end type safety
- **Database**: SQLite with Drizzle ORM (stateless operation)
- **Process Management**: Child processes for MCP server communication
- **HTTP Client**: Fetch API for AI provider communications

### Design Principles
- **Type Safety**: Full TypeScript coverage with tRPC
- **Stateless Operations**: No persistent data storage
- **Error Resilience**: Comprehensive error handling and recovery
- **Concurrent Processing**: Handle multiple MCP servers simultaneously
- **Security First**: Secure API key handling and input validation

## Session State Management

### In-Memory Session Store
```typescript
// src/server/utils/sessionStore.ts
class SessionStore {
  private sessions = new Map<string, SessionState>()
  
  getSession(sessionId: string): SessionState {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        mcpServers: [],
        aiProviders: [],
        activeConnections: [],
        chatSessions: [],
      })
    }
    return this.sessions.get(sessionId)!
  }
  
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId)
  }
}

export const sessionStore = new SessionStore()
```

### Session State Interface
```typescript
// src/server/types/session.ts
interface SessionState {
  mcpServers: MCPServerConfig[]
  aiProviders: AIProviderConfig[]
  activeConnections: MCPConnection[]
  chatSessions: ChatSession[]
}

### Type Definitions
```typescript
// app/server/types/index.ts

interface MCPServerConfig {
  id: string
  name: string
  command: string
  args?: string[]
  env?: Record<string, string>
  type: 'local' | 'remote'
  status: 'connected' | 'disconnected' | 'error'
  lastConnected?: Date
}

interface AIProviderConfig {
  id: string
  name: 'openai' | 'anthropic' | 'openrouter' | 'custom'
  apiKey: string
  baseUrl?: string
  model: string
  maxTokens?: number
  temperature?: number
  status: 'active' | 'error' | 'rate_limited'
}

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  toolCalls?: ToolCall[]
  metadata?: Record<string, any>
}

interface ToolCall {
  id: string
  name: string
  parameters: Record<string, any>
  response?: any
  error?: string
  duration?: number
  mcpServerId: string
}
```

## tRPC Router Structure

### Root Router
```typescript
// app/server/api/root.ts

export const appRouter = createTRPCRouter({
  mcp: mcpRouter,
  ai: aiRouter,
  chat: chatRouter,
  health: healthRouter,
})

export type AppRouter = typeof appRouter
```

### MCP Router
**Location**: `app/server/api/routers/mcp.ts`

#### Procedures

##### Configuration Management
```typescript
const mcpRouter = createTRPCRouter({
  // Get all configured MCP servers
  getServers: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.session.mcpServers
    }),

  // Add new MCP server configuration
  addServer: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      command: z.string().min(1),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      type: z.enum(['local', 'remote']),
    }))
    .mutation(async ({ input, ctx }) => {
      const server = await mcpService.addServer(input)
      ctx.session.mcpServers.push(server)
      return server
    }),

  // Remove MCP server
  removeServer: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      await mcpService.disconnectServer(input.id)
      ctx.session.mcpServers = ctx.session.mcpServers
        .filter(s => s.id !== input.id)
      return { success: true }
    }),

  // Test MCP server connection
  testConnection: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await mcpService.testConnection(input.id)
    }),
})
```

### MCP Router Implementation
**Location**: `src/server/api/routers/mcp.ts`

```typescript
import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { mcpService } from "~/server/services/mcpService"
import { sessionStore } from "~/server/utils/sessionStore"

export const mcpRouter = createTRPCRouter({
  getServers: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      return session.mcpServers
    }),

  addServer: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      name: z.string().min(1),
      command: z.string().min(1),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      type: z.enum(['local', 'remote']),
    }))
    .mutation(async ({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      const server = await mcpService.addServer({
        name: input.name,
        command: input.command,
        args: input.args,
        env: input.env,
        type: input.type,
      })
      session.mcpServers.push(server)
      return server
    }),

  removeServer: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      serverId: z.string() 
    }))
    .mutation(async ({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      await mcpService.disconnectServer(input.serverId)
      session.mcpServers = session.mcpServers.filter(s => s.id !== input.serverId)
      session.activeConnections = session.activeConnections.filter(c => c.serverId !== input.serverId)
      return { success: true }
    }),

  connectServer: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      serverId: z.string() 
    }))
    .mutation(async ({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      const connection = await mcpService.connect(input.serverId)
      session.activeConnections.push(connection)
      
      // Update server status
      const server = session.mcpServers.find(s => s.id === input.serverId)
      if (server) {
        server.status = 'connected'
        server.lastConnected = new Date()
      }
      
      return connection
    }),

  disconnectServer: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      serverId: z.string() 
    }))
    .mutation(async ({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      await mcpService.disconnect(input.serverId)
      
      session.activeConnections = session.activeConnections.filter(c => c.serverId !== input.serverId)
      
      // Update server status
      const server = session.mcpServers.find(s => s.id === input.serverId)
      if (server) {
        server.status = 'disconnected'
      }
      
      return { success: true }
    }),

  getTools: publicProcedure
    .input(z.object({ serverId: z.string() }))
    .query(async ({ input }) => {
      return await mcpService.getAvailableTools(input.serverId)
    }),

  executeTool: publicProcedure
    .input(z.object({
      serverId: z.string(),
      toolName: z.string(),
      parameters: z.record(z.any()),
    }))
    .mutation(async ({ input }) => {
      return await mcpService.executeTool(
        input.serverId, 
        input.toolName, 
        input.parameters
      )
    }),

  getConnectionStatus: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      return {
        servers: session.mcpServers,
        activeConnections: session.activeConnections.length,
      }
    }),
})
```

### AI Provider Router
**Location**: `app/server/api/routers/ai.ts`

#### Procedures
```typescript
const aiRouter = createTRPCRouter({
  // Get all configured AI providers
  getProviders: publicProcedure
    .query(async ({ ctx }) => {
      return ctx.session.aiProviders.map(p => ({
        ...p,
        apiKey: maskApiKey(p.apiKey) // Never return full API keys
      }))
    }),

  // Add AI provider configuration
  addProvider: publicProcedure
    .input(z.object({
      name: z.enum(['openai', 'anthropic', 'openrouter', 'custom']),
      apiKey: z.string().min(1),
      baseUrl: z.string().url().optional(),
      model: z.string().min(1),
      maxTokens: z.number().positive().optional(),
      temperature: z.number().min(0).max(2).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const provider = await aiService.addProvider(input)
      ctx.session.aiProviders.push(provider)
      return { ...provider, apiKey: maskApiKey(provider.apiKey) }
    }),

  // Test AI provider connection
  testProvider: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const provider = ctx.session.aiProviders.find(p => p.id === input.id)
      if (!provider) throw new Error('Provider not found')
      return await aiService.testConnection(provider)
    }),

  // Get available models for provider
  getModels: publicProcedure
    .input(z.object({ providerId: z.string() }))
    .query(async ({ input, ctx }) => {
      const provider = ctx.session.aiProviders.find(p => p.id === input.providerId)
      if (!provider) throw new Error('Provider not found')
      return await aiService.getAvailableModels(provider)
    }),
})
```

### Chat Router Implementation
**Location**: `src/server/api/routers/chat.ts`

```typescript
import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { chatService } from "~/server/services/chatService"
import { sessionStore } from "~/server/utils/sessionStore"
import { observable } from "@trpc/server/observable"

export const chatRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      chatSessionId: z.string(),
      message: z.string().min(1),
      providerId: z.string(),
      mcpServerIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      
      const response = await chatService.sendMessage({
        message: input.message,
        providerId: input.providerId,
        chatSessionId: input.chatSessionId,
        mcpServerIds: input.mcpServerIds || [],
        session,
      })
      
      // Add messages to chat session
      let chatSession = session.chatSessions.find(cs => cs.id === input.chatSessionId)
      if (!chatSession) {
        chatSession = {
          id: input.chatSessionId,
          messages: [],
          createdAt: new Date(),
        }
        session.chatSessions.push(chatSession)
      }
      
      // Add user message
      chatSession.messages.push({
        id: generateId(),
        role: 'user',
        content: input.message,
        timestamp: new Date(),
      })
      
      // Add assistant response
      chatSession.messages.push(response)
      
      return response
    }),

  streamMessage: publicProcedure
    .input(z.object({
      sessionId: z.string(),
      chatSessionId: z.string(),
      message: z.string().min(1),
      providerId: z.string(),
      mcpServerIds: z.array(z.string()).optional(),
    }))
    .subscription(({ input }) => {
      return observable<{
        type: 'content' | 'tool_call' | 'tool_result' | 'error' | 'done'
        content?: string
        toolCall?: ToolCall
        error?: string
      }>((emit) => {
        const session = sessionStore.getSession(input.sessionId)
        
        const streamGenerator = chatService.streamMessage({
          message: input.message,
          providerId: input.providerId,
          chatSessionId: input.chatSessionId,
          mcpServerIds: input.mcpServerIds || [],
          session,
        })
        
        const processStream = async () => {
          try {
            for await (const chunk of streamGenerator) {
              emit.next(chunk)
            }
            emit.next({ type: 'done' })
            emit.complete()
          } catch (error) {
            emit.error(error)
          }
        }
        
        processStream()
        
        return () => {
          // Cleanup if subscription is cancelled
        }
      })
    }),

  getChatSession: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      chatSessionId: z.string() 
    }))
    .query(({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      return session.chatSessions.find(cs => cs.id === input.chatSessionId)
    }),

  getChatSessions: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      return session.chatSessions
    }),

  clearChatSession: publicProcedure
    .input(z.object({ 
      sessionId: z.string(),
      chatSessionId: z.string() 
    }))
    .mutation(({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      session.chatSessions = session.chatSessions.filter(cs => cs.id !== input.chatSessionId)
      return { success: true }
    }),

  clearAllChatSessions: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ input }) => {
      const session = sessionStore.getSession(input.sessionId)
      session.chatSessions = []
      return { success: true }
    }),
})

function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}
```

### Health Router
**Location**: `app/server/api/routers/health.ts`

```typescript
const healthRouter = createTRPCRouter({
  // System health check
  getSystemHealth: publicProcedure
    .query(async ({ ctx }) => {
      return {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        mcpConnections: ctx.session.activeConnections.length,
        aiProviders: ctx.session.aiProviders.filter(p => p.status === 'active').length,
        timestamp: new Date(),
      }
    }),

  // Get connection statuses
  getConnectionStatus: publicProcedure
    .query(async ({ ctx }) => {
      return {
        mcpServers: await Promise.all(
          ctx.session.mcpServers.map(async (server) => ({
            id: server.id,
            name: server.name,
            status: await mcpService.getConnectionStatus(server.id),
            lastPing: await mcpService.getLastPing(server.id),
          }))
        ),
        aiProviders: ctx.session.aiProviders.map(provider => ({
          id: provider.id,
          name: provider.name,
          status: provider.status,
        })),
      }
    }),
})
```

## Service Layer

### Complete MCP Service Implementation
**Location**: `src/server/services/mcpService.ts`

```typescript
import { spawn, ChildProcess } from 'child_process'
import { MCPServerConfig, MCPConnection, Tool, ToolResult } from '~/server/types'
import { MCPError } from '~/server/types/errors'

export class MCPService {
  private connections = new Map<string, MCPConnection>()
  private processes = new Map<string, ChildProcess>()
  private serverConfigs = new Map<string, MCPServerConfig>()

  async addServer(config: Omit<MCPServerConfig, 'id' | 'status'>): Promise<MCPServerConfig> {
    // Validate configuration
    await this.validateConfig(config)
    
    const server: MCPServerConfig = {
      ...config,
      id: this.generateId(),
      status: 'disconnected',
    }
    
    this.serverConfigs.set(server.id, server)
    return server
  }

  async connect(serverId: string): Promise<MCPConnection> {
    const server = this.serverConfigs.get(serverId)
    if (!server) {
      throw new MCPError('Server configuration not found', 'SERVER_NOT_FOUND', serverId)
    }
    
    // Check if already connected
    if (this.connections.has(serverId)) {
      return this.connections.get(serverId)!
    }

    try {
      // Start MCP server process
      const process = spawn(server.command, server.args || [], {
        env: { ...process.env, ...server.env },
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      // Handle process errors
      process.on('error', (error) => {
        console.error(`MCP server process error (${serverId}):`, error)
        this.cleanup(serverId)
      })

      process.on('exit', (code, signal) => {
        console.log(`MCP server process exited (${serverId}): code=${code}, signal=${signal}`)
        this.cleanup(serverId)
      })

      // Setup JSON-RPC communication
      const connection = new MCPConnection(process.stdin!, process.stdout!, serverId)
      
      // Initialize MCP protocol
      await connection.initialize()
      
      this.connections.set(serverId, connection)
      this.processes.set(serverId, process)
      
      // Update server status
      server.status = 'connected'
      server.lastConnected = new Date()
      
      return connection
    } catch (error) {
      throw new MCPError(
        `Failed to connect to MCP server: ${error.message}`, 
        'CONNECTION_FAILED', 
        serverId
      )
    }
  }

  async disconnect(serverId: string): Promise<void> {
    try {
      const connection = this.connections.get(serverId)
      const process = this.processes.get(serverId)
      
      if (connection) {
        await connection.close()
        this.connections.delete(serverId)
      }
      
      if (process && !process.killed) {
        process.kill('SIGTERM')
        
        // Force kill after timeout
        setTimeout(() => {
          if (!process.killed) {
            process.kill('SIGKILL')
          }
        }, 5000)
        
        this.processes.delete(serverId)
      }
      
      // Update server status
      const server = this.serverConfigs.get(serverId)
      if (server) {
        server.status = 'disconnected'
      }
    } catch (error) {
      console.error(`Error disconnecting from MCP server ${serverId}:`, error)
      throw new MCPError(
        `Failed to disconnect from MCP server: ${error.message}`, 
        'DISCONNECTION_FAILED', 
        serverId
      )
    }
  }

  async getAvailableTools(serverId: string): Promise<Tool[]> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new MCPError('Server not connected', 'SERVER_NOT_CONNECTED', serverId)
    }
    
    try {
      return await connection.listTools()
    } catch (error) {
      throw new MCPError(
        `Failed to get tools: ${error.message}`, 
        'TOOLS_FETCH_FAILED', 
        serverId
      )
    }
  }

  async executeTool(
    serverId: string, 
    toolName: string, 
    parameters: Record<string, any>
  ): Promise<ToolResult> {
    const connection = this.connections.get(serverId)
    if (!connection) {
      throw new MCPError('Server not connected', 'SERVER_NOT_CONNECTED', serverId)
    }
    
    const startTime = Date.now()
    
    try {
      const result = await connection.callTool(toolName, parameters)
      const duration = Date.now() - startTime
      
      return {
        success: true,
        result,
        duration,
        timestamp: new Date(),
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      return {
        success: false,
        error: error.message,
        duration,
        timestamp: new Date(),
      }
    }
  }

  async getConnectionStatus(serverId: string): Promise<'connected' | 'disconnected' | 'error'> {
    const connection = this.connections.get(serverId)
    if (!connection) return 'disconnected'
    
    try {
      await connection.ping()
      return 'connected'
    } catch {
      return 'error'
    }
  }

  async getLastPing(serverId: string): Promise<Date | null> {
    const connection = this.connections.get(serverId)
    return connection?.lastPing || null
  }

  private async validateConfig(config: Omit<MCPServerConfig, 'id' | 'status'>): Promise<void> {
    if (!config.name?.trim()) {
      throw new MCPError('Server name is required', 'INVALID_CONFIG')
    }
    
    if (!config.command?.trim()) {
      throw new MCPError('Server command is required', 'INVALID_CONFIG')
    }
    
    if (config.type === 'remote' && !config.command.startsWith('http')) {
      throw new MCPError('Remote servers must use HTTP/HTTPS URLs', 'INVALID_CONFIG')
    }
  }

  private cleanup(serverId: string): void {
    this.connections.delete(serverId)
    this.processes.delete(serverId)
    
    const server = this.serverConfigs.get(serverId)
    if (server) {
      server.status = 'error'
    }
  }

  private generateId(): string {
    return `mcp_${Math.random().toString(36).substring(2)}_${Date.now()}`
  }

  // Cleanup all connections on shutdown
  async shutdown(): Promise<void> {
    const disconnectPromises = Array.from(this.connections.keys()).map(serverId => 
      this.disconnect(serverId).catch(console.error)
    )
    
    await Promise.all(disconnectPromises)
  }
}

// MCP Connection class for JSON-RPC communication
class MCPConnection {
  public lastPing: Date | null = null
  private messageId = 0

  constructor(
    private stdin: NodeJS.WritableStream,
    private stdout: NodeJS.ReadableStream,
    private serverId: string
  ) {}

  async initialize(): Promise<void> {
    // Send MCP initialization message
    await this.sendMessage('initialize', {
      protocolVersion: '1.0',
      capabilities: {},
    })
  }

  async listTools(): Promise<Tool[]> {
    const response = await this.sendMessage('tools/list', {})
    return response.tools || []
  }

  async callTool(name: string, parameters: Record<string, any>): Promise<any> {
    const response = await this.sendMessage('tools/call', {
      name,
      arguments: parameters,
    })
    return response.content
  }

  async ping(): Promise<void> {
    await this.sendMessage('ping', {})
    this.lastPing = new Date()
  }

  async close(): Promise<void> {
    // Send close message if needed
    this.stdin.end()
  }

  private async sendMessage(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.messageId
      const message = JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      })

      // Set up response handler
      const responseHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString())
          if (response.id === id) {
            this.stdout.off('data', responseHandler)
            if (response.error) {
              reject(new Error(response.error.message))
            } else {
              resolve(response.result)
            }
          }
        } catch (error) {
          reject(error)
        }
      }

      this.stdout.on('data', responseHandler)

      // Send message
      this.stdin.write(message + '\n')

      // Timeout after 30 seconds
      setTimeout(() => {
        this.stdout.off('data', responseHandler)
        reject(new Error('Request timeout'))
      }, 30000)
    })
  }
}

// Singleton instance
export const mcpService = new MCPService()
```

### AI Service
**Location**: `app/server/services/aiService.ts`

```typescript
class AIService {
  async addProvider(config: AIProviderConfig): Promise<AIProviderConfig> {
    // Validate API key format
    await this.validateProvider(config)
    
    const provider = {
      ...config,
      id: generateId(),
      status: '