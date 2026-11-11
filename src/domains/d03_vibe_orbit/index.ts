export * from './types';
export * from './api';
export * from './searchHistory';
export * from './matchEngine';
export * from './promotions';
export * from './validations';
export * from './gamification';
export {
  MAX_PRESENCE_METERS,
  calculateHaversineMeters,
  acquireHighAccuracyPosition,
  checkPlaceProximity,
  hasUserScannedReceiptRecently,
  recordReceiptScanCooldown,
  computeExplorationTier,
  computeCategoryBadges,
  getUserExplorationStatus,
  fetchUserProfileCheckinStats,
  recordUserProfileCheckin,
  processLiveCheckReceiptVerification,
} from './presenceVerifier';
export type {
  PresenceCheckResult,
  LiveCheckReceiptResult,
  UserExplorationStatus,
} from './presenceVerifier';
