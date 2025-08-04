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
  env: z.record(z.string(), z.string()).optional(),
  cwd: z.string().optional(),
  
  // Remote server fields
  url: z.string().url().optional(),
  headers: z.record(z.string(), z.string()).optional(),
  
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
  mcpServers: z.record(z.string(), MCPServerConfigSchema),
  globalSettings: z.object({
    logLevel: z.enum(["debug", "info", "warn", "error"]).default("info"),
    maxConcurrentServers: z.number().positive().default(10),
    defaultTimeout: z.number().positive().default(30000),
    configVersion: z.string().default("1.0.0"),
  }).optional(),
});

// ============================================================================