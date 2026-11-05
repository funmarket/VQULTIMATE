import { AiProviderType, AiConnectionStatus } from './aiTypes';
import { chromeBuiltInAiProvider } from './chromeBuiltInAiProvider';
import { localEndpointAiProvider } from './localEndpointAiProvider';
import { serverAiProvider } from './serverAiProvider';

export const deviceAiService = {
  detectAvailableProvider: async (config: {
    enabled: boolean;
    endpoint: string;
  }): Promise<AiConnectionStatus> => {
    // 1. Native bridge check
    const win = typeof window !== 'undefined' ? (window as any) : null;
    if (win && win.VibeQuestNativeBridge?.ai) {
      return {
        provider: 'native-bridge',
        statusText: 'Using Native Device AI',
        isAvailable: true,
        details: 'Native application AI interface connected'
      };
    }

    // 2. Local endpoint check (if enabled and configured)
    if (config.enabled && config.endpoint) {
      const test = await localEndpointAiProvider.testConnection(config.endpoint);
      if (test.success) {
        return {
          provider: 'local-endpoint',
          statusText: 'Linked Node',
          isAvailable: true,
          details: test.message
        };
      } else {
        return {
          provider: 'local-endpoint',
          statusText: 'Endpoint Failed',
          isAvailable: false,
          details: test.message
        };
      }
    }

    // 3. Chrome built-in AI check
    const hasChromeBuiltIn = await chromeBuiltInAiProvider.isSupported();
    if (hasChromeBuiltIn) {
      return {
        provider: 'chrome-built-in',
        statusText: 'Browser AI Available',
        isAvailable: true,
        details: 'Chrome Gemini Nano (Prompt API) ready'
      };
    }

    // 4. Server AI check
    const hasServerAi = await serverAiProvider.isSupported();
    if (hasServerAi) {
      return {
        provider: 'server-fallback',
        statusText: 'Server Fallback',
        isAvailable: true,
        details: 'Cloud API models ready'
      };
    }

    // 5. Offline fallback
    return {
      provider: 'offline-fallback',
      statusText: 'Unavailable',
      isAvailable: false,
      details: 'No supported device or server provider detected'
    };
  },

};
