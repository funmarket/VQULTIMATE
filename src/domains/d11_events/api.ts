import { FlashEvent, SuggestionCategory } from './types';

export async function fetchActiveFlashEvent(): Promise<FlashEvent | null> {
  return null;
}

export async function fetchFlashEvents(): Promise<FlashEvent[]> {
  return [];
}

export async function createFlashEvent(_params: {
  title: string;
  description: string;
  place_id?: string | null;
  starts_at: string;
  ends_at: string;
  kind?: string;
  created_by?: string;
}): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: 'Flash Event creation is unavailable: the D11 Events backend is not provisioned. No event was created.'
  };
}

export async function submitVibeSuggestion(_params: {
  title: string;
  description: string;
  category: SuggestionCategory;
}): Promise<{ success: boolean; error?: string }> {
  return {
    success: false,
    error: 'Vibe suggestion submissions are currently unavailable or require review backend provisioning.'
  };
}
