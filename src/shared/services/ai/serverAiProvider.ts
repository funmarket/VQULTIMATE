export const serverAiProvider = {
  isSupported: async (): Promise<boolean> => {
    try {
      const res = await fetch('/api/ai/health');
      if (res.ok) {
        const data = await res.json();
        return !!data.supported;
      }
    } catch {
      return false;
    }
    return false;
  },

  generateText: async (prompt: string, context?: any): Promise<string> => {
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, context })
      });
      if (!res.ok) {
        throw new Error(`Server AI returned error code: ${res.status}`);
      }
      const data = await res.json();
      return data.text || '';
    } catch (err) {
      console.error('Server AI request failed:', err);
      throw err;
    }
  }
};
