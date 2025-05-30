import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
// Import settings store to get model path, or define placeholder here
// For now, let's assume a placeholder model.
// import { settingsStore } from '~/lib/stores/settings';

const PLACEHOLDER_MODEL_NAME = "Local LLaMA Model (Not Configured)";
const PLACEHOLDER_EXECUTABLE_PATH = "/path/to/llama-cpp/server"; // User will configure this
const PLACEHOLDER_MODEL_FILE_PATH = "/path/to/your/model.gguf"; // User will configure this

export default class LocalLlamaCppProvider extends BaseProvider {
  name = 'LocalLLaMA';
  // Consider a more specific icon later, e.g., a llama or a brain chip
  icon = 'i-ph:desktop-tower'; // Represents local hardware
  isLocal = true; // Custom flag to identify local providers

  // No API key needed in the traditional sense, but settings act as configuration.
  // We can skip apiKeyNeeded and hideApiKey fields or set them appropriately.
  // getApiKeyLink = undefined; // No link to get an API key
  // labelForGetApiKey = undefined;

  // Configuration will come from settings store (e.g., path to model)
  config = {
    // We might not use these directly if settings are global
    // serverPathKey: 'LOCAL_LLAMA_SERVER_PATH',
    // modelPathKey: 'LOCAL_LLAMA_MODEL_PATH',
  };

  staticModels: ModelInfo[] = [
    // This could be populated from settings in the future
    {
      name: PLACEHOLDER_MODEL_NAME,
      label: PLACEHOLDER_MODEL_NAME,
      provider: this.name,
      maxTokenAllowed: 4096, // Common context size, adjust as needed
      isLocal: true,
    },
  ];

  // In a real scenario, this would check settings for configured model(s)
  async getDynamicModels(
    apiKeys?: Record<string, string>, // Not used for API keys, but could pass other configs
    settings?: IProviderSetting, // Per-provider settings if any
    // serverEnv: Record<string, string> = {}, // Not directly used yet
  ): Promise<ModelInfo[]> {
    // For now, return the static placeholder.
    // Later, this could read from app settings (e.g., settingsStore.get().localLlamaModelPath)
    // and create a ModelInfo entry if the path is set.
    // If multiple local models are supported, this could list them.
    const modelPath = settings?.modelPath || PLACEHOLDER_MODEL_FILE_PATH; // Example if we pass model path via IProviderSetting
    
    if (modelPath && modelPath !== PLACEHOLDER_MODEL_FILE_PATH) {
        const modelName = modelPath.split('/').pop() || "Local Model";
        return [
            {
                name: modelName,
                label: `Local: ${modelName}`,
                provider: this.name,
                maxTokenAllowed: 4096, // Default, could be part of model config
                isLocal: true,
            }
        ];
    }
    return this.staticModels;
  }

  getModelInstance(options: {
    model: string; // Model name, e.g., the GGUF file name or an alias
    serverEnv?: Env;
    apiKeys?: Record<string, string>; // Not for API keys, but for other configs
    providerSettings?: Record<string, IProviderSetting>; // Contains paths
  }): LanguageModelV1 {
    const { model, providerSettings } = options;
    const localSettings = providerSettings?.[this.name];

    const serverPath = localSettings?.serverPath || PLACEHOLDER_EXECUTABLE_PATH;
    const modelPath = localSettings?.modelPath || PLACEHOLDER_MODEL_FILE_PATH;
    
    // const serverPath = settingsStore.get().localLlamaServerPath || PLACEHOLDER_EXECUTABLE_PATH;
    // const modelPath = settingsStore.get().localLlamaModelPath || PLACEHOLDER_MODEL_FILE_PATH;


    console.log(`LocalLLaMA: Attempting to use server "${serverPath}" with model "${modelPath}" for requested model "${model}"`);

    // This is where the actual interaction with llama-server would happen.
    // For now, as per subtask, this is a placeholder.
    // It should eventually return an instance that conforms to LanguageModelV1,
    // which would make HTTP calls to the local llama-server.
    // Example using a dummy object that somewhat matches the expected structure:
    if (!modelPath || modelPath === PLACEHOLDER_MODEL_FILE_PATH) {
        throw new Error(
            `LocalLLaMA provider is not configured. Please set the model path in settings.`
          );
    }
    
    // Placeholder: In a real scenario, this would be an actual client.
    // For now, returning a structure that won't crash but will clearly indicate it's not functional.

    // The actual LanguageModelV1 implementation for llama.cpp
    const modelInstance: LanguageModelV1 = {
      provider: this.name,
      modelId: model, // Or a fixed ID if llama-server serves one model
      // @ts-ignore - settings might not be on the base LanguageModelV1 type directly
      settings: localSettings || {}, 
      // Main method for chat completions
      doChat: async (options) => {
        const { messages, mode, temperature, maxTokens, topP, seed, frequencyPenalty, presencePenalty, stopSequences } = options;
        
        // Get server connection details (TODO: make port dynamic from status store or settings)
        const port = 8080; // Default, should be from localLlamaServerStatusStore or settings
        const host = '127.0.0.1';
        const serverUrl = `http://${host}:${port}/v1/chat/completions`;

        const payload = {
          model: model, // llama-server might ignore this, but good to send
          messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
          stream: false, // TODO: Force non-streaming for now. Implement proper SSE for stream: mode === 'stream'
          temperature: temperature,
          max_tokens: maxTokens,
          top_p: topP,
          seed: seed,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          stop: stopSequences,
          // n_predict for llama.cpp specific max tokens equivalent if needed
        };

        console.log('LocalLLaMA: Sending request to', serverUrl, 'with payload:', JSON.stringify(payload, null, 2));

        try {
          const response = await fetch(serverUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              // llama-server typically doesn't require an API key
            },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            const errorBody = await response.json().catch(() => ({ message: response.statusText }));
            console.error('LocalLLaMA API Error:', errorBody);
            throw new Error(`LocalLLaMA API request failed with status ${response.status}: ${errorBody.message || JSON.stringify(errorBody)}`);
          }

          if (mode === 'stream') {
            // Streaming implementation (complex, requires parsing Server-Sent Events)
            // For now, let's throw an error indicating it's not yet supported, or adapt a simple non-streaming path.
            // To fully implement, we'd need to return an AsyncIterable<ExperimentalMessageChunk>
            // For simplicity in this step, we'll try to read the full response if stream was requested but not fully handled.
            // This is NOT a proper stream handling.
             if (!response.body) {
                throw new Error('Response body is null for streaming request.');
            }
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullContent = "";
            let usage: { promptTokens: number, completionTokens: number, totalTokens: number } = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
            let finishReason: any = 'stop';

            // This is a makeshift stream reader for non-compliant OpenAI stream from basic llama-server if it doesn't do SSE properly for non-streaming clients
            // A proper SSE parser is needed for true streaming.
            // Example: llama.cpp server with --stream will send SSE. Without it, it sends a JSON.
            // If payload.stream was true, and server supports SSE:
            // For now, we'll assume if mode === 'stream', we'll just collect the whole JSON response if it's not SSE
            // THIS PART IS A HACK for initial testing if proper streaming isn't set up.
            // Ideally, the server would send SSE if stream: true, or a single JSON if stream: false.
            // Assuming llama-server sends a single JSON if stream:false, and SSE if stream:true.
            // The code below will only work correctly for stream:false or if stream:true results in a single JSON (incorrect server behavior).

            const responseData = await response.json();
            console.log("LocalLLaMA Raw Response Data:", responseData);

            if (responseData.choices && responseData.choices.length > 0) {
                fullContent = responseData.choices[0].message?.content || "";
                finishReason = responseData.choices[0].finish_reason || 'stop';
            }
            if (responseData.usage) {
                usage = { 
                    promptTokens: responseData.usage.prompt_tokens || 0, 
                    completionTokens: responseData.usage.completion_tokens || 0, 
                    totalTokens: responseData.usage.total_tokens || 0
                };
            }
            
            // This is NOT how streaming works. This is a fallback for initial test.
            // For actual streaming, you'd yield chunks.
            // The Vercel AI SDK expects an AsyncIterable<OpenAIStreamChunk> or similar.
            // If mode was 'stream' but we forced payload.stream = false, we'd get a single JSON.
            // If proper streaming is implemented, this whole block needs to change.
            // For now, this 'if' block handles the case where payload.stream was true,
            // but we are only implementing the non-streaming response handling.
            // This will effectively make all calls non-streaming for now.
             const responseData = await response.json(); // Assuming server sends full JSON if stream:false
             console.log("LocalLLaMA Full Response (Forced Non-Streaming):", responseData);

            const messageContent = responseData.choices?.[0]?.message?.content || '';
            const finishReasonData = responseData.choices?.[0]?.finish_reason || 'stop';
            const usageData = responseData.usage ? {
                promptTokens: responseData.usage.prompt_tokens || 0,
                completionTokens: responseData.usage.completion_tokens || 0,
                totalTokens: responseData.usage.total_tokens || 0,
            } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

            return {
              messages: [{ role: 'assistant', content: messageContent }],
              finishReason: finishReasonData,
              usage: usageData,
            };
            // End of temporary non-streaming handling for 'stream' mode.

          } else { // mode === 'object' (non-streaming) - this path will now be taken.
            const responseData = await response.json();
            console.log("LocalLLaMA Full Response (Non-Streaming):", responseData);
            
            const messageContent = responseData.choices?.[0]?.message?.content || '';
            const finishReasonData = responseData.choices?.[0]?.finish_reason || 'stop';
            const usageData = responseData.usage ? {
                promptTokens: responseData.usage.prompt_tokens || 0,
                completionTokens: responseData.usage.completion_tokens || 0,
                totalTokens: responseData.usage.total_tokens || 0,
            } : { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

            return {
              messages: [{ role: 'assistant', content: messageContent }],
              finishReason: finishReasonData,
              usage: usageData,
            };
          }

        } catch (error) {
          console.error('LocalLLaMA request failed:', error);
          // Ensure error is propagated correctly for useChat hook
          if (options.onError) {
            options.onError(error as Error);
          }
          // Re-throw or return an error structure if the interface expects it
          throw error; 
        }
      },
      // Other methods like doGenerate could be added here if needed
    };
    
    // @ts-ignore
    return modelInstance;
  }
}
