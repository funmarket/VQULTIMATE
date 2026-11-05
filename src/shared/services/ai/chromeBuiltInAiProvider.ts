export const chromeBuiltInAiProvider = {
  isSupported: async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    
    try {
      const win = window as any;
      const ai = win.ai || (typeof self !== 'undefined' ? (self as any).ai : null);
      if (!ai) return false;

      // Chrome Prompt API detection
      if (ai.languageModel || ai.assistant) {
        const model = ai.languageModel || ai.assistant;
        const capabilities = await model.capabilities();
        return capabilities.available !== 'no';
      }
    } catch {
      return false;
    }
    return false;
  },

  generateText: async (prompt: string): Promise<string> => {
    const win = window as any;
    const ai = win.ai || (typeof self !== 'undefined' ? (self as any).ai : null);
    if (!ai) throw new Error('Chrome Built-in AI is not supported on this browser');

    const model = ai.languageModel || ai.assistant;
    const session = await model.create();
    try {
      const response = await session.prompt(prompt);
      return response;
    } finally {
      if (session.destroy) session.destroy();
    }
  }
};
