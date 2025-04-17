import React, { useState } from 'react';
import axios from 'axios';

interface SuggestionBoxProps {
  isOpen: boolean;
  onClose: () => void;
  onSuggestionReceived: (suggestion: string) => void;
  code: string;
  cursorPosition: any;
  context: any;
}

const SuggestionBox: React.FC<SuggestionBoxProps> = ({
  isOpen,
  onClose,
  onSuggestionReceived,
  code,
  cursorPosition,
  context
}) => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:8000/generate', {
        prompt: prompt,
        promptData: {
          code,
          currentLine: code.split('\n')[cursorPosition.lineNumber - 1] || '',
          cursorPosition: cursorPosition.column,
          currentWord: '',
          wordBeforeCursor: '',
          isBeginningOfLine: cursorPosition.column === 1,
          isImporting: false,
          isPragma: false,
          isContract: false,
          isFunction: false,
          isEvent: false,
          isModifier: false,
          isMapping: false,
          isRequire: false,
          isOpenZeppelin: false
        }
      });

      onSuggestionReceived(response.data.suggestion);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get suggestion');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
          Get Code Suggestion
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              What would you like to add?
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              rows={3}
              placeholder="e.g., Add transfer function with balance checks"
            />
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-100 rounded-md">
              {error}
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Getting Suggestion...' : 'Get Suggestion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SuggestionBox; 