// services/mcp-config-manager.ts
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';
import { watch, type FSWatcher } from 'fs';
import { MCPConfigurationSchema, MCPServerConfigSchema, type GlobalSettings, type MCPConfiguration, type MCPServerConfig } from '~/types';

export class MCPConfigManager extends EventEmitter {
  private configPath: string;
  private config: MCPConfiguration;
  private configWatcher?: FSWatcher;

  constructor(configPath?: string) {
    super();
    this.configPath = configPath ?? path.join(process.cwd(), 'mcp-config.json');
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
      const parsedConfig: unknown = JSON.parse(configData);
      
      // Validate configuration
      const validatedConfig = MCPConfigurationSchema.parse(parsedConfig);
      this.config = validatedConfig;
      
      console.log(`Loaded MCP configuration with ${Object.keys(this.config.mcpServers).length} servers`);
      return this.config;
    } catch (error) {
      if (isNodeENOENT(error)) {
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
      // Avoid returning a Promise from FS watch callback to satisfy no-misused-promises
      this.configWatcher = watch(this.configPath, (eventType: string) => {
        if (eventType === 'change') {
          void (async () => {
            console.log('Configuration file changed, reloading...');
            try {
              await this.loadConfig();
              this.emit('configChanged', this.config);
            } catch (error) {
              console.error('Error reloading configuration:', error);
              this.emit('configError', error);
            }
          })();
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

  async updateGlobalSettings(settings: Partial<GlobalSettings>): Promise<void> {
    this.config.globalSettings = {
      ...(this.config.globalSettings ?? {}),
      ...settings
    } as GlobalSettings;
    
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
    const exportFilePath = exportPath ?? path.join(process.cwd(), `mcp-config-export-${Date.now()}.json`);
    const configData = JSON.stringify(this.config, null, 2);
    await fs.writeFile(exportFilePath, configData, 'utf-8');
    return exportFilePath;
  }

  async importConfig(importPath: string, merge = false): Promise<void> {
    const importData = await fs.readFile(importPath, 'utf-8');
    const importedConfig: unknown = JSON.parse(importData);
    
    // Validate imported configuration
    const validatedConfig: MCPConfiguration = MCPConfigurationSchema.parse(importedConfig);
    
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

// NodeJS fs/promises errors use NodeJS.ErrnoException interface (code?: string)
function isNodeENOENT(err: unknown): err is NodeJS.ErrnoException & { code: 'ENOENT' } {
  return !!err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === 'ENOENT';
}

// ============================================================================
