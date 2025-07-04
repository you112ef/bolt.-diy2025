import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, PlusIcon, TrashIcon, PlayIcon, PauseIcon, CogIcon } from '@heroicons/react/24/outline';
import { agentManager } from '~/lib/modules/llm/agent-manager';
import type { Agent, AgentSettings } from '~/lib/modules/llm/types';

interface AgentManagerProps {
  className?: string;
}

export const AgentManager: React.FC<AgentManagerProps> = ({ className = '' }) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    loadAgents();
    loadProviders();
  }, []);

  const loadAgents = () => {
    const allAgents = agentManager.getAllAgents();
    setAgents(allAgents);
    setActiveAgent(agentManager.getActiveAgent());
  };

  const loadProviders = () => {
    const availableProviders = agentManager.getAvailableProviders();
    setProviders(availableProviders);
  };

  const handleCreateAgent = (name: string, provider: string) => {
    const agent = agentManager.createAgent(name, provider);
    loadAgents();
    setShowCreateForm(false);
  };

  const handleActivateAgent = (agentId: string) => {
    agentManager.setActiveAgent(agentId);
    loadAgents();
  };

  const handleDeleteAgent = (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      agentManager.deleteAgent(agentId);
      loadAgents();
    }
  };

  const handleUpdateSettings = (agentId: string, settings: Partial<AgentSettings>) => {
    agentManager.updateAgentSettings(agentId, settings);
    loadAgents();
  };

  const handleClearMemory = (agentId: string) => {
    if (confirm('Are you sure you want to clear this agent\'s memory?')) {
      agentManager.clearAgentMemory(agentId);
      loadAgents();
    }
  };

  return (
    <div className={`bg-background-primary min-h-screen px-4 py-6 ${className}`}>
      <div className="night-card max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-text-main">AI Agents</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="violet-btn flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Create Agent
          </button>
        </div>

        {showCreateForm && (
          <CreateAgentForm
            providers={providers}
            onSubmit={handleCreateAgent}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        <div className="space-y-4">
          {agents.map((agent) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              isActive={activeAgent?.id === agent.id}
              providers={providers}
              onActivate={handleActivateAgent}
              onDelete={handleDeleteAgent}
              onUpdateSettings={handleUpdateSettings}
              onClearMemory={handleClearMemory}
              showSettings={showSettings === agent.id}
              onToggleSettings={() => setShowSettings(showSettings === agent.id ? null : agent.id)}
            />
          ))}
        </div>

        {agents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-text-secondary text-sm">No agents created yet</p>
            <p className="text-text-secondary text-sm">Create your first AI agent to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

interface CreateAgentFormProps {
  providers: string[];
  onSubmit: (name: string, provider: string) => void;
  onCancel: () => void;
}

const CreateAgentForm: React.FC<CreateAgentFormProps> = ({ providers, onSubmit, onCancel }) => {
  const [name, setName] = useState('');
  const [provider, setProvider] = useState(providers[0] || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && provider) {
      onSubmit(name.trim(), provider);
    }
  };

  return (
    <div className="night-card mb-6 violet-glow">
      <h3 className="text-md font-semibold text-text-main mb-4">Create New Agent</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            Agent Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="violet-input"
            placeholder="Enter agent name..."
            required
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-text-main mb-2">
            AI Provider
          </label>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="violet-input"
            required
          >
            {providers.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" className="violet-btn">
            Create Agent
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-md bg-background-border text-text-secondary hover:bg-background-input transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

interface AgentCardProps {
  agent: Agent;
  isActive: boolean;
  providers: string[];
  onActivate: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateSettings: (id: string, settings: Partial<AgentSettings>) => void;
  onClearMemory: (id: string) => void;
  showSettings: boolean;
  onToggleSettings: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({
  agent,
  isActive,
  providers,
  onActivate,
  onDelete,
  onUpdateSettings,
  onClearMemory,
  showSettings,
  onToggleSettings,
}) => {
  const [settings, setSettings] = useState<AgentSettings>(agent.settings);

  const handleSaveSettings = () => {
    onUpdateSettings(agent.id, settings);
    onToggleSettings();
  };

  return (
    <div className={`night-card ${isActive ? 'violet-glow border-violet-500' : ''}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-violet-500' : 'bg-background-border'}`} />
          <div>
            <h3 className="font-semibold text-text-main">{agent.name}</h3>
            <p className="text-sm text-text-secondary">
              {agent.provider || 'No provider'} • {agent.memory.conversations.length} conversations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isActive && (
            <button
              onClick={() => onActivate(agent.id)}
              className="p-2 rounded-md bg-violet-600 hover:bg-violet-500 text-white transition-colors"
              title="Activate agent"
            >
              <PlayIcon className="w-4 h-4" />
            </button>
          )}
          
          <button
            onClick={onToggleSettings}
            className="p-2 rounded-md bg-background-border hover:bg-background-input text-text-secondary transition-colors"
            title="Settings"
          >
            <CogIcon className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => onDelete(agent.id)}
            className="p-2 rounded-md bg-red-600 hover:bg-red-500 text-white transition-colors"
            title="Delete agent"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="pt-4 border-t border-background-border space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Temperature
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => setSettings({...settings, temperature: parseFloat(e.target.value)})}
                className="w-full"
              />
              <div className="text-xs text-text-secondary">{settings.temperature}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-text-main mb-2">
                Max Tokens
              </label>
              <input
                type="number"
                value={settings.maxTokens}
                onChange={(e) => setSettings({...settings, maxTokens: parseInt(e.target.value)})}
                className="violet-input"
                min="100"
                max="8000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-main mb-2">
              Personality
            </label>
            <textarea
              value={settings.personality}
              onChange={(e) => setSettings({...settings, personality: e.target.value})}
              className="violet-input min-h-[80px] resize-none"
              placeholder="Describe the agent's personality..."
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.memoryEnabled}
                onChange={(e) => setSettings({...settings, memoryEnabled: e.target.checked})}
                className="rounded border-background-border"
              />
              <span className="text-sm text-text-main">Enable Memory</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.autoSave}
                onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
                className="rounded border-background-border"
              />
              <span className="text-sm text-text-main">Auto Save</span>
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveSettings} className="violet-btn">
              Save Settings
            </button>
            <button
              onClick={() => onClearMemory(agent.id)}
              className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Clear Memory
            </button>
            <button
              onClick={onToggleSettings}
              className="px-4 py-2 rounded-md bg-background-border text-text-secondary hover:bg-background-input transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-text-secondary mt-4">
        Created: {new Date(agent.created).toLocaleDateString()} • 
        Last used: {new Date(agent.lastUsed).toLocaleDateString()}
      </div>
    </div>
  );
};