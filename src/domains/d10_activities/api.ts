import { FlashEvent, ActivityFeedItem } from './types';

export const INITIAL_FLASH_EVENT: FlashEvent = {
  id: 'flash-1',
  title: '⚡ FLASH EVENT: Midnight Neon Drift at Dubai Creek',
  location: 'Dubai Creek Heritage Node',
  vq_reward: 500,
  duration_mins: 14,
  active: true
};

export const INITIAL_ACTIVITIES: ActivityFeedItem[] = [
  { id: 'act-1', user_name: 'Tariq Al-Mansoori', action: 'checked in at', target: 'Al Fahidi Spice Souk', time_ago: '2m ago', vq_earned: 150 },
  { id: 'act-2', user_name: 'Layla Chen', action: 'completed trail', target: 'Neon Marina Cyber Art Walk', time_ago: '8m ago', vq_earned: 350 },
  { id: 'act-3', user_name: 'Zainab Nuru', action: 'established confirmed Vibe with', target: '@tariq_guardian', time_ago: '15m ago', vq_earned: 200 }
];

export async function fetchFlashEvent(): Promise<FlashEvent> {
  return INITIAL_FLASH_EVENT;
}

export async function fetchActivities(): Promise<ActivityFeedItem[]> {
  return INITIAL_ACTIVITIES;
}
