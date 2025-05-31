import { Wllama } from "@wllama/wllama";

// TODO: Make paths configurable
const config = {
  paths: {
    "wllama.wasm": "/wllama/single-thread/wllama.wasm",
    "wllama.worker.mjs": "/wllama/single-thread/wllama.worker.mjs",
    "wllama-multi-thread.wasm": "/wllama/multi-thread/wllama.wasm",
    "wllama-multi-thread.worker.mjs": "/wllama/multi-thread/wllama.worker.mjs",
  },
};

let wllamaInstance: Wllama | null = null;

export async function initializeOfflineLlm(): Promise<void> {
  if (!wllamaInstance) {
    console.log("Initializing Wllama instance...");
    wllamaInstance = new Wllama(config);
  } else {
    console.log("Wllama instance already initialized.");
    // If an instance exists, assume the model is loaded or being loaded.
    // If model loading failed previously, it might need a reset mechanism,
    // but for now, we'll rely on the initial load attempt.
    return;
  }

  try {
    console.log("Loading offline model...");
    await wllamaInstance.loadModelFromUrl(
      "/models/stories260K.gguf",
      {
        onProgress: (progress) => {
          console.log(`Model loading progress: ${progress * 100}%`);
        },
      }
    );
    console.log("Offline model loaded successfully.");
  } catch (error) {
    console.error("Error loading offline model:", error);
    wllamaInstance = null; // Reset instance if model loading fails
    throw error; // Re-throw the error to indicate initialization failure
  }
}

export async function getOfflineCompletion(prompt: string): Promise<string> {
  if (!wllamaInstance) {
    console.error("Offline LLM not initialized. Call initializeOfflineLlm() first.");
    throw new Error("Offline LLM not initialized. Call initializeOfflineLlm() first.");
  }

  try {
    console.log("Creating offline completion for prompt:", prompt);
    const completion = await wllamaInstance.createCompletion(prompt, {
      nPredict: 50, // Max tokens to predict
      sampling: {
        temp: 0.5, // Temperature
        top_k: 40, // Top-K sampling
        top_p: 0.9, // Top-P (nucleus) sampling
      },
    });
    console.log("Offline completion result:", completion);
    return completion.text;
  } catch (error) {
    console.error("Error during offline completion:", error);
    throw error; // Re-throw to be handled by the caller
  }
}
