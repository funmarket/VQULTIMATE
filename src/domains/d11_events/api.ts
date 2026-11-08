import { FlashEvent } from './types';

/**
 * D11 Flash Events are distinct from D18's sixty-second vibe_flash_windows.
 * Neither the old flash_events table nor get_active_flash_event RPC exists
 * in the verified Supabase schema. Do not call missing endpoints or fabricate
 * a live event. Keep this fail-closed until a reviewed D11 backend is installed.
 */
export async function fetchActiveFlashEvent(): Promise<FlashEvent | null> {
  return null;
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
