export type AiProviderType = 
  | 'native-bridge' 
  | 'chrome-built-in' 
  | 'local-endpoint' 
  | 'server-fallback' 
  | 'offline-fallback';

export interface AiConnectionStatus {
  provider: AiProviderType;
  statusText: string;
  isAvailable: boolean;
  details?: string;
}

export interface AiPromptOptions {
  temperature?: number;
  maxTokens?: number;
}
