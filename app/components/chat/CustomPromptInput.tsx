import React, { useState, useCallback } from 'react';
import { classNames } from '~/utils/classNames';
import { Button } from '~/components/ui/Button'; 
// No custom Textarea component, use standard HTML textarea with Tailwind
// import { Textarea } from '~/components/ui/Textarea'; 

interface CustomPromptInputProps {
  initialPrompt?: string;
  onPromptSubmit: (prompt: string) => void;
  onPromptClear: () => void;
  isPromptActive: boolean;
  placeholder?: string;
  className?: string;
}

export const CustomPromptInput: React.FC<CustomPromptInputProps> = ({
  initialPrompt = '',
  onPromptSubmit,
  onPromptClear,
  isPromptActive,
  placeholder = "Enter your custom system prompt here. This will override any default system prompts.",
  className,
}) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isEditing, setIsEditing] = useState(false); // To show/hide the input area

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(event.target.value);
  };

  const handleSubmit = () => {
    onPromptSubmit(prompt);
    // setIsEditing(false); // Optionally hide after submit
  };

  const handleClear = () => {
    setPrompt('');
    onPromptClear();
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Update local state if initialPrompt changes from parent (e.g. loaded from store)
  React.useEffect(() => {
    setPrompt(initialPrompt);
  }, [initialPrompt]);

  return (
    <div className={classNames('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleEdit}
          className="flex items-center gap-2 text-bolt-elements-textSecondary hover:text-bolt-elements-textPrimary"
        >
          <div className={classNames("i-ph:chats-teardrop text-lg", isPromptActive ? "text-accent-500" : "")} />
          <span>{isEditing ? 'Hide Custom Prompt' : isPromptActive ? 'Edit Custom Prompt' : 'Set Custom Prompt'}</span>
          {isPromptActive && !isEditing && <span className="text-xs text-accent-500">(Active)</span>}
        </Button>
        {isEditing && isPromptActive && (
          <Button variant="ghost" size="sm" onClick={handleClear} className="text-red-500 hover:text-red-600">
            Clear & Disable
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="flex flex-col gap-2 p-3 border border-bolt-elements-borderColor rounded-lg bg-bolt-elements-background-depth-1">
          <textarea
            value={prompt}
            onChange={handleInputChange}
            placeholder={placeholder}
            className="w-full min-h-[80px] text-sm bg-bolt-elements-background-depth-2 dark:bg-bolt-elements-background-depth-3 p-2 rounded-md border border-bolt-elements-borderColor focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500 transition-colors"
            rows={3}
            // Basic RTL support: browsers usually handle this based on input.
            // dir="auto" could be added for more explicit handling if needed.
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSubmit} disabled={!prompt.trim() && !isPromptActive}>
              {isPromptActive && !prompt.trim() ? 'Disable Custom Prompt' : 'Apply Custom Prompt'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
