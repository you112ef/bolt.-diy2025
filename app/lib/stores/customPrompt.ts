import { atom } from 'nanostores';

// Store the custom prompt string. Empty string means no custom prompt is active.
export const customPromptStore = atom<string>('');

export function setCustomPrompt(prompt: string) {
  customPromptStore.set(prompt.trim());
  // Add localStorage persistence if needed:
  // localStorage.setItem('customSystemPrompt', prompt.trim());
}

export function clearCustomPrompt() {
  customPromptStore.set('');
  // localStorage.removeItem('customSystemPrompt');
}

// Load initial value from localStorage (optional, can be added later)
// if (typeof localStorage !== 'undefined') {
//   const savedPrompt = localStorage.getItem('customSystemPrompt');
//   if (savedPrompt) {
//     customPromptStore.set(savedPrompt);
//   }
// }
