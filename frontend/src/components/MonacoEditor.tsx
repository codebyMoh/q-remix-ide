import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";
import * as monaco from 'monaco-editor';
import { getNodeById, updateNode } from "../utils/IndexDB";
import type { FileSystemNode } from "../types";
import { useEditor } from "../context/EditorContext";
import { solidityKeywords, solidityTypes, soliditySnippets } from "../config/solidity";
import SuggestionBox from "./SuggestionBox";
import axios from 'axios';

interface MonacoEditorProps {
  file: FileSystemNode;
  zoom: number;
  editCode?: string;
  error?: string;
  compilationResult?: any;
  code?: string;
}

const MonacoEditor: React.FC<MonacoEditorProps> = ({
  file,
  error,
  code,
  compilationResult,
}) => {
  const [content, setContent] = useState(file?.content || code);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  
  // AI suggestion states
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<monaco.Position | null>(null);
  const [isFetchingSuggestion, setIsFetchingSuggestion] = useState(false);
  const promptInputRef = useRef<HTMLInputElement | null>(null);
  
  const [showSuggestionBox, setShowSuggestionBox] = useState(false);
  const [ghostText, setGhostText] = useState<string | null>(null);
  const [isLoadingGhostText, setIsLoadingGhostText] = useState(false);
  const ghostTextTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const [capturedSuggestion, setCapturedSuggestion] = useState<string | null>(null);
  const [capturedCursorPosition, setCapturedCursorPosition] = useState<monaco.IPosition | null>(null);
  
  useEffect(() => {
    const loadContent = async () => {
      const latestFile = await getNodeById(file?.id);
      if (latestFile) {
        setContent(latestFile.content || "");
        setIsDirty(false);
      }
    };
    loadContent();
  }, [file?.id]);

  const { updateActiveFileContent } = useEditor();

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Ensure we fetch latest content directly from Monaco Editor
      const latestContent = editorRef.current?.getValue() || content;

      const updatedFile = {
        ...file,
        content: latestContent,
        updatedAt: Date.now(),
      };

      await updateNode(updatedFile);
      setIsDirty(false);
    } catch (error) {
      console.error("Failed to save file:", error);
      alert("Failed to save file. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Show the prompt input UI when user presses Ctrl+I
  const handleShowPromptInput = () => {
    if (!editorRef.current) return;
    
    const editor = editorRef.current;
    const position = editor.getPosition();
    
    if (position) {
      setCursorPosition(position);
      setShowPromptInput(true);
      
      // Focus the input field after a short delay to ensure it's rendered
      setTimeout(() => {
        if (promptInputRef.current) {
          promptInputRef.current.focus();
        }
      }, 100);
    }
  };
  
  // Hide the prompt input UI
  const handleHidePromptInput = () => {
    setShowPromptInput(false);
    setAiPrompt("");
  };
  
  // Fetch AI suggestion when user submits prompt
  const handleFetchSuggestion = async () => {
    if (!editorRef.current || !cursorPosition) return;

    try {
        const model = editorRef.current.getModel();
        if (!model) return;

        const currentLine = model.getLineContent(cursorPosition.lineNumber);
        const wordBeforeCursor = currentLine.substring(0, cursorPosition.column - 1);
        const currentWord = model.getWordAtPosition(cursorPosition)?.word || '';

        // Check if we should trigger completion
        const shouldTrigger = wordBeforeCursor.endsWith(' ') || 
                            /[\w]/.test(currentWord);

        if (!shouldTrigger) {
            setAiSuggestion('');
            return;
        }

        console.log('Fetching suggestion for:', {
            currentLine,
            wordBeforeCursor,
            currentWord
        });

        const response = await axios.post<{ suggestion: string }>(
            'http://localhost:8000/generate',
            {
                prompt: model.getValue(),
                promptData: {
                    currentLine,
                    cursorPosition: cursorPosition.column,
                    currentWord,
                    wordBeforeCursor,
                    isBeginningOfLine: cursorPosition.column === 1,
                    isImporting: currentLine.includes('import'),
                    isPragma: currentLine.includes('pragma'),
                    isContract: currentLine.includes('contract'),
                    isFunction: currentLine.includes('function'),
                    isEvent: currentLine.includes('event'),
                    isModifier: currentLine.includes('modifier'),
                    isMapping: currentLine.includes('mapping'),
                    isRequire: currentLine.includes('require'),
                    isOpenZeppelin: currentLine.includes('@openzeppelin')
                }
            },
            {
                timeout: 3000
            }
        );

        if (response.data.suggestion) {
            console.log('Received suggestion:', response.data.suggestion);
            setAiSuggestion(response.data.suggestion);
            
            // Get current editor position
            const position = editorRef.current.getPosition();
            console.debug('Current editor position:', position);
            
            // Add ghost text decoration
            const decorations = editorRef.current.createDecorationsCollection([
                {
                    range: new monaco.Range(
                        cursorPosition.lineNumber,
                        cursorPosition.column,
                        cursorPosition.lineNumber,
                        cursorPosition.column + response.data.suggestion.length
                    ),
                    options: {
                        inlineClassName: 'ghost-text',
                        afterContentClassName: 'ghost-text-after',
                        before: {
                          content: response.data.suggestion,
                          inlineClassName: 'ghost-text'
                        },
                        stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                    }
                }
            ]);
            
            console.debug('Added ghost text decoration with ID:', decorations);
            editorRef.current._ghostTextDecorations = decorations;
        } else {
            console.debug('No suggestion received from API');
        }
    } catch (error) {
        console.error('Error fetching suggestion:', error);
        setAiSuggestion('');
    }
  };
  
  const getFileContext = () => {
    if (!editorRef.current) return '';
    
    const editor = editorRef.current;
    const fullContent = editor.getValue();
    
    // Get text around cursor for better context
    const position = editor.getPosition();
    
    if (position) {
      const model = editor.getModel();
      if (model) {
        // Get up to 10 lines before cursor
        const startLine = Math.max(1, position.lineNumber - 10);
        const beforeText = model.getValueInRange({
          startLineNumber: startLine,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });
        
        return `Here's the relevant code around my cursor: ${beforeText}`;
      }
    }
    
    // Fallback to first 500 chars
    return `Here's the file context: ${fullContent.substring(0, 500)}${fullContent.length > 500 ? '...' : ''}`;
  };
  
  const extractCodeFromResponse = (response: string) => {
    // Extract code blocks from markdown response
    const codeBlockRegex = /```(?:\w+)?\s*([\s\S]*?)```/g;
    const matches = [...response.matchAll(codeBlockRegex)];
    
    if (matches.length > 0) {
      return matches[0][1].trim();
    }
    
    // If no code blocks, return the whole response
    return response;
  };
  
  // Insert the suggestion directly into the editor
  const insertSuggestion = (suggestion: string) => {
    if (!editorRef.current || !monacoRef.current || !cursorPosition) return;
    
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const model = editor.getModel();
    
    if (!model) return;
    
    // Insert the suggestion at cursor
    const suggestionId = 'ai-suggestion-' + Date.now();
    
    // Step 1: Insert the suggestion at the cursor position
    editor.executeEdits('ai-suggestion', [{
      range: {
        startLineNumber: cursorPosition.lineNumber,
        startColumn: cursorPosition.column,
        endLineNumber: cursorPosition.lineNumber,
        endColumn: cursorPosition.column
      },
      text: suggestion,
      forceMoveMarkers: true
    }]);
    
    // Step 2: Calculate the range where we inserted the suggestion
    const endPosition = model.getPositionAt(
      model.getOffsetAt(cursorPosition) + suggestion.length
    );
    
    const suggestionRange = new monaco.Range(
      cursorPosition.lineNumber,
      cursorPosition.column,
      endPosition.lineNumber,
      endPosition.column
    );
    
    // Step 3: Add decoration to highlight the suggestion
    // const decorations = editor.deltaDecorations([], [
    //   {
    //     range: suggestionRange,
    //     options: {
    //       inlineClassName: 'ai-suggestion-highlight',
    //       stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
    //       className: 'ai-suggestion-highlight',
    //       isWholeLine: false,
    //       afterContentClassName: 'ai-suggestion-controls'
    //     }
    //   }
    // ]);
    const decorationIds = editor.deltaDecorations([], [
      {
        range: suggestionRange,
        options: {
          inlineClassName: 'ai-suggestion-highlight',
          stickiness: monaco.editor.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges,
          className: 'ai-suggestion-highlight',
          isWholeLine: false,
          afterContentClassName: 'ai-suggestion-controls'
        }
      }
    ]);
    
    editor._aiDecorationIds = decorationIds;    
    
    
    // // Store the decoration ID to remove it later
    // editor._aiDecorationId = decorations[0];
    
    // Step 4: Add inline controls after the suggestion
    const lineAfter = endPosition.lineNumber;
    const columnAfter = endPosition.column;
    
    // Add a content widget for the accept/reject controls
    const controlsWidget = {
      getId: function() {
        return 'ai-suggestion-controls';
      },
      getDomNode: function() {
        const containerEl = document.createElement('span');
        containerEl.className = 'ai-controls-container';
        containerEl.style.cssText = `
          display: inline-flex;
          align-items: center;
          margin-left: 8px;
          vertical-align: middle;
        `;
        
        // Update the part where you define the controls widget in the insertSuggestion function
// Look for the part where you create acceptBtn and rejectBtn and update their onclick handlers

// Store the current values that will be needed for accept/reject
const capturedSuggestion = suggestion;
const capturedCursorPosition = cursorPosition;


// Add these new functions for use with the button click handlers
const acceptSuggestionWithCapture = (editor: any, suggestion: string, position: monaco.Position) => {
  try {
    // Keep the suggestion in the editor
    const currentContent = editor.getValue();
    
    // Move cursor to the end of the suggestion
    const model = editor.getModel();
    if (model && position) {
      const endPosition = model.getPositionAt(
        model.getOffsetAt(position) + suggestion.length
      );
      editor.setPosition(endPosition);
      editor.focus();
    }

    // Clean up UI elements
    if (editor._aiDecorationIds) {
      editor.deltaDecorations(editor._aiDecorationIds, []);
      editor._aiDecorationIds = [];
    }
    
    if (editor._aiControlsWidget) {
      editor.removeContentWidget(editor._aiControlsWidget);
      editor._aiControlsWidget = undefined;
    }
    
    if (editor._aiSuggestionDisposable) {
      editor._aiSuggestionDisposable.dispose();
      editor._aiSuggestionDisposable = undefined;
    }
    
    if (editor._aiStyleElement && editor._aiStyleElement.parentNode) {
      editor._aiStyleElement.parentNode.removeChild(editor._aiStyleElement);
      editor._aiStyleElement = undefined;
    }
    
    // Update React state
    setContent(currentContent);
    setIsDirty(true);
    updateActiveFileContent(currentContent);
    setAiSuggestion(null);
    setCursorPosition(null);
    
  } catch (error) {
    console.error("Error accepting suggestion:", error);
  }
};

const rejectSuggestionWithCapture = (editor: any, suggestion: string, position: monaco.Position) => {
  try {
    const model = editor.getModel();
    if (!model) {
      console.error("Monaco model is missing during rejection.");
      return;
    }

    let editApplied = false;

    // Remove the suggestion text using decoration range if available
    const decorationIds = editor._aiDecorationIds;
    if (decorationIds?.length) {
      const decorationRange = model.getDecorationRange(decorationIds[0]);
      if (decorationRange) {
        editor.executeEdits("reject-suggestion", [
          { range: decorationRange, text: "" },
        ]);
        editApplied = true;
      }
    }

    // Fallback: calculate the range from position and suggestion length
    if (!editApplied && position) {
      const endPosition = model.getPositionAt(
        model.getOffsetAt(position) + suggestion.length
      );
      editor.executeEdits("reject-suggestion", [
        {
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: endPosition.lineNumber,
            endColumn: endPosition.column,
          },
          text: "",
        },
      ]);
    }

    // Update state with content after rejection
    const newContent = editor.getValue();
    
    // Restore cursor to original position
    if (position) {
      editor.setPosition(position);
      editor.focus();
    }

    // Clean up UI elements
    if (editor._aiDecorationIds) {
      editor.deltaDecorations(editor._aiDecorationIds, []);
      editor._aiDecorationIds = [];
    }
    
    if (editor._aiControlsWidget) {
      editor.removeContentWidget(editor._aiControlsWidget);
      editor._aiControlsWidget = undefined;
    }
    
    if (editor._aiSuggestionDisposable) {
      editor._aiSuggestionDisposable.dispose();
      editor._aiSuggestionDisposable = undefined;
    }
    
    if (editor._aiStyleElement && editor._aiStyleElement.parentNode) {
      editor._aiStyleElement.parentNode.removeChild(editor._aiStyleElement);
      editor._aiStyleElement = undefined;
    }
    
    // Update React state
    setContent(newContent);
    setIsDirty(true);
    updateActiveFileContent(newContent);
    setAiSuggestion(null);
    setCursorPosition(null);
    
  } catch (error) {
    console.error("Error rejecting suggestion:", error);
  }
};

// Use the existing capturedCursorPosition or rename if necessary
const capturedCursorPositionCopy = { ...cursorPosition }; // Clone to ensure we keep a stable copy

// Accept button
const acceptBtn = document.createElement('button');
acceptBtn.textContent = 'Accept';
acceptBtn.className = 'ghost-text-accept-btn';
acceptBtn.onclick = (e) => handleAcceptSuggestion(e as unknown as React.MouseEvent<HTMLButtonElement>);

// Reject button
const rejectBtn = document.createElement('button');
rejectBtn.textContent = 'Reject';
rejectBtn.className = 'ghost-text-reject-btn';
rejectBtn.onclick = (e) => handleRejectSuggestion(e as unknown as React.MouseEvent<HTMLButtonElement>);
        
        containerEl.appendChild(acceptBtn);
        containerEl.appendChild(rejectBtn);
        return containerEl;
      },
      getPosition: function() {
        return {
          position: endPosition,
          preference: [monaco.editor.ContentWidgetPositionPreference.AFTER]
        };
      }
    };
    
    // Add the widget to the editor
    editor.addContentWidget(controlsWidget);
    editor._aiControlsWidget = controlsWidget;
    
    // Add keyboard handlers for Tab and Esc
    const disposable = editor.onKeyDown((e: monaco.IKeyboardEvent) => {
      if (e.keyCode === monaco.KeyCode.Tab && aiSuggestion) {
        // Tab key - accept suggestion
        e.preventDefault();
        e.stopPropagation();
        acceptSuggestion();
      } else if (e.keyCode === monaco.KeyCode.Escape && aiSuggestion) {
        // Esc key - reject suggestion
        e.preventDefault();
        e.stopPropagation();
        rejectSuggestion();
      }
    });
    
    // Store disposable to clean up later
    editor._aiSuggestionDisposable = disposable;
    
    // Add some CSS for the highlight
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      .ai-suggestion-highlight {
        background-color: rgba(86, 182, 255, 0.1);
        border-bottom: 1px dashed #56b6ff;
      }
    `;
    document.head.appendChild(styleEl);
    editor._aiStyleElement = styleEl;
  };
  
  const acceptSuggestion = () => {
    if (!editorRef.current || !aiSuggestion) {
      console.warn("Cannot accept suggestion: Missing editor or suggestion.");
      return;
    }
  
    try {
      const editor = editorRef.current;
      const currentContent = editor.getValue();
      
      setContent(currentContent);
      setIsDirty(true);
      updateActiveFileContent(currentContent);
  
      if (cursorPosition) {
        const model = editor.getModel();
        if (model) {
          const endPosition = model.getPositionAt(
            model.getOffsetAt(cursorPosition) + aiSuggestion.length
          );
          editor.setPosition(endPosition);
          editor.focus();
          console.log("Cursor moved to end of accepted suggestion at:", endPosition);
        }
      }
  
      console.log("Suggestion accepted. Cleaning up UI.");
      cleanupSuggestionUI();
    } catch (error) {
      console.error("Error accepting suggestion:", error);
    }
  };
  
  
  const rejectSuggestion = () => {
    if (!editorRef.current || !aiSuggestion || !cursorPosition) {
      console.warn("Cannot reject suggestion: Missing editor, suggestion, or cursor position.");
      return;
    }
  
    try {
      const editor = editorRef.current;
      const model = editor.getModel();
      if (!model) {
        console.error("Monaco model is missing during rejection.");
        return;
      }
  
      let editApplied = false;
  
      const decorationIds = editor._aiDecorationIds;
      if (decorationIds?.length) {
        const decorationRange = model.getDecorationRange(decorationIds[0]);
        if (decorationRange) {
          editor.executeEdits("reject-suggestion", [
            { range: decorationRange, text: "" },
          ]);
          console.log("Suggestion rejected using decoration range:", decorationRange);
          editApplied = true;
        }
      }
  
      if (!editApplied) {
        const endPosition = model.getPositionAt(
          model.getOffsetAt(cursorPosition) + aiSuggestion.length
        );
        editor.executeEdits("reject-suggestion", [
          {
            range: {
              startLineNumber: cursorPosition.lineNumber,
              startColumn: cursorPosition.column,
              endLineNumber: endPosition.lineNumber,
              endColumn: endPosition.column,
            },
            text: "",
          },
        ]);
        console.log("Suggestion rejected using fallback position range.");
      }
  
      const newContent = editor.getValue();
      setContent(newContent);
      setIsDirty(true);
      updateActiveFileContent(newContent);
  
      editor.setPosition(cursorPosition);
      editor.focus();
  
      console.log("Editor updated and focused back after rejecting suggestion.");
      cleanupSuggestionUI();
    } catch (error) {
      console.error("Error rejecting suggestion:", error);
    }
  };
  
  const cleanupSuggestionUI = () => {
    try {
      if (!editorRef.current) {
        console.debug("Editor reference not available for cleanup.");
        return false;
      }
  
      const editor = editorRef.current;
      const cleanupOperations = {
        decorations: false,
        widget: false,
        listener: false,
        style: false,
        state: false
      };
  
      if (Array.isArray(editor._aiDecorationIds) && editor._aiDecorationIds.length) {
        editor.deltaDecorations(editor._aiDecorationIds, []);
        editor._aiDecorationIds = [];
        cleanupOperations.decorations = true;
        console.log("AI decorations removed.");
      }
  
      if (editor._aiControlsWidget) {
        editor.removeContentWidget(editor._aiControlsWidget);
        editor._aiControlsWidget = undefined;
        cleanupOperations.widget = true;
        console.log("AI control widget removed.");
      }
  
      if (editor._aiSuggestionDisposable) {
        editor._aiSuggestionDisposable.dispose();
        editor._aiSuggestionDisposable = undefined;
        cleanupOperations.listener = true;
        console.log("AI suggestion listener disposed.");
      }
  
      if (editor._aiStyleElement && editor._aiStyleElement.parentNode) {
        editor._aiStyleElement.parentNode.removeChild(editor._aiStyleElement);
        editor._aiStyleElement = undefined;
        cleanupOperations.style = true;
        console.log("AI style element removed.");
      }
  
      setAiSuggestion(null);
      setCursorPosition(null);
      cleanupOperations.state = true;
      console.log("AI state reset (suggestion & cursor).");
  
      editor._lastCleanupReason = "manual";
  
      console.debug("Copilot suggestion UI cleanup complete:", cleanupOperations);
      return true;
    } catch (error) {
      console.error("Error during copilot suggestion cleanup:", error);
  
      try {
        if (editorRef.current) {
          setAiSuggestion(null);
          setCursorPosition(null);
          console.warn("Emergency fallback: AI state forcibly cleared.");
        }
      } catch (recoveryError) {
        console.error("Failed recovery attempt during cleanup:", recoveryError);
      }
  
      return false;
    }
  };
  
  
  // Capture editor instance on mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Configure Solidity language
    configureSolidityLanguage(monaco);

    // Register completion provider
    monaco.languages.registerCompletionItemProvider('solidity', {
      triggerCharacters: ['.', ':', '(', '{', '=', '\n', '@', ';', ',', '+', '-', '*', '/', '&', '|', '!', '?', '<', '>', ' '],
      async provideCompletionItems(model: any, position: any) {
        try {
          const lineContent = model.getLineContent(position.lineNumber);
          const wordUntilPosition = model.getWordUntilPosition(position);
          
          console.debug('Triggering completion at position:', position);
          console.debug('Current line content:', lineContent);
          
          const requestData = {
            prompt: model.getValue(),
            promptData: {
              currentLine: lineContent,
              cursorPosition: position.column,
              currentWord: wordUntilPosition.word,
              wordBeforeCursor: lineContent.substring(0, position.column),
              isBeginningOfLine: position.column === 1,
              isImporting: lineContent.includes('import'),
              isPragma: lineContent.includes('pragma'),
              isContract: model.getValue().includes('contract'),
              isFunction: lineContent.includes('function'),
              isEvent: lineContent.includes('event'),
              isModifier: lineContent.includes('modifier'),
              isMapping: lineContent.includes('mapping'),
              isRequire: lineContent.includes('require'),
              isOpenZeppelin: lineContent.includes('@openzeppelin')
            }
          };

          console.debug('Sending request with data:', requestData);
          
          const response = await axios.post('http://localhost:8000/generate', requestData);
          
          console.debug('Received response:', response.data);
          
          if (response.data.suggestion) {
            const range = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: wordUntilPosition.startColumn,
              endColumn: wordUntilPosition.endColumn
            };

            // Create a more detailed suggestion with proper formatting
            const suggestion = response.data.suggestion;
            const isMultiLine = suggestion.includes('\n');
            
            // Determine the kind of suggestion based on content
            let kind = monaco.languages.CompletionItemKind.Text;
            if (suggestion.includes('function')) {
              kind = monaco.languages.CompletionItemKind.Function;
            } else if (suggestion.includes('contract')) {
              kind = monaco.languages.CompletionItemKind.Class;
            } else if (suggestion.includes('event')) {
              kind = monaco.languages.CompletionItemKind.Event;
            } else if (suggestion.includes('mapping')) {
              kind = monaco.languages.CompletionItemKind.Variable;
            } else if (suggestion.includes('import')) {
              kind = monaco.languages.CompletionItemKind.Module;
            } else if (suggestion.includes('pragma')) {
              kind = monaco.languages.CompletionItemKind.Keyword;
            }
            
            return {
              suggestions: [{
                label: isMultiLine ? suggestion.split('\n')[0] + '...' : suggestion,
                kind: kind,
                insertText: suggestion,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                range: range,
                detail: 'AI Suggestion',
                documentation: {
                  value: [
                    '```solidity',
                    suggestion,
                    '```',
                    '',
                    'Press Tab to accept this suggestion'
                  ].join('\n')
                },
                sortText: '0',
                preselect: true,
                command: {
                  id: 'editor.action.triggerSuggest',
                  title: 'Show more suggestions'
                }
              }]
            };
          }
          
          return { suggestions: [] };
        } catch (error) {
          console.error('Error in completion provider:', error);
          return { suggestions: [] };
        }
      }
    });

    // Add keyboard shortcut for AI prompt (Ctrl+I)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI,
      handleShowPromptInput
    );

    // Add keyboard shortcut for suggestion box (Ctrl+Shift+S)
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS,
      () => setShowSuggestionBox(true)
    );
    
    // Configure editor options for suggestions
    editor.updateOptions({
      suggest: {
        preview: true,
        showInlineDetails: true,
        showMethods: true,
        showFunctions: true,
        showConstructors: true,
        showFields: true,
        showVariables: true,
        showClasses: true,
        showStructs: true,
        showInterfaces: true,
        showModules: true,
        showProperties: true,
        showEvents: true,
        showOperators: true,
        showUnits: true,
        showValues: true,
        showConstants: true,
        showEnums: true,
        showEnumMembers: true,
        showKeywords: true,
        showWords: true,
        showColors: true,
        showFiles: true,
        showReferences: true,
        showFolders: true,
        showTypeParameters: true,
        showSnippets: true,
        maxVisibleSuggestions: 12,
        filterGraceful: true,
        localityBonus: true,
        shareSuggestSelections: true,
        showIcons: true,
        showStatusBar: true,
        previewMode: 'prefix',
        insertMode: 'insert',
        selectionMode: 'whenQuickSuggestion'
      },
      quickSuggestions: {
        other: true,
        comments: true,
        strings: true
      },
      acceptSuggestionOnEnter: 'on',
      tabCompletion: 'on',
      wordBasedSuggestions: 'matchingDocuments',
      parameterHints: {
        enabled: true
      }
    });

    // Add ghost text provider
    editor.onDidChangeModelContent(() => {
      if (ghostTextTimeoutRef.current) {
        clearTimeout(ghostTextTimeoutRef.current);
      }

      const position = editor.getPosition();
      const model = editor.getModel();
      const word = model?.getWordUntilPosition(position);
      const lineContent = model?.getLineContent(position.lineNumber);
      const beforeCursor = lineContent?.substring(0, position.column - 1);

      // Check if we should trigger AI completion
      if (word && beforeCursor && (beforeCursor.endsWith(' ') || /[\w\d]$/.test(beforeCursor))) {
        setIsLoadingGhostText(true);
        abortControllerRef.current = new AbortController();

        ghostTextTimeoutRef.current = setTimeout(async () => {
          try {
            const requestData = {
              prompt: model?.getValue() || '',
              promptData: {
                currentLine: lineContent || '',
                cursorPosition: position.column,
                currentWord: word?.word || '',
                wordBeforeCursor: beforeCursor || '',
                isBeginningOfLine: position.column === 1,
                isImporting: /import\s+/.test(beforeCursor || ''),
                isPragma: /pragma\s+/.test(beforeCursor || ''),
                isContract: /contract\s+\w+\s*{/.test(model?.getValue() || ''),
                isFunction: /function\s+\w+\s*\(/.test(beforeCursor || ''),
                isEvent: /event\s+\w+\s*\(/.test(beforeCursor || ''),
                isModifier: /modifier\s+\w+\s*\(/.test(beforeCursor || ''),
                isMapping: /mapping\s*\(/.test(beforeCursor || ''),
                isRequire: /require\s*\(/.test(beforeCursor || ''),
                isOpenZeppelin: /@openzeppelin/.test(beforeCursor || '')
              }
            };

            // Fix for linter error: Check if abortControllerRef.current is not null
            if (abortControllerRef.current) {
              const response = await axios.post('http://localhost:8000/generate', requestData, {
                signal: abortControllerRef.current.signal,
                timeout: 3000
              });

              if (response.data.suggestion) {
                setGhostText(response.data.suggestion);
                
                // Add ghost text decoration with improved styling
                const decorations = editor.deltaDecorations([], [{
                  range: new monaco.Range(
                    position.lineNumber,
                    position.column,
                    position.lineNumber,
                    position.column + response.data.suggestion.length
                  ),
                  options: {
                    inlineClassName: 'ghost-text',
                    afterContentClassName: 'ghost-text-after',
                    before: {
                      content: response.data.suggestion,
                      inlineClassName: 'ghost-text'
                    },
                    stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges
                  }
                }]);
                
                editor._ghostTextDecorations = decorations;
              }
            }
          } catch (error: unknown) {
            // Fix for linter error: Type check for error
            if (error instanceof Error && error.name !== 'AbortError' && error.name !== 'CanceledError') {
              console.error('Error fetching ghost text:', error);
            }
          } finally {
            setIsLoadingGhostText(false);
            if (abortControllerRef.current) {
              abortControllerRef.current = null;
            }
          }
        }, 300);
      } else {
        setGhostText(null);
        if (editor._ghostTextDecorations) {
          editor.deltaDecorations(editor._ghostTextDecorations, []);
          editor._ghostTextDecorations = [];
        }
      }
    });

    // Handle Tab key for ghost text
    editor.onKeyDown((e: monaco.IKeyboardEvent) => {
      if (e.keyCode === monaco.KeyCode.Tab && ghostText) {
        e.preventDefault();
        const position = editor.getPosition();
        const model = editor.getModel();
        if (model && position) {
          const word = model.getWordUntilPosition(position);
          const range = new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          );
          model.pushEditOperations(
            [],
            [{ range, text: ghostText }],
            () => null
          );
          setGhostText(null);
          if (editor._ghostTextDecorations) {
            editor.deltaDecorations(editor._ghostTextDecorations, []);
            editor._ghostTextDecorations = [];
          }
        }
      }
    });
  };

  // When the editor changes, update local state and context
  const handleEditorChange = (value: string | undefined) => {
    const newValue = value || "";
    setContent(newValue);
    setIsDirty(true);
    updateActiveFileContent(newValue);
  };

  // Handle Ctrl + S save
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!isSaving && isDirty) {
          handleSave();
        }
      }
    };
    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isDirty, isSaving]);

  const getLanguage = (fileName: string) => {
    const ext = fileName?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case "js":
        return "javascript";
      case "ts":
        return "typescript";
      case "jsx":
        return "javascript";
      case "tsx":
        return "typescript";
      case "json":
        return "json";
      case "md":
        return "markdown";
      case "sol":
        return "solidity";
      default:
        return "plaintext";
    }
  };

  // Add Solidity language configuration
  const configureSolidityLanguage = (monaco: any) => {
    // Register Solidity language
    monaco.languages.register({ id: 'solidity' });

    // Define Solidity syntax highlighting rules
    monaco.languages.setMonarchTokensProvider('solidity', {
      defaultToken: '',
      tokenizer: {
        root: [
          // Keywords
          [/[a-zA-Z_$][\w$]*/, {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier'
            }
          }],
          // Whitespace
          { include: '@whitespace' },
          // Delimiters and operators
          [/[{}()\[\]]/, '@brackets'],
          [/[<>](?!@symbols)/, '@brackets'],
          [/@symbols/, {
            cases: {
              '@operators': 'operator',
              '@default': ''
            }
          }],
          // Numbers
          [/\d*\.\d+([eE][\-+]?\d+)?/, 'number.float'],
          [/0[xX][0-9a-fA-F]+/, 'number.hex'],
          [/\d+/, 'number'],
          // Strings
          [/"([^"\\]|\\.)*$/, 'string.invalid'],
          [/'([^'\\]|\\.)*$/, 'string.invalid'],
          [/"/, 'string', '@string_double'],
          [/'/, 'string', '@string_single'],
          // Comments
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment']
        ],
        whitespace: [
          [/[ \t\r\n]+/, ''],
          [/\/\*/, 'comment', '@comment'],
          [/\/\/.*$/, 'comment']
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment']
        ],
        string_double: [
          [/[^\\"]+/, 'string'],
          [/\\./, 'string.escape'],
          [/"/, 'string', '@pop']
        ],
        string_single: [
          [/[^\\']+/, 'string'],
          [/\\./, 'string.escape'],
          [/'/, 'string', '@pop']
        ]
      },
      keywords: [
        'abstract', 'after', 'anonymous', 'as', 'assembly', 'auto', 'before',
        'break', 'calldata', 'case', 'catch', 'constant', 'continue', 'contract',
        'copyof', 'default', 'delete', 'do', 'else', 'emit', 'enum', 'event',
        'external', 'false', 'final', 'for', 'function', 'hex', 'if', 'immutable',
        'import', 'indexed', 'interface', 'internal', 'is', 'library', 'mapping',
        'memory', 'modifier', 'new', 'null', 'of', 'override', 'payable', 'pragma',
        'private', 'public', 'pure', 'return', 'returns', 'storage', 'string',
        'struct', 'super', 'support', 'switch', 'this', 'throw', 'true', 'try',
        'type', 'typeof', 'unchecked', 'using', 'var', 'view', 'virtual', 'while'
      ],
      operators: [
        '=', '>', '<', '!', '~', '?', ':', '==', '<=', '>=', '!=',
        '&&', '||', '++', '--', '+', '-', '*', '/', '&', '|', '^', '%',
        '<<', '>>', '>>>', '+=', '-=', '*=', '/=', '&=', '|=', '^=',
        '%=', '<<=', '>>=', '>>>='
      ],
      symbols: /[=><!~?:&|+\-*\/\^%]+/
    });

    // Register Solidity completion provider
    monaco.languages.registerCompletionItemProvider('solidity', {
      triggerCharacters: ['.', ':', '(', '{', '=', '\n', '@', ';', ',', '+', '-', '*', '/', '&', '|', '!', '?', '<', '>'],
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        // Static completions
        const suggestions = [
          ...solidityKeywords.map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range
          })),
          ...solidityTypes.map(type => ({
            label: type,
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            insertText: type,
            range
          })),
          ...soliditySnippets.map(snippet => ({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snippet.insertText,
            documentation: snippet.documentation,
            range
          }))
        ];

        return { suggestions };
      }
    });
  };

  // Add CSS for ghost text and suggestions
  const style = document.createElement('style');
  style.textContent = `
    .monaco-editor .suggest-widget {
      background-color: #2d2d2d !important;
      border: 1px solid #454545 !important;
      box-shadow: 0 2px 8px rgba(0,0,0,0.24) !important;
      border-radius: 3px !important;
      margin-left: -1px !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list {
      background-color: #2d2d2d !important;
      color: #d4d4d4 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row {
      padding: 0 8px !important;
      line-height: 24px !important;
      min-height: 24px !important;
      font-size: 13px !important;
      font-family: 'Consolas', 'Monaco', monospace !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused {
      background-color: #094771 !important;
      color: #ffffff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row:hover {
      background-color: #094771 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .icon {
      margin-right: 8px !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .contents {
      padding: 0 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .details {
      display: none !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused .details {
      display: block !important;
      color: #d4d4d4 !important;
      font-size: 12px !important;
      padding: 2px 0 !important;
      opacity: 0.8 !important;
    }
    
    .monaco-editor .ghost-text {
      color: #858585 !important;
      opacity: 0.8 !important;
      font-style: italic !important;
      font-family: 'Consolas', 'Monaco', monospace !important;
      font-size: inherit !important;
      background: transparent !important;
      border: none !important;
      pointer-events: none !important;
    }
    
    .monaco-editor .ghost-text-decoration {
      color: #858585 !important;
      opacity: 0.8 !important;
      font-style: italic !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon {
      background-image: none !important;
      display: inline-block !important;
      height: 16px !important;
      width: 16px !important;
      min-width: 16px !important;
      margin-right: 4px !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon::before {
      font-family: codicon !important;
      font-size: 16px !important;
      line-height: 16px !important;
      color: #d4d4d4 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Function::before {
      content: "\\ea8c" !important;
      color: #b180d7 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Variable::before {
      content: "\\ea88" !important;
      color: #75beff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Keyword::before {
      content: "\\ea83" !important;
      color: #ff8080 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Constructor::before {
      content: "\\ea8f" !important;
      color: #b180d7 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Field::before {
      content: "\\ea8e" !important;
      color: #75beff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Interface::before {
      content: "\\ea89" !important;
      color: #75beff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Module::before {
      content: "\\ea8b" !important;
      color: #75beff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Property::before {
      content: "\\ea8a" !important;
      color: #75beff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Event::before {
      content: "\\ea86" !important;
      color: #ff8080 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Enum::before {
      content: "\\ea85" !important;
      color: #75beff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .suggest-icon.Constant::before {
      content: "\\ea84" !important;
      color: #4fc1ff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .monaco-icon-label {
      color: #d4d4d4 !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row.focused .monaco-icon-label {
      color: #ffffff !important;
    }
    
    .monaco-editor .suggest-widget .monaco-list .monaco-list-row .monaco-icon-label-description {
      opacity: 0.7 !important;
    }
  `;
  document.head.appendChild(style);

  const handleAcceptSuggestion = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (editorRef.current && capturedSuggestion && capturedCursorPosition) {
      const position = new monaco.Position(
        capturedCursorPosition.lineNumber,
        capturedCursorPosition.column
      );
      editorRef.current.executeEdits('', [{
        range: new monaco.Range(
          position.lineNumber,
          position.column,
          position.lineNumber,
          position.column
        ),
        text: capturedSuggestion
      }]);
      setCapturedSuggestion(null);
      setCapturedCursorPosition(null);
    }
  };

  const handleRejectSuggestion = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (editorRef.current && capturedSuggestion && capturedCursorPosition) {
      setCapturedSuggestion(null);
      setCapturedCursorPosition(null);
    }
  };

  return (
    <div className="relative w-full h-full">
      <Editor
        height="100%"
        defaultLanguage="solidity"
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-light"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          readOnly: false,
          theme: 'vs-light',
          automaticLayout: true,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
          glyphMargin: true,
          folding: true,
          renderLineHighlight: 'all',
          scrollbar: {
            vertical: 'visible',
            horizontal: 'visible',
            handleMouseWheel: true
          },
          // Solidity-specific settings
          suggestOnTriggerCharacters: true,
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true
          },
          acceptSuggestionOnEnter: 'on',
          tabCompletion: 'on',
          wordBasedSuggestions: 'matchingDocuments',
          parameterHints: {
            enabled: true
          }
        }}
      />
      
      <SuggestionBox
        isOpen={showSuggestionBox}
        onClose={() => setShowSuggestionBox(false)}
        onSuggestionReceived={(suggestion) => {
          if (editorRef.current) {
            const position = editorRef.current.getPosition();
            const model = editorRef.current.getModel();
            if (model && position) {
              model.pushEditOperations(
                [],
                [{ range: new monaco.Range(
                  position.lineNumber,
                  position.column,
                  position.lineNumber,
                  position.column
                ), text: suggestion }],
                () => null
              );
            }
          }
        }}
        code={content || ''}
        cursorPosition={editorRef.current?.getPosition() || { lineNumber: 1, column: 1 }}
        context={{
          isContract: /contract\s+\w+\s*{/.test(content || ''),
          isFunction: /function\s+\w+\s*\(/.test(content || '')
        }}
      />
    </div>
  );
};

export default MonacoEditor;