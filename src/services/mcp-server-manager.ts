// services/mcp-server-manager.ts
import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { MCPServerConfig, ServerStatus } from '~/types/mcp-config';
import type { MCPConfigManager } from './mcp-config-manager';
import EventEmitter from 'events';

export class MCPServerManager extends EventEmitter {
  private servers: Map<string, ChildProcess> = new Map();
  private clients: Map<string, Client> = new Map();
  private transports: Map<string, Transport> = new Map();
  private serverStatus: Map<string, ServerStatus> = new Map();
  private configManager: MCPConfigManager;

  constructor(configManager: MCPConfigManager) {
    super();
    this.configManager = configManager;
    
    // Listen for configuration changes
    this.configManager.on('serverAdded', (server) => this.handleServerAdded(server));
    this.configManager.on('serverUpdated', (id, server) => this.handleServerUpdated(id, server));
    this.configManager.on('serverRemoved', (id) => this.handleServerRemoved(id));
  }

  async initialize(): Promise<void> {
    // Start auto-start servers
    const autoStartServers = this.configManager.getAutoStartServers();
    for (const server of autoStartServers) {
      try {
        await this.startServer(server.id);
      } catch (error) {
        console.error(`Failed to auto-start server ${server.id}:`, error);
      }
    }
  }

  async startServer(serverId: string): Promise<void> {
    const serverConfig = this.configManager.getServer(serverId);
    if (!serverConfig) {
      throw new Error(`Server configuration not found: ${serverId}`);
    }

    if (this.servers.has(serverId)) {
      throw new Error(`Server ${serverId} is already running`);
    }

    this.updateServerStatus(serverId, { status: 'starting' });

    try {
      if (serverConfig.serverType === 'local') {
        await this.startLocalServer(serverConfig);
      } else {
        await this.startRemoteServer(serverConfig);
      }
    } catch (error) {
      this.updateServerStatus(serverId, { 
        status: 'error', 
        errorMessage: (error as Error).message 
      });
      throw error;
    }
  }

  private async startLocalServer(config: MCPServerConfig): Promise<void> {
    if (!config.command) {
      throw new Error(`No command specified for local server ${config.id}`);
    }

    const serverProcess = spawn(config.command, config.args || [], {
      env: { ...process.env, ...config.env },
      cwd: config.cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    serverProcess.on('error', (error: Error) => {
      console.error(`Server ${config.id} process error:`, error);
      this.updateServerStatus(config.id, { 
        status: 'error', 
        errorMessage: error.message 
      });
      this.emit('serverError', config.id, error);
    });

    serverProcess.on('exit', (code: number | null, signal: NodeJS.Signals | null) => {
      console.log(`Server ${config.id} exited with code ${code}, signal ${signal}`);
      this.servers.delete(config.id);
      this.clients.delete(config.id);
      
      if (code === 0) {
        this.updateServerStatus(config.id, { status: 'stopped' });
      } else {
        this.updateServerStatus(config.id, { 
          status: 'error', 
          errorMessage: `Process exited with code ${code}` 
        });
      }
      
      this.emit('serverStopped', config.id, code, signal);
    });

    this.servers.set(config.id, serverProcess);

    // Create MCP client connection using official SDK
    const transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: { ...process.env as Record<string, string>, ...config.env }
    });

    const client = new Client({
      name: "MCP Client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    await client.connect(transport);

    this.clients.set(config.id, client);
    this.transports.set(config.id, transport);
    
    this.updateServerStatus(config.id, { 
      status: 'running', 
      pid: serverProcess.pid,
      startTime: new Date()
    });

    this.emit('serverStarted', config.id);
  }

  private async startRemoteServer(config: MCPServerConfig): Promise<void> {
    if (!config.url) {
      throw new Error(`No URL specified for remote server ${config.id}`);
    }

    let transport: Transport;
    
    if (config.serverType === 'remote' || config.serverType === 'remote-streamable') {
      // Use SSE transport for both remote server types
      // The official SDK handles the protocol negotiation internally
      transport = new SSEClientTransport(new URL(config.url));
    } else {
      throw new Error(`Unsupported remote server type: ${config.serverType}`);
    }

    const client = new Client({
      name: "MCP Client",
      version: "1.0.0"
    }, {
      capabilities: {}
    });

    try {
      await client.connect(transport);

      this.clients.set(config.id, client);
      this.transports.set(config.id, transport);
      
      this.updateServerStatus(config.id, { 
        status: 'running',
        startTime: new Date()
      });

      this.emit('serverStarted', config.id);
    } catch (error) {
      throw new Error(`Failed to connect to remote server: ${(error as Error).message}`);
    }
  }

  async stopServer(serverId: string): Promise<void> {
    const process = this.servers.get(serverId);
    const client = this.clients.get(serverId);
    const transport = this.transports.get(serverId);

    if (client) {
      // Close client connection
      await client.close?.();
      this.clients.delete(serverId);
    }

    if (transport) {
      // Close transport connection
      await transport.close?.();
      this.transports.delete(serverId);
    }

    if (process) {
      process.kill('SIGTERM');
      
      // Force kill after timeout
      setTimeout(() => {
        if (!process.killed) {
          process.kill('SIGKILL');
        }
      }, 5000);
      
      this.servers.delete(serverId);
    }

    this.updateServerStatus(serverId, { status: 'stopped' });
    this.emit('serverStopped', serverId);
  }

  async restartServer(serverId: string): Promise<void> {
    this.updateServerStatus(serverId, { status: 'restarting' });
    
    if (this.isRunning(serverId)) {
      await this.stopServer(serverId);
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    await this.startServer(serverId);
  }

  isRunning(serverId: string): boolean {
    const status = this.serverStatus.get(serverId);
    return status?.status === 'running';
  }

  getServerStatus(serverId: string): ServerStatus | undefined {
    return this.serverStatus.get(serverId);
  }

  getAllServerStatus(): Map<string, ServerStatus> {
    return new Map(this.serverStatus);
  }

  getClient(serverId: string): Client | undefined {
    return this.clients.get(serverId);
  }

  async getAvailableTools(serverId: string) {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not connected`);
    }
    
    try {
      return await client.listTools();
    } catch (error) {
      throw new Error(`Failed to get tools from server ${serverId}: ${(error as Error).message}`);
    }
  }

  async callTool(serverId: string, name: string, parameters: Record<string, any>) {
    const client = this.clients.get(serverId);
    if (!client) {
      throw new Error(`Server ${serverId} not connected`);
    }
    
    try {
      return await client.callTool({ name, arguments: parameters });
    } catch (error) {
      throw new Error(`Failed to call tool ${name} on server ${serverId}: ${(error as Error).message}`);
    }
  }

  private updateServerStatus(serverId: string, update: Partial<ServerStatus>): void {
    const current = this.serverStatus.get(serverId) || { id: serverId, status: 'stopped' };
    const updated = { ...current, ...update };
    this.serverStatus.set(serverId, updated);
    this.emit('statusChanged', serverId, updated);
  }

  private async handleServerAdded(server: MCPServerConfig): Promise<void> {
    if (server.autoStart) {
      try {
        await this.startServer(server.id);
      } catch (error) {
        console.error(`Failed to auto-start newly added server ${server.id}:`, error);
      }
    }
  }

  private async handleServerUpdated(serverId: string, server: MCPServerConfig): Promise<void> {
    // Restart server if it's currently running to pick up changes
    if (this.isRunning(serverId)) {
      try {
        await this.restartServer(serverId);
      } catch (error) {
        console.error(`Failed to restart updated server ${serverId}:`, error);
      }
    }
  }

  private async handleServerRemoved(serverId: string): Promise<void> {
    if (this.isRunning(serverId)) {
      await this.stopServer(serverId);
    }
    this.serverStatus.delete(serverId);
  }

  async shutdown(): Promise<void> {
    const runningServers = Array.from(this.servers.keys());
    
    await Promise.all(
      runningServers.map(serverId => this.stopServer(serverId))
    );
    
    this.removeAllListeners();
  }
}

// ============================================================================