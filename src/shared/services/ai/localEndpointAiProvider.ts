export const localEndpointAiProvider = {
  testConnection: async (endpoint: string): Promise<{ success: boolean; message: string }> => {
    if (!endpoint) {
      return { success: false, message: 'Endpoint URL is empty' };
    }

    // Guard against mixed content issues on secure context
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && endpoint.startsWith('http://') && !endpoint.includes('localhost') && !endpoint.includes('127.0.0.1')) {
      return { 
        success: false, 
        message: 'Mixed content block: Cannot request insecure HTTP from HTTPS. Use HTTPS, localhost, or configure a proxy.' 
      };
    }

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for fast UI feedback

      // Test general availability (Ollama returns "Ollama is running" at root)
      const res = await fetch(endpoint, {
        method: 'GET',
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(id);

      if (res.ok) {
        return { success: true, message: 'Successfully connected!' };
      }
      
      // Try hitting /api/tags (Ollama's model catalog endpoint)
      const tagsController = new AbortController();
      const tagsId = setTimeout(() => tagsController.abort(), 3500);
      const tagsRes = await fetch(`${endpoint.replace(/\/$/, '')}/api/tags`, {
        method: 'GET',
        signal: tagsController.signal,
        mode: 'cors'
      });
      clearTimeout(tagsId);

      if (tagsRes.ok) {
        return { success: true, message: 'Successfully connected (API verified)!' };
      }

      return { success: false, message: `Server returned status ${res.status}` };
    } catch (err: any) {
      console.warn('Ollama test connection error:', err);
      if (err.name === 'AbortError') {
        return { success: false, message: 'Connection timed out. Check network or server status.' };
      }
      return { success: false, message: 'Could not connect. Ensure CORS is enabled on Ollama (OLLAMA_ORIGINS="*").' };
    }
  },

  generateText: async (endpoint: string, prompt: string, options?: { model?: string }): Promise<string> => {
    const modelName = options?.model || 'llama3';
    const baseUrl = endpoint.replace(/\/$/, '');

    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 15000); // 15s timeout for inference

      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: prompt,
          stream: false
        }),
        signal: controller.signal,
        mode: 'cors'
      });
      clearTimeout(id);

      if (!res.ok) {
        throw new Error(`Local model failed with status ${res.status}`);
      }

      const data = await res.json();
      return data.response || '';
    } catch (err: any) {
      console.error('Ollama generation failed:', err);
      throw err;
    }
  }
};
