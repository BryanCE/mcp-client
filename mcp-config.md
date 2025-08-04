// types/mcp-config.ts
import { z } from "zod";

export interface MCPServerConfig {
  id: string;
  name: string;
  serverType: "local" | "remote" | "remote-streamable";
  
  // For local servers (stdio transport)
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  
  // For remote servers (HTTP/SSE transport)
  url?: string;
  headers?: Record<string, string>;
  
  // Common settings
  autoStart?: boolean;
  timeout?: number;
  retryAttempts?: number;
  maxRestarts?: number;
  enabled?: boolean;
  description?: string;
}

export interface MCPConfiguration {
  mcpServers: Record<string, MCPServerConfig>;
  globalSettings?: {
    logLevel?: "debug" | "info" | "warn" | "error";
    maxConcurrentServers?: number;
    defaultTimeout?: number;
    configVersion?: string;
  };
}

export interface ServerStatus {
  id: string;
  status: "stopped" | "starting" | "running" | "error" | "restarting";
  pid?: number;
  startTime?: Date;
  errorMessage?: string;
  restartCount?: number;
  lastError?: string;
}

// Validation schemas
export const MCPServerConfigSchema = z.object({
  id: z.string().min(1, "Server ID is required"),
  name: z.string().min(1, "Server name is required"),
  serverType: z.enum(["local", "remote", "remote-streamable"]),
  
  // Local server fields
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string()).optional(),
  cwd: z.string().optional(),
  
  // Remote server fields
  url: z.string().url().optional(),
  headers: z.record(z.string()).optional(),
  
  // Common fields
  autoStart: z.boolean().default(false),
  timeout: z.number().positive().default(30000),
  retryAttempts: z.number().min(0).default(3),
  maxRestarts: z.number().min(0).default(5),
  enabled: z.boolean().default(true),
  description: z.string().optional(),
}).refine((data) => {
  if (data.serverType === "local") {
    return data.command && data.command.length > 0;
  } else {
    return data.url && data.url.length > 0;
  }
}, {
  message: "Local servers require a command, remote servers require a URL",
});

export const MCPConfigurationSchema = z.object({
  mcpServers: z.record(MCPServerConfigSchema),
  globalSettings: z.object({
    logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
    maxConcurrentServers: z.number().positive().default(10),
    defaultTimeout: z.number().positive().default(30000),
    configVersion: z.string().default("1.0.0"),
  }).optional(),
});

// ============================================================================
// services/mcp-config-manager.ts
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

export class MCPConfigManager extends EventEmitter {
  private configPath: string;
  private config: MCPConfiguration;
  private configWatcher?: fs.FSWatcher;

  constructor(configPath?: string) {
    super();
    this.configPath = configPath || path.join(process.cwd(), 'mcp-config.json');
    this.config = { mcpServers: {} };
  }

  async initialize(): Promise<void> {
    await this.loadConfig();
    await this.watchConfig();
    this.emit('initialized', this.config);
  }

  async loadConfig(): Promise<MCPConfiguration> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const parsedConfig = JSON.parse(configData);
      
      // Validate configuration
      const validatedConfig = MCPConfigurationSchema.parse(parsedConfig);
      this.config = validatedConfig;
      
      console.log(`Loaded MCP configuration with ${Object.keys(this.config.mcpServers).length} servers`);
      return this.config;
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        console.log('No configuration file found, creating default config');
        await this.createDefaultConfig();
        return this.config;
      } else {
        console.error('Error loading MCP configuration:', error);
        throw new Error(`Failed to load MCP configuration: ${(error as Error).message}`);
      }
    }
  }

  async saveConfig(): Promise<void> {
    try {
      // Validate before saving
      MCPConfigurationSchema.parse(this.config);
      
      const configData = JSON.stringify(this.config, null, 2);
      await fs.writeFile(this.configPath, configData, 'utf-8');
      
      console.log('MCP configuration saved successfully');
      this.emit('configSaved', this.config);
    } catch (error) {
      console.error('Error saving MCP configuration:', error);
      throw new Error(`Failed to save MCP configuration: ${(error as Error).message}`);
    }
  }

  private async createDefaultConfig(): Promise<void> {
    this.config = {
      mcpServers: {},
      globalSettings: {
        logLevel: "info",
        maxConcurrentServers: 10,
        defaultTimeout: 30000,
        configVersion: "1.0.0"
      }
    };
    await this.saveConfig();
  }

  private async watchConfig(): Promise<void> {
    try {
      this.configWatcher = fs.watch(this.configPath, async (eventType) => {
        if (eventType === 'change') {
          console.log('Configuration file changed, reloading...');
          try {
            await this.loadConfig();
            this.emit('configChanged', this.config);
          } catch (error) {
            console.error('Error reloading configuration:', error);
            this.emit('configError', error);
          }
        }
      });
    } catch (error) {
      console.warn('Could not watch configuration file:', error);
    }
  }

  // Server management methods
  async addServer(serverConfig: MCPServerConfig): Promise<void> {
    // Validate server config
    MCPServerConfigSchema.parse(serverConfig);
    
    if (this.config.mcpServers[serverConfig.id]) {
      throw new Error(`Server with ID '${serverConfig.id}' already exists`);
    }

    this.config.mcpServers[serverConfig.id] = serverConfig;
    await this.saveConfig();
    this.emit('serverAdded', serverConfig);
  }

  async updateServer(serverId: string, updates: Partial<MCPServerConfig>): Promise<void> {
    const existingServer = this.config.mcpServers[serverId];
    if (!existingServer) {
      throw new Error(`Server with ID '${serverId}' not found`);
    }

    const updatedServer = { ...existingServer, ...updates };
    
    // Validate updated server config
    MCPServerConfigSchema.parse(updatedServer);
    
    this.config.mcpServers[serverId] = updatedServer;
    await this.saveConfig();
    this.emit('serverUpdated', serverId, updatedServer);
  }

  async removeServer(serverId: string): Promise<void> {
    if (!this.config.mcpServers[serverId]) {
      throw new Error(`Server with ID '${serverId}' not found`);
    }

    delete this.config.mcpServers[serverId];
    await this.saveConfig();
    this.emit('serverRemoved', serverId);
  }

  getServer(serverId: string): MCPServerConfig | undefined {
    return this.config.mcpServers[serverId];
  }

  getAllServers(): Record<string, MCPServerConfig> {
    return { ...this.config.mcpServers };
  }

  getAutoStartServers(): MCPServerConfig[] {
    return Object.values(this.config.mcpServers).filter(server => 
      server.autoStart && server.enabled !== false
    );
  }

  async updateGlobalSettings(settings: Partial<MCPConfiguration['globalSettings']>): Promise<void> {
    this.config.globalSettings = {
      ...this.config.globalSettings,
      ...settings
    };
    
    // Validate updated config
    MCPConfigurationSchema.parse(this.config);
    
    await this.saveConfig();
    this.emit('globalSettingsUpdated', this.config.globalSettings);
  }

  getConfiguration(): MCPConfiguration {
    return { ...this.config };
  }

  async destroy(): Promise<void> {
    if (this.configWatcher) {
      this.configWatcher.close();
    }
    this.removeAllListeners();
  }

  // Utility methods
  validateServerConfig(config: unknown): MCPServerConfig {
    return MCPServerConfigSchema.parse(config);
  }

  async exportConfig(exportPath?: string): Promise<string> {
    const exportFilePath = exportPath || path.join(process.cwd(), `mcp-config-export-${Date.now()}.json`);
    const configData = JSON.stringify(this.config, null, 2);
    await fs.writeFile(exportFilePath, configData, 'utf-8');
    return exportFilePath;
  }

  async importConfig(importPath: string, merge: boolean = false): Promise<void> {
    const importData = await fs.readFile(importPath, 'utf-8');
    const importedConfig = JSON.parse(importData);
    
    // Validate imported configuration
    const validatedConfig = MCPConfigurationSchema.parse(importedConfig);
    
    if (merge) {
      // Merge with existing configuration
      this.config.mcpServers = {
        ...this.config.mcpServers,
        ...validatedConfig.mcpServers
      };
      
      if (validatedConfig.globalSettings) {
        this.config.globalSettings = {
          ...this.config.globalSettings,
          ...validatedConfig.globalSettings
        };
      }
    } else {
      // Replace entire configuration
      this.config = validatedConfig;
    }
    
    await this.saveConfig();
    this.emit('configImported', this.config);
  }
}

// ============================================================================
// services/mcp-server-manager.ts
import { spawn, ChildProcess } from 'child_process';
import { MCPClient } from '@punkpeye/mcp-client'; // or your preferred MCP client

export class MCPServerManager extends EventEmitter {
  private servers: Map<string, ChildProcess> = new Map();
  private clients: Map<string, MCPClient> = new Map();
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

    const process = spawn(config.command, config.args || [], {
      env: { ...process.env, ...config.env },
      cwd: config.cwd,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    process.on('error', (error) => {
      console.error(`Server ${config.id} process error:`, error);
      this.updateServerStatus(config.id, { 
        status: 'error', 
        errorMessage: error.message 
      });
      this.emit('serverError', config.id, error);
    });

    process.on('exit', (code, signal) => {
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

    this.servers.set(config.id, process);

    // Create MCP client connection
    const client = new MCPClient({
      name: "MCP Client",
      version: "1.0.0"
    });

    await client.connect({
      type: "stdio",
      command: config.command,
      args: config.args || [],
      env: config.env || {}
    });

    this.clients.set(config.id, client);
    
    this.updateServerStatus(config.id, { 
      status: 'running', 
      pid: process.pid,
      startTime: new Date()
    });

    this.emit('serverStarted', config.id);
  }

  private async startRemoteServer(config: MCPServerConfig): Promise<void> {
    if (!config.url) {
      throw new Error(`No URL specified for remote server ${config.id}`);
    }

    const client = new MCPClient({
      name: "MCP Client",
      version: "1.0.0"
    });

    try {
      await client.connect({
        type: "sse",
        url: config.url
      });

      this.clients.set(config.id, client);
      
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

    if (client) {
      // Close client connection
      await client.disconnect?.();
      this.clients.delete(serverId);
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

  getClient(serverId: string): MCPClient | undefined {
    return this.clients.get(serverId);
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
// Usage example
export async function createMCPSystem(configPath?: string) {
  const configManager = new MCPConfigManager(configPath);
  const serverManager = new MCPServerManager(configManager);
  
  await configManager.initialize();
  await serverManager.initialize();
  
  return {
    configManager,
    serverManager,
    
    // Convenience methods
    async addServer(config: MCPServerConfig) {
      await configManager.addServer(config);
    },
    
    async removeServer(serverId: string) {
      await configManager.removeServer(serverId);
    },
    
    async startServer(serverId: string) {
      await serverManager.startServer(serverId);
    },
    
    async stopServer(serverId: string) {
      await serverManager.stopServer(serverId);
    },
    
    getClient(serverId: string) {
      return serverManager.getClient(serverId);
    },
    
    async shutdown() {
      await serverManager.shutdown();
      await configManager.destroy();
    }
  };
}