import { useState, useEffect, useCallback } from 'react';
import { profileStorage } from '../services/profileStorage';
import { LocalDeviceAiSettings } from '../types/profileTypes';
import { deviceAiService } from '../../../shared/services/ai/deviceAiService';
import { localEndpointAiProvider } from '../../../shared/services/ai/localEndpointAiProvider';
import { AiConnectionStatus } from '../../../shared/services/ai/aiTypes';

export function useLocalDeviceAiSettings() {
  const [settings, setSettingsState] = useState<LocalDeviceAiSettings>(() => 
    profileStorage.getLocalAiSettings()
  );

  const [aiStatus, setAiStatus] = useState<AiConnectionStatus>({
    provider: 'offline-fallback',
    statusText: 'Unavailable',
    isAvailable: false,
    details: 'Checking actual provider availability...'
  });

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const refreshAiStatus = useCallback(async (currentSettings: LocalDeviceAiSettings) => {
    const status = await deviceAiService.detectAvailableProvider({
      enabled: currentSettings.enabled,
      endpoint: currentSettings.endpoint
    });
    setAiStatus(status);
  }, []);

  // Update AI status whenever settings load or toggle state changes
  useEffect(() => {
    refreshAiStatus(settings);
  }, [settings.enabled, settings.endpoint, refreshAiStatus]);

  const updateSettings = useCallback((updates: Partial<LocalDeviceAiSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...updates };
      profileStorage.setLocalAiSettings(next);
      return next;
    });
    setTestResult(null); // Clear previous tests on change
  }, []);

  const testEndpointConnection = useCallback(async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await localEndpointAiProvider.testConnection(settings.endpoint);
      setTestResult(result);
      
      // Force refreshing the connection status based on current settings
      await refreshAiStatus(settings);
      return result;
    } catch (err: any) {
      const errRes = { success: false, message: err.message || 'Unknown testing error occurred' };
      setTestResult(errRes);
      return errRes;
    } finally {
      setIsTesting(false);
    }
  }, [settings, refreshAiStatus]);

  return {
    settings,
    aiStatus,
    isTesting,
    testResult,
    updateSettings,
    testEndpointConnection,
    refreshAiStatus: () => refreshAiStatus(settings)
  };
}
