import type { 
  Agent, 
  AgentMemory, 
  AgentContext, 
  AgentConversation, 
  AgentResponse, 
  AgentSettings,
  AIServiceConfig 
} from './types';
import { LLMManager } from './manager';
import { createScopedLogger } from '~/utils/logger';
import { generateId } from '~/utils/fileUtils';

const logger = createScopedLogger('AgentManager');

export class AgentManager {
  private static _instance: AgentManager;
  private _agents: Map<string, Agent> = new Map();
  private _activeAgent: Agent | null = null;
  private _llmManager: LLMManager;

  private constructor() {
    this._llmManager = LLMManager.getInstance();
    this._loadAgentsFromStorage();
  }

  static getInstance(): AgentManager {
    if (!AgentManager._instance) {
      AgentManager._instance = new AgentManager();
    }
    return AgentManager._instance;
  }

  // Agent Management
  createAgent(name: string, provider?: string, settings?: Partial<AgentSettings>): Agent {
    const agent: Agent = {
      id: generateId(),
      name,
      provider: provider || null,
      memory: this._createEmptyMemory(),
      isActive: false,
      settings: {
        temperature: 0.7,
        maxTokens: 4000,
        memoryEnabled: true,
        contextSize: 10,
        autoSave: true,
        personality: 'helpful assistant',
        ...settings
      },
      created: Date.now(),
      lastUsed: Date.now()
    };

    this._agents.set(agent.id, agent);
    this._saveAgentsToStorage();
    
    logger.info(`Created new agent: ${name} (${agent.id})`);
    return agent;
  }

  getAgent(id: string): Agent | undefined {
    return this._agents.get(id);
  }

  getAllAgents(): Agent[] {
    return Array.from(this._agents.values());
  }

  setActiveAgent(agentId: string): void {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // Deactivate current active agent
    if (this._activeAgent) {
      this._activeAgent.isActive = false;
    }

    // Activate new agent
    agent.isActive = true;
    agent.lastUsed = Date.now();
    this._activeAgent = agent;
    
    this._saveAgentsToStorage();
    logger.info(`Activated agent: ${agent.name}`);
  }

  getActiveAgent(): Agent | null {
    return this._activeAgent;
  }

  deleteAgent(agentId: string): boolean {
    const agent = this._agents.get(agentId);
    if (!agent) {
      return false;
    }

    if (this._activeAgent?.id === agentId) {
      this._activeAgent = null;
    }

    this._agents.delete(agentId);
    this._saveAgentsToStorage();
    
    logger.info(`Deleted agent: ${agent.name}`);
    return true;
  }

  updateAgentSettings(agentId: string, settings: Partial<AgentSettings>): void {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.settings = { ...agent.settings, ...settings };
    this._saveAgentsToStorage();
  }

  // AI Interaction
  async askAgent(agentId: string, prompt: string, context?: Partial<AgentContext>): Promise<AgentResponse> {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    if (!agent.provider) {
      throw new Error(`Agent ${agent.name} has no provider configured`);
    }

    // Update context
    if (context) {
      agent.memory.context = { ...agent.memory.context, ...context };
    }

    // Build full prompt with context and memory
    const fullPrompt = this._buildPromptWithContext(agent, prompt);

    try {
      // Get AI response
      const response = await this._callAI(agent, fullPrompt);

      // Store conversation in memory
      if (agent.settings.memoryEnabled) {
        this._addToMemory(agent, prompt, response.content);
      }

      agent.lastUsed = Date.now();
      this._saveAgentsToStorage();

      return response;
    } catch (error: any) {
      logger.error(`Error asking agent ${agent.name}:`, error);
      throw error;
    }
  }

  // Memory Management
  getAgentMemory(agentId: string): AgentMemory | undefined {
    const agent = this._agents.get(agentId);
    return agent?.memory;
  }

  clearAgentMemory(agentId: string): void {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.memory = this._createEmptyMemory();
    this._saveAgentsToStorage();
    logger.info(`Cleared memory for agent: ${agent.name}`);
  }

  addToAgentContext(agentId: string, key: string, value: any): void {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.memory.context.variables[key] = value;
    this._saveAgentsToStorage();
  }

  // Provider Management
  setAgentProvider(agentId: string, provider: string): void {
    const agent = this._agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    const availableProvider = this._llmManager.getProvider(provider);
    if (!availableProvider) {
      throw new Error(`Provider ${provider} not found`);
    }

    agent.provider = provider;
    this._saveAgentsToStorage();
    logger.info(`Set provider ${provider} for agent ${agent.name}`);
  }

  getAvailableProviders(): string[] {
    return this._llmManager.getAllProviders().map(p => p.name);
  }

  // Private Methods
  private _createEmptyMemory(): AgentMemory {
    return {
      conversations: [],
      context: {
        activeSession: generateId(),
        variables: {}
      },
      maxEntries: 50
    };
  }

  private _buildPromptWithContext(agent: Agent, prompt: string): string {
    let fullPrompt = '';

    // Add personality
    if (agent.settings.personality) {
      fullPrompt += `You are a ${agent.settings.personality}.\n\n`;
    }

    // Add context information
    const context = agent.memory.context;
    if (context.currentFile) {
      fullPrompt += `Current file: ${context.currentFile}\n`;
    }
    if (context.workingDirectory) {
      fullPrompt += `Working directory: ${context.workingDirectory}\n`;
    }
    if (context.projectType) {
      fullPrompt += `Project type: ${context.projectType}\n`;
    }

    // Add recent conversations for context
    if (agent.settings.memoryEnabled && agent.memory.conversations.length > 0) {
      const recentConversations = agent.memory.conversations
        .slice(-agent.settings.contextSize)
        .map(conv => `User: ${conv.prompt}\nAssistant: ${conv.response}`)
        .join('\n\n');
      
      fullPrompt += `\nRecent conversation context:\n${recentConversations}\n\n`;
    }

    // Add current prompt
    fullPrompt += `User: ${prompt}`;

    return fullPrompt;
  }

  private async _callAI(agent: Agent, prompt: string): Promise<AgentResponse> {
    const provider = this._llmManager.getProvider(agent.provider!);
    if (!provider) {
      throw new Error(`Provider ${agent.provider} not found`);
    }

    // This is a simplified version - you would implement the actual AI call here
    // using the provider's model instance
    const modelInstance = provider.getModelInstance({
      model: provider.staticModels[0]?.name || 'default',
      serverEnv: this._llmManager.env,
    });

    // Simulate AI response for now
    const response: AgentResponse = {
      content: `AI response to: ${prompt}`,
      provider: agent.provider!,
      model: provider.staticModels[0]?.name || 'default',
      usage: {
        promptTokens: prompt.length / 4, // Rough estimate
        completionTokens: 50,
        totalTokens: (prompt.length / 4) + 50
      }
    };

    return response;
  }

  private _addToMemory(agent: Agent, prompt: string, response: string): void {
    const conversation: AgentConversation = {
      id: generateId(),
      timestamp: Date.now(),
      prompt,
      response,
      provider: agent.provider!,
      model: 'current-model' // You would get this from the actual call
    };

    agent.memory.conversations.push(conversation);

    // Trim memory if it exceeds max entries
    if (agent.memory.conversations.length > agent.memory.maxEntries) {
      agent.memory.conversations = agent.memory.conversations.slice(-agent.memory.maxEntries);
    }
  }

  private _loadAgentsFromStorage(): void {
    try {
      const stored = localStorage.getItem('bolt-agents');
      if (stored) {
        const agentsData = JSON.parse(stored);
        agentsData.forEach((agentData: Agent) => {
          this._agents.set(agentData.id, agentData);
          if (agentData.isActive) {
            this._activeAgent = agentData;
          }
        });
        logger.info(`Loaded ${this._agents.size} agents from storage`);
      }
    } catch (error) {
      logger.error('Error loading agents from storage:', error);
    }
  }

  private _saveAgentsToStorage(): void {
    try {
      const agentsArray = Array.from(this._agents.values());
      localStorage.setItem('bolt-agents', JSON.stringify(agentsArray));
    } catch (error) {
      logger.error('Error saving agents to storage:', error);
    }
  }
}

// Export singleton instance
export const agentManager = AgentManager.getInstance();