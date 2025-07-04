import type { LanguageModelV1 } from 'ai';
import type { IProviderSetting } from '~/types/model';

export interface ModelInfo {
  name: string;
  label: string;
  provider: string;
  maxTokenAllowed: number;
}

export interface ProviderInfo {
  name: string;
  staticModels: ModelInfo[];
  getDynamicModels?: (
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ) => Promise<ModelInfo[]>;
  getModelInstance: (options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }) => LanguageModelV1;
  getApiKeyLink?: string;
  labelForGetApiKey?: string;
  icon?: string;
}

export interface ProviderConfig {
  baseUrlKey?: string;
  baseUrl?: string;
  apiTokenKey?: string;
}

// Agent System Types
export interface AgentMemory {
  conversations: AgentConversation[];
  context: AgentContext;
  maxEntries: number;
}

export interface AgentConversation {
  id: string;
  timestamp: number;
  prompt: string;
  response: string;
  provider: string;
  model: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  currentFile?: string;
  lastCommand?: string;
  workingDirectory?: string;
  projectType?: string;
  activeSession: string;
  variables: Record<string, any>;
}

export interface Agent {
  id: string;
  name: string;
  provider: string | null;
  memory: AgentMemory;
  isActive: boolean;
  settings: AgentSettings;
  created: number;
  lastUsed: number;
}

export interface AgentSettings {
  temperature?: number;
  maxTokens?: number;
  memoryEnabled: boolean;
  contextSize: number;
  autoSave: boolean;
  personality?: string;
}

// Enhanced Provider Types for Agent Support
export interface AgentCapableProvider extends ProviderInfo {
  supportsAgents?: boolean;
  agentFeatures?: {
    streaming: boolean;
    functionCalling: boolean;
    imageAnalysis: boolean;
    codeExecution: boolean;
  };
}

// Agent Response Types
export interface AgentResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

// AI Service Types
export interface AIServiceConfig {
  provider: string;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  settings?: Record<string, any>;
}
