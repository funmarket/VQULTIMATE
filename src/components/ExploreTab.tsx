import React, { useEffect, useRef, useState } from 'react';
import {
  Compass, Maximize2, Minimize2, Sparkles, Navigation, Flame,
  MapPin, Shield, Route, Clock, Award, ChevronLeft, ChevronRight,
  AlertCircle, RefreshCw, Radio, Plus, Heart, Camera, Handshake,
  MessageCircle, CheckCircle2, Bookmark, Check
} from 'lucide-react';
import {
  fetchNearbyPlaces,
  getDeviceLocation,
  watchDeviceLocation,
  VibePlace,
  VibeCategory,
  DeviceLocationState,
  recordCategoryClick,
  computeAiVibeMatch,
  fetchActivePromotions
} from '../domains/d03_vibe_orbit';
import { calculateDistanceMeters } from '../domains/d03_vibe_orbit/presenceVerifier';
import {
  fetchCulturalTrails,
  fetchVibeGuardians,
  toggleSavedTrail,
  CommunityTrail,
  CulturalTrail,
  VibeGuardian,
  TrailWaypoint,
  isGuardianFresh,
  countExpiredGuardians
} from '../domains/d07_trails';
import { UserProfile } from '../domains/d01_auth';
import { supabase } from '../lib/supabase';
import { TrailDetailModal } from './TrailDetailModal';
import { GuardianDetailModal } from './GuardianDetailModal';
import { CurateTrailModal } from './CurateTrailModal';
import { VibeFlashBoard } from './VibeFlashBoard';
import { LiveSelfieModal } from './LiveSelfieModal';
import { HireHandshakeModal } from './HireHandshakeModal';
import { HireGuardianForTrailModal } from './HireGuardianForTrailModal';
import { TourReservationModal } from './TourReservationModal';
import { useTheme } from '../lib/theme';
import { AddPlaceCard } from './AddPlaceCard';

interface ExploreTabProps {
  user?: UserProfile | null;
  onSelectPlace: (place: VibePlace) => void;
  onRequireAuth?: () => void;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({
  user = null,
  onSelectPlace,
  onRequireAuth
}) => {
  const { theme } = useTheme();
  const prevThemeRef = useRef(theme);
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const draftMarkerRef = useRef<any>(null);
  const [draftCoords, setDraftCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isDraftModeActive, setIsDraftModeActive] = useState(false);
  const hasInitiallyCenteredRef = useRef<boolean>(false);

  const trailsScrollRef = useRef<HTMLDivElement>(null);
  const guardiansScrollRef = useRef<HTMLDivElement>(null);

  // Real Geolocation State (Zero hardcoded Dubai)
  const [locationState, setLocationState] = useState<DeviceLocationState>({
    status: 'requesting',
    coords: null
  });

  const [places, setPlaces] = useState<VibePlace[]>([]);
  const [trails, setTrails] = useState<CommunityTrail[]>([]);
  const [guardians, setGuardians] = useState<VibeGuardian[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<VibeCategory | 'All'>('All');
  const [visibleWaypointsCount, setVisibleWaypointsCount] = useState<number>(3);

  useEffect(() => {
    setVisibleWaypointsCount(3);
  }, [selectedCategory]);

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Community Curations & Local Knowledge Hub Sub-tab controls
  const [trailSubTab, setTrailSubTab] = useState<'trails' | 'tours'>('trails');
  const [guardianFilter, setGuardianFilter] = useState<'top' | 'pro' | 'local'>('top');
  const [savedTrailIds, setSavedTrailIds] = useState<Set<string>>(new Set());

  // Active Modals & Toast State
  const [selectedTrail, setSelectedTrail] = useState<CommunityTrail | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<VibeGuardian | null>(null);
  const [selectedHireGuardian, setSelectedHireGuardian] = useState<VibeGuardian | null>(null);
  const [hireTrail, setHireTrail] = useState<CommunityTrail | null>(null);
  const [selectedHireTrailContext, setSelectedHireTrailContext] = useState<CommunityTrail | null>(null);
  const [adoptingTrail, setAdoptingTrail] = useState<CommunityTrail | null>(null);
  const [reservationTour, setReservationTour] = useState<CommunityTrail | null>(null);
  const [isCurateOpen, setIsCurateOpen] = useState(false);
  const [isSelfieModalOpen, setIsSelfieModalOpen] = useState(false);
  const [guardianRegistrationType, setGuardianRegistrationType] = useState<'local' | 'pro' | undefined>();
  const openGuardianRegistration = (type?: 'local' | 'pro') => {
    if (!user) { onRequireAuth?.(); return; }
    const existing = guardians.find(guardian => guardian.id === user.id);
    if (type === 'local' && existing?.type === 'pro') {
      showToast('This account is already a Pro Guardian. Creating a Local Legend would replace that role.');
      return;
    }
    setGuardianRegistrationType(type);
    setIsSelfieModalOpen(true);
  };
  const [exploreToast, setExploreToast] = useState<string | null>(null);

  const categories: (VibeCategory | 'All')[] = ['All', 'Food', 'Art', 'Spots', 'Culture', 'Night Owl'];

  const showToast = (msg: string) => {
    setExploreToast(msg);
    setTimeout(() => {
      setExploreToast(null);
    }, 3500);
  };

  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);

  // 1. Acquire real device location via watchPosition / getCurrentPosition
  useEffect(() => {
    let unwatch: (() => void) | null = null;

    setLocationState({ status: 'requesting', coords: null });

    getDeviceLocation().then((initialState) => {
      setLocationState(initialState);
      if (initialState.coords) {
        prevCoordsRef.current = { lat: initialState.coords.lat, lng: initialState.coords.lng };
      }

      // Start continuous GPS watch (filtered by >= 20m movement)
      unwatch = watchDeviceLocation((updatedState) => {
        if (updatedState.coords) {
          const prev = prevCoordsRef.current;
          if (!prev || calculateDistanceMeters(prev.lat, prev.lng, updatedState.coords.lat, updatedState.coords.lng) >= 20) {
            prevCoordsRef.current = { lat: updatedState.coords.lat, lng: updatedState.coords.lng };
            setLocationState(updatedState);
          }
        }
      });
    });

    return () => {
      if (unwatch) unwatch();
    };
  }, []);

  const [activePromos, setActivePromos] = useState<any[]>([]);
  useEffect(() => {
    fetchActivePromotions().then(map => {
      setActivePromos(map ? Object.values(map) : []);
    });
  }, []);

  // 2. Query each real directory independently. A failing gallery must not hide Guardians.
  useEffect(() => {
    let cancelled = false;
    if (places.length === 0) {
      setLoading(true);
    }

    Promise.allSettled([
      fetchNearbyPlaces(locationState.coords, selectedCategory),
      fetchCulturalTrails(),
      fetchVibeGuardians(),
      supabase.auth.getUser()
    ]).then(([placesResult, trailsResult, guardiansResult, authResult]) => {
      if (cancelled) return;
      if (placesResult.status === 'fulfilled') setPlaces(placesResult.value);
      if (trailsResult.status === 'fulfilled') {
        const trailsData = trailsResult.value;
        setTrails(trailsData);
        const authId = authResult.status === 'fulfilled' ? authResult.value.data.user?.id : undefined;
        const aliases = [user?.id, authId, authId ? 'usr_' + authId : null];
        setSavedTrailIds(new Set(trailsData.filter(t => t.savedBy?.some(id => aliases.includes(id))).map(t => t.id)));
      }
      if (guardiansResult.status === 'fulfilled') setGuardians(guardiansResult.value);

      const failures = [placesResult, trailsResult, guardiansResult, authResult]
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected');
      if (failures.length > 0) {
        const first = failures[0].reason;
        showToast(first instanceof Error ? first.message : 'Some Explore data could not be loaded.');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [locationState.coords?.lat, locationState.coords?.lng, selectedCategory, user?.id]);

  // 3. Initialize MapLibre GL dark-matter map (Neutral world center until device location arrives)
  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapInstance.current) return;

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      console.warn('MapLibre GL CDN not loaded yet');
      return;
    }

    try {
      // Use real coordinates if already available; otherwise neutral view (NO hardcoded Dubai)
      const hasCoords = !!locationState.coords;
      if (hasCoords) {
        hasInitiallyCenteredRef.current = true;
      }
      const initialCenter: [number, number] = locationState.coords
        ? [locationState.coords.lng, locationState.coords.lat]
        : [0, 20];
      const initialZoom = locationState.coords ? 13.5 : 2;

      const mapStyleUrl = theme === 'light'
        ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
        : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: mapStyleUrl,
        center: initialCenter,
        zoom: initialZoom,
        pitch: locationState.coords ? 45 : 0,
        bearing: -17,
        // Render mandatory map credits below the map, away from the GPS readout.
        attributionControl: false
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      mapInstance.current = map;
    } catch (err) {
      console.warn('MapLibre init error:', err);
    }

    return () => {
      if (mapInstance.current) {
        try {
          mapInstance.current.remove();
        } catch {
          // Ignore AbortError / tile cancellation on unmount
        }
        mapInstance.current = null;
      }
    };
  }, []);

  // Dynamically switch MapLibre basemap style when theme toggles
  useEffect(() => {
    if (prevThemeRef.current === theme) return;
    prevThemeRef.current = theme;
    if (!mapInstance.current) return;
    const nextStyle = theme === 'light'
      ? 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'
      : 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';
    try {
      mapInstance.current.setStyle(nextStyle);
    } catch (err) {
      console.warn('MapLibre setStyle error:', err);
    }
  }, [theme]);

  // 4. Center MapLibre ONCE on initial real device coordinates, then preserve user pan/zoom freedom
  useEffect(() => {
    if (
      !hasInitiallyCenteredRef.current &&
      locationState.status === 'granted' &&
      locationState.coords &&
      mapInstance.current
    ) {
      try {
        hasInitiallyCenteredRef.current = true;
        mapInstance.current.flyTo({
          center: [locationState.coords.lng, locationState.coords.lat],
          zoom: 13.5,
          pitch: 45,
          bearing: -17,
          essential: true
        });
      } catch (err) {
        console.warn('Error initially centering map on user location:', err);
      }
    }
  }, [locationState.status, locationState.coords]);

  // 5. Update MapLibre markers: User location beacon + Cultural orbs colored by category
  useEffect(() => {
    const map = mapInstance.current;
    const maplibregl = (window as any).maplibregl;
    if (!map || !maplibregl) return;

    // Remove previous place markers
    markersRef.current.forEach((m) => {
      try {
        m.remove();
      } catch {}
    });
    markersRef.current = [];

    // Add or update User location beacon marker
    if (locationState.coords) {
      if (userMarkerRef.current) {
        userMarkerRef.current.setLngLat([locationState.coords.lng, locationState.coords.lat]);
      } else {
        const userEl = document.createElement('div');
        userEl.className = 'relative flex items-center justify-center cursor-pointer';
        userEl.innerHTML = `
          <div class="w-8 h-8 rounded-full bg-cyan-500/20 animate-ping absolute"></div>
          <div class="w-5 h-5 rounded-full bg-cyan-400/40 ring-4 ring-cyan-500/40 absolute"></div>
          <div class="w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-cyan-400 z-10"></div>
        `;
        userMarkerRef.current = new maplibregl.Marker({ element: userEl })
          .setLngLat([locationState.coords.lng, locationState.coords.lat])
          .addTo(map);
      }
    }

    // Add cultural orb markers for all returned places
    places.forEach((place) => {
      if (!place.lng || !place.lat || isNaN(place.lng) || isNaN(place.lat)) return;

      const orbEl = document.createElement('div');
      orbEl.className = 'cursor-pointer group flex flex-col items-center select-none';

      // Category color mapping matching reference artwork (0DvcX_6bc6cde4.jpg)
      let orbGlow = 'rgba(6, 182, 212, 0.4)';
      let orbBorder = 'border-cyan-400/60';
      let orbBg = 'from-cyan-500/30 via-neutral-950/90 to-cyan-950/80';
      let dotBg = 'bg-cyan-400';

      if (place.category === 'Food') {
        orbGlow = 'rgba(245, 158, 11, 0.5)';
        orbBorder = 'border-amber-400/60';
        orbBg = 'from-amber-500/30 via-neutral-950/90 to-amber-950/80';
        dotBg = 'bg-amber-400';
      } else if (place.category === 'Art') {
        orbGlow = 'rgba(6, 182, 212, 0.5)';
        orbBorder = 'border-teal-400/60';
        orbBg = 'from-teal-500/30 via-neutral-950/90 to-teal-950/80';
        dotBg = 'bg-teal-400';
      } else if (place.category === 'Spots') {
        orbGlow = 'rgba(168, 85, 247, 0.5)';
        orbBorder = 'border-purple-400/60';
        orbBg = 'from-purple-500/30 via-neutral-950/90 to-purple-950/80';
        dotBg = 'bg-purple-400';
      } else if (place.category === 'Culture') {
        orbGlow = 'rgba(59, 130, 246, 0.5)';
        orbBorder = 'border-blue-400/60';
        orbBg = 'from-blue-500/30 via-neutral-950/90 to-blue-950/80';
        dotBg = 'bg-blue-400';
      } else if (place.category === 'Night Owl') {
        orbGlow = 'rgba(236, 72, 153, 0.5)';
        orbBorder = 'border-pink-400/60';
        orbBg = 'from-pink-500/30 via-neutral-950/90 to-pink-950/80';
        dotBg = 'bg-pink-400';
      }

      const pill = document.createElement('div');
      pill.className = `px-2.5 py-1 rounded-xl bg-gradient-to-br ${orbBg} backdrop-blur-md border ${orbBorder} text-[10px] font-bold text-white shadow-xl flex items-center space-x-1.5 transition-transform duration-300 group-hover:scale-110`;
      pill.style.boxShadow = `0 4px 14px ${orbGlow}`;

      const dot = document.createElement('span');
      dot.className = `w-2 h-2 rounded-full ${dotBg} animate-pulse`;
      pill.appendChild(dot);

      const titleSpan = document.createElement('span');
      titleSpan.className = 'truncate max-w-[110px]';
      titleSpan.textContent = place.title; // Safe against XSS
      pill.appendChild(titleSpan);

      if (place.is_promoted && place.vq_reward) {
        const badge = document.createElement('span');
        badge.className = 'text-amber-300 font-bold';
        badge.textContent = `+${place.vq_reward} PTS`;
        pill.appendChild(badge);
      } else {
        const badge = document.createElement('span');
        badge.className = 'text-amber-400/90 font-medium text-[9px]';
        badge.textContent = '📍 Spot';
        pill.appendChild(badge);
      }
      orbEl.appendChild(pill);

      const dotBottom = document.createElement('div');
      dotBottom.className = `w-3.5 h-3.5 rounded-full ${dotBg} ring-4 ring-white/20 mt-1 shadow-lg transition-transform group-hover:scale-125`;
      orbEl.appendChild(dotBottom);

      orbEl.onclick = (e) => {
        e.stopPropagation();
        onSelectPlace(place);
      };

      const marker = new maplibregl.Marker({ element: orbEl, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => {
        try {
          m.remove();
        } catch {}
      });
      markersRef.current = [];
    };
  }, [places, locationState.coords]);

  // Render Draft Contribution Marker on MapLibre when active
  useEffect(() => {
    const map = mapInstance.current;
    const maplibregl = (window as any).maplibregl;
    if (!map || !maplibregl) return;

    if (draftMarkerRef.current) {
      draftMarkerRef.current.remove();
      draftMarkerRef.current = null;
    }

    if (draftCoords) {
      const draftEl = document.createElement('div');
      draftEl.className = 'relative flex items-center justify-center cursor-pointer';
      draftEl.innerHTML = `
        <div class="w-10 h-10 rounded-full bg-amber-500/30 animate-ping absolute"></div>
        <div class="w-6 h-6 rounded-full bg-amber-400 ring-4 ring-amber-500/40 absolute shadow-lg"></div>
        <div class="w-3.5 h-3.5 rounded-full bg-white z-10"></div>
      `;

      const marker = new maplibregl.Marker({ element: draftEl, draggable: true })
        .setLngLat([draftCoords.lng, draftCoords.lat])
        .addTo(map);

      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        setDraftCoords({ lat: lngLat.lat, lng: lngLat.lng });
      });

      draftMarkerRef.current = marker;
    }
  }, [draftCoords]);

  // Map click listener to place/move draft pin ONLY when draft mode is active
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const handleMapClick = (e: any) => {
      if (!isDraftModeActive) return;
      const { lng, lat } = e.lngLat;
      setDraftCoords({ lat, lng });
    };
    map.on('click', handleMapClick);
    return () => {
      map.off('click', handleMapClick);
    };
  }, [isDraftModeActive]);

  const handleSaveTrail = async (trailId: string) => {
    if (!user) { onRequireAuth?.(); return; }
    try {
      const saved = await toggleSavedTrail(trailId);
      setTrails(prev => prev.map(t => t.id === trailId ? saved : t));
      setSelectedTrail(prev => prev?.id === trailId ? saved : prev);
      setSavedTrailIds(prev => {
        const next = new Set(prev);
        if (saved.savedBy?.includes(user.id)) next.add(trailId);
        else next.delete(trailId);
        return next;
      });
      showToast(saved.savedBy?.includes(user.id) ? 'Trail saved to your account.' : 'Trail removed from bookmarks.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not update Trail save.');
    }
  };
  const openAdoptEditor = (source: CommunityTrail) => {
    if (!user) { onRequireAuth?.(); return; }
    setSelectedTrail(null);
    setAdoptingTrail(source);
    setIsCurateOpen(true);
  };

  const handleRecenterUser = () => {
    if (locationState.coords && mapInstance.current) {
      try {
        mapInstance.current.flyTo({
          center: [locationState.coords.lng, locationState.coords.lat],
          zoom: 14,
          pitch: 45,
          bearing: -17,
          essential: true
        });
        showToast('Map centered on your current location.');
      } catch (err) {
        console.warn('Recenter error:', err);
      }
    } else {
      handleManualCalibrate();
    }
  };

  const handleManualCalibrate = () => {
    setLocationState({ status: 'requesting', coords: null });
    getDeviceLocation().then((res) => {
      setLocationState(res);
      if (res.status === 'granted' && res.coords) {
        if (mapInstance.current) {
          try {
            mapInstance.current.flyTo({
              center: [res.coords.lng, res.coords.lat],
              zoom: 14,
              pitch: 45,
              bearing: -17,
              essential: true
            });
          } catch (err) {
            console.warn('Map flyTo error:', err);
          }
        }
        showToast(`GPS Calibrated! Lat: ${res.coords.lat.toFixed(4)}, Lng: ${res.coords.lng.toFixed(4)}`);
      } else if (res.status === 'denied') {
        showToast('Location permission denied. Please allow GPS in browser settings.');
      } else {
        showToast('Unable to acquire GPS signal. Check device location services.');
      }
    });
  };

  const handleScrollTrails = (direction: 'left' | 'right') => {
    if (trailsScrollRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      trailsScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleScrollGuardians = (direction: 'left' | 'right') => {
    if (guardiansScrollRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      guardiansScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleLocateGuardian = (g: VibeGuardian) => {
    setSelectedGuardian(null);
    if (g.lng && g.lat && mapInstance.current) {
      try {
        mapInstance.current.flyTo({
          center: [g.lng, g.lat],
          zoom: 15.5,
          pitch: 50,
          essential: true
        });
      } catch (err) {
        console.warn('Map fly error:', err);
      }
    }
    showToast(g.lng !== undefined && g.lat !== undefined ? `Located registered Guardian ${g.name} on the map.` : 'This Guardian has not shared a mapped location.');
  };

  const handleWaypointCheckIn = (wp: TrailWaypoint, trail: CulturalTrail) => {
    showToast(`Opened waypoint "${wp.title || wp.name}" in Trail "${trail.title}". Reward verification is not yet available.`);
  };

  return (
    <div className={`space-y-6 pb-24 text-[#050505] dark:text-white transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-[#F0F2F5] dark:bg-neutral-950 p-4 overflow-y-auto' : ''}`}>
      {/* Toast Notification */}
      {exploreToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#050505] dark:bg-neutral-900/95 border border-[#0866FF]/40 dark:border-teal-500/50 text-white dark:text-teal-300 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn pointer-events-none">
          <Sparkles className="w-4 h-4 text-[#0866FF] dark:text-amber-400 flex-shrink-0" />
          <span>{exploreToast}</span>
        </div>
      )}

      {/* Header & Fullscreen Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center space-x-2">
            <Compass className="w-6 h-6 text-[#0866FF] dark:text-orange-400 animate-spin-slow" />
            <span className="text-[#050505] dark:bg-clip-text dark:text-transparent dark:bg-gradient-to-r dark:from-white dark:via-neutral-200 dark:to-orange-300">
              Vibe Orbit
            </span>
          </h1>
          <p className="text-xs text-[#65676B] dark:text-neutral-400">23km : trust your instincts</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRecenterUser}
            className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 hover:bg-[#EFEFEF] dark:hover:bg-neutral-800 transition text-[#0866FF] dark:text-cyan-400 flex items-center space-x-1.5 text-xs font-semibold cursor-pointer shadow-xs dark:shadow-none"
            title="Recenter on My Location"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Location</span>
          </button>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 hover:bg-[#EFEFEF] dark:hover:bg-neutral-800 transition text-[#050505] dark:text-teal-400 flex items-center space-x-1.5 text-xs font-semibold cursor-pointer shadow-xs dark:shadow-none"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullScreen ? 'Collapse' : 'Expand Orbit'}</span>
          </button>
        </div>
      </div>

      {/* Vibe Flash Board (Top of Explore Tab) */}
      <VibeFlashBoard userCoords={locationState.coords ? { lat: locationState.coords.lat, lng: locationState.coords.lng } : undefined} onToast={showToast} />

      {/* Geolocation Status / Permission Warning Banner */}
      {locationState.status === 'denied' && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Location permission was denied. Please allow browser location access to discover places near your device.</span>
          </div>
          <button
            onClick={handleManualCalibrate}
            className="px-3 py-1 rounded-xl bg-amber-100 dark:bg-amber-500/20 hover:bg-amber-200 dark:hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 font-bold text-xs whitespace-nowrap ml-2 cursor-pointer"
          >
            Retry GPS
          </button>
        </div>
      )}

      {locationState.status === 'unavailable' && (
        <div className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 text-[#65676B] dark:text-neutral-400 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-4 h-4 flex-shrink-0 text-[#65676B] dark:text-neutral-500" />
            <span>GPS sensor is unavailable or timed out. Re-calibrating radar...</span>
          </div>
          <button
            onClick={handleManualCalibrate}
            className="px-3 py-1 rounded-xl bg-[#EFEFEF] dark:bg-neutral-800 hover:bg-[#E4E6EB] dark:hover:bg-neutral-700 text-[#050505] dark:text-neutral-200 font-bold text-xs whitespace-nowrap ml-2 cursor-pointer"
          >
            Retry GPS
          </button>
        </div>
      )}

      {/* Category Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setSelectedCategory(cat);
              recordCategoryClick(cat);
            }}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#0866FF] dark:bg-gradient-to-r dark:from-orange-500 dark:to-amber-600 text-white shadow-sm dark:shadow-lg dark:shadow-orange-500/30 border border-[#0866FF] dark:border-orange-400/50'
                : 'bg-white dark:bg-neutral-900 text-[#65676B] dark:text-neutral-400 border border-[#DBDBDB] dark:border-neutral-800 hover:bg-[#EFEFEF] dark:hover:bg-neutral-800 hover:text-[#050505] dark:hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Add a Place Component */}
      <AddPlaceCard
        user={user ?? null}
        userCoords={locationState.coords}
        onPlaceAdded={(newPlace) => {
          setPlaces(prev => [newPlace, ...prev]);
          setDraftCoords(null);
          setIsDraftModeActive(false);
        }}
        onToast={showToast}
        onRequireAuth={() => onRequireAuth?.()}
        draftCoords={draftCoords}
        onUpdateDraftCoords={setDraftCoords}
        onDraftModeChange={setIsDraftModeActive}
      />

      {/* Vibe Orbit Radar Container / Map View */}
      <div className={`relative rounded-3xl overflow-hidden border border-[#DBDBDB] dark:border-neutral-800 bg-[#EFEFEF] dark:bg-neutral-900 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-2xl ${isFullScreen ? 'h-[70vh]' : 'h-[380px]'}`}>
        {/* MapLibre Container (Real device coordinates center) */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {/* Soft Organic Concentric Rings Visual Overlay (Matches Reference 0DvcX_6bc6cde4.jpg) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          {/* Outer ring */}
          <div className="absolute w-[320px] h-[320px] rounded-full border border-[#0866FF]/20 dark:border-purple-500/20 animate-pulse" style={{ animationDuration: '6s' }} />
          {/* Middle ring */}
          <div className="absolute w-56 h-56 rounded-full border border-teal-600/20 dark:border-teal-500/25" />
          {/* Inner ring */}
          <div className="absolute w-36 h-36 rounded-full border border-[#0866FF]/25 dark:border-orange-500/30 animate-pulse" style={{ animationDuration: '3s' }} />

          {/* Central Compass Rose Emblem */}
          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none opacity-85">
            <span className="text-[9px] uppercase tracking-[0.25em] text-[#0866FF] dark:text-amber-200/90 font-bold">
              ✦ VIBE ORBIT ✦
            </span>
            <span className="text-[7.5px] uppercase tracking-[0.18em] text-[#65676B] dark:text-neutral-400 font-medium mt-0.5">
              CULTURAL DISCOVERY RADAR
            </span>
            <span className="text-[7px] text-[#0866FF]/80 dark:text-teal-400/80 font-mono mt-0.5">
              NEAREST FIRST
            </span>
          </div>
        </div>

        {/* Bottom Legend Overlay with Real Device Coordinates */}
        <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-neutral-950/85 backdrop-blur-xl border border-[#DBDBDB] dark:border-neutral-800 rounded-2xl p-3 flex items-center justify-between text-xs shadow-sm dark:shadow-none">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${locationState.status === 'granted' ? 'bg-[#0866FF] dark:bg-cyan-400 animate-pulse' : 'bg-[#65676B] dark:bg-neutral-500'}`} />
            <span className="font-bold text-[#050505] dark:text-white">
              {locationState.status === 'granted' && locationState.coords
                ? `GPS Active: ${locationState.coords.lat.toFixed(4)}, ${locationState.coords.lng.toFixed(4)}`
                : locationState.status === 'requesting'
                ? 'Acquiring GPS Signal...'
                : 'GPS Offline'}
            </span>
          </div>
          <span className="text-[11px] text-[#65676B] dark:text-neutral-400 font-medium">
            {places.length} Places
          </span>
        </div>
      </div>

      <div className="text-[10px] text-[#65676B] dark:text-neutral-500 flex flex-wrap justify-end gap-x-1 px-2 -mt-4" aria-label="Map attribution">
        <span>MapLibre |</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#050505] dark:hover:text-neutral-300">© OpenStreetMap contributors</a>
        <span>©</span>
        <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#050505] dark:hover:text-neutral-300">CARTO</a>
      </div>

      {/* Nearby Vibe Waypoints, ordered by device distance */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center space-x-2 text-[#050505] dark:text-white">
            <Flame className="w-4 h-4 text-[#0866FF] dark:text-orange-400" />
            <span>Nearby Vibe Waypoints ({places.length})</span>
          </h3>
          {locationState.coords && (
            <span className="text-[11px] text-[#0866FF] dark:text-teal-400 font-mono">
              Nearest first
            </span>
          )}
        </div>

        {places.length > 0 ? (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 gap-3.5">
              {places.slice(0, visibleWaypointsCount).map((place, idx) => {
                const tier = idx === 0 ? 'LEGENDARY' : idx === 1 ? 'LEGENDARY' : 'RARE';
                const rating = place.rating !== undefined ? place.rating.toFixed(1) : undefined;
                const googleReviewsCount = typeof place.reviews_count === 'number' ? place.reviews_count : undefined;
                const appCheckinsCount = typeof place.checkins_count === 'number' && place.checkins_count > 0 ? place.checkins_count : undefined;
                const dynamicMatch = computeAiVibeMatch(place, user);
                const matchScore = place.ai_match_score ?? dynamicMatch.score;
                const promo = activePromos.find(p => p.place_id === place.id && p.is_active && p.remaining_pool > 0);
                const isPromoted = Boolean(place.is_promoted || (promo && promo.remaining_pool > 0));
                const vqReward = promo ? promo.reward_per_checkin : place.vq_reward;
                return (
                  <div
                    key={place.id}
                    onClick={() => onSelectPlace(place)}
                    className="rounded-3xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 hover:border-[#0866FF]/40 dark:hover:border-cyan-500/40 transition cursor-pointer p-4 sm:p-5 flex flex-col space-y-4 group shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-xl relative"
                  >
                    {/* TOP: Badges & Full-width Title */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-500/30 px-2.5 py-0.5 rounded">
                          {place.category || 'SPOTS'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-500/40 px-2.5 py-0.5 rounded">
                          {tier}
                        </span>
                        <span className="text-[10px] font-bold text-[#0866FF] dark:text-purple-300 bg-[#E7F3FF] dark:bg-purple-950/60 border border-[#0866FF]/20 dark:border-purple-500/30 px-2.5 py-0.5 rounded flex items-center space-x-1">
                          <span>✨</span>
                          <span>{matchScore}% MATCH</span>
                        </span>
                      </div>
                      <h4 className="font-black text-lg sm:text-xl text-[#050505] dark:text-white tracking-tight leading-snug">
                        {place.title}
                      </h4>
                    </div>

                    {/* MIDDLE: Large Hero Photo spanning full card width */}
                    <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-[#EFEFEF] dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 shadow-sm dark:shadow-lg">
                      <img
                        src={place.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'}
                        alt={place.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      {rating && (
                        <div className="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-neutral-950/90 text-amber-400 text-xs font-black flex items-center space-x-1.5 border border-neutral-800 shadow-md">
                          <span>★</span>
                          <span>{rating}</span>
                        </div>
                      )}
                    </div>

                    {/* BELOW PHOTO: Address */}
                    <div className="text-xs text-[#262626] dark:text-neutral-300 flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-[#0866FF] dark:text-orange-400 flex-shrink-0" />
                      <span>{place.address}</span>
                    </div>

                    {/* BOTTOM: Distance, visits & reward actions */}
                    <div className="pt-3 border-t border-[#E4E6EB] dark:border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#0866FF] dark:text-teal-300">
                        {place.distance_km !== undefined ? `${place.distance_km} km` : 'Nearby'}
                        {googleReviewsCount !== undefined ? ` • ${googleReviewsCount} reviews` : ''}
                        {appCheckinsCount !== undefined ? ` • ${appCheckinsCount} check-ins` : ''}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="px-3.5 py-2 rounded-xl bg-[#EFEFEF] dark:bg-neutral-800/80 text-[#65676B] dark:text-neutral-400 border border-[#DBDBDB] dark:border-neutral-700/60 text-xs font-bold flex items-center space-x-1 shadow-xs dark:shadow">
                          <span className="text-[10px]">🔒</span>
                          <span>Locked</span>
                        </span>
                        {isPromoted && vqReward ? (
                          <span className="px-3.5 py-2 rounded-xl bg-emerald-50 dark:bg-teal-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-teal-500/30 text-xs font-bold shadow-xs dark:shadow flex items-center space-x-1">
                            <span>🚀</span>
                            <span>+{vqReward} PTS</span>
                          </span>
                        ) : (
                          <span className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-xs font-bold shadow-xs dark:shadow flex items-center space-x-1">
                            <span>🚀</span>
                            <span>Promote Spot</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {visibleWaypointsCount < places.length && (
              <button
                type="button"
                onClick={() => setVisibleWaypointsCount((prev) => Math.min(places.length, prev + 3))}
                className="w-full py-3.5 rounded-2xl bg-white dark:bg-neutral-900 hover:bg-[#EFEFEF] dark:hover:bg-neutral-800 border border-[#DBDBDB] dark:border-neutral-700/60 text-[#0866FF] dark:text-teal-300 hover:text-[#050505] dark:hover:text-white font-bold text-xs tracking-wider transition cursor-pointer shadow-sm dark:shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Load More</span>
                <span className="text-[10px] text-[#65676B] dark:text-neutral-400">({places.length - visibleWaypointsCount} remaining)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-neutral-900/60 border border-[#DBDBDB] dark:border-neutral-800/80 p-6 text-center space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none">
            <Compass className="w-8 h-8 text-[#0866FF]/60 dark:text-orange-400/60 mx-auto" />
            <h4 className="font-bold text-sm text-[#050505] dark:text-white">No cultural waypoints available</h4>
            <p className="text-xs text-[#65676B] dark:text-neutral-400 max-w-sm mx-auto">
              {locationState.coords
                ? `No places were returned for your current location (${locationState.coords.lat.toFixed(4)}, ${locationState.coords.lng.toFixed(4)}). Zero mock fallback is active.`
                : 'Awaiting device location coordinates to scan for nearby cultural waypoints.'}
            </p>
          </div>
        )}
      </div>

      {/* Part 1 & Part 2: Community Curations - Cultural Vibes Trails */}
      <div className="space-y-4 pt-4 border-t border-[#DBDBDB] dark:border-neutral-800">
        {/* Section Header with Neon Green Typography */}
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-[#00e599] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 dark:text-[#00e599] font-mono">
              COMMUNITY CURATIONS - LOCAL KNOWLEDGE
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-[#050505] dark:text-white tracking-tight">
              Cultural Vibes Trails
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleScrollTrails('left')}
                className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 text-[#050505] dark:text-teal-400 hover:bg-[#EFEFEF] dark:hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScrollTrails('right')}
                className="p-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 text-[#050505] dark:text-teal-400 hover:bg-[#EFEFEF] dark:hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <p className="text-xs text-[#65676B] dark:text-neutral-400 leading-normal">
            Community-curated multi-stop itineraries & commercial pro-guided tour offerings.
          </p>
        </div>

        {/* Control Bar: Sub-tabs & + Curate Trail Action */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTrailSubTab('trails')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer border ${
                trailSubTab === 'trails'
                  ? 'bg-[#E7F3FF] dark:bg-neutral-900 text-[#0866FF] dark:text-[#00e599] border-[#0866FF]/40 dark:border-[#00e599]/60 shadow-sm dark:shadow-lg dark:shadow-[#00e599]/10'
                  : 'bg-white dark:bg-neutral-950 text-[#65676B] dark:text-neutral-400 border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505] dark:hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Vibe Trails</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                trailSubTab === 'trails' ? 'bg-[#0866FF]/15 dark:bg-[#00e599]/20 text-[#0866FF] dark:text-[#00e599]' : 'bg-[#EFEFEF] dark:bg-neutral-800 text-[#65676B] dark:text-neutral-400'
              }`}>
                {trails.filter((t) => !t.isTour).length}
              </span>
            </button>

            <button
              onClick={() => setTrailSubTab('tours')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer border ${
                trailSubTab === 'tours'
                  ? 'bg-amber-50 dark:bg-neutral-900 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/60 shadow-sm dark:shadow-lg dark:shadow-amber-500/10'
                  : 'bg-white dark:bg-neutral-950 text-[#65676B] dark:text-neutral-400 border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505] dark:hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Vibe Tours</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                trailSubTab === 'tours' ? 'bg-amber-200/70 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300' : 'bg-[#EFEFEF] dark:bg-neutral-800 text-[#65676B] dark:text-neutral-400'
              }`}>
                {trails.filter((t) => t.isTour).length}
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsCurateOpen(true)}
            className="px-4 py-2 rounded-2xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-neutral-900 border border-[#0866FF] dark:border-[#00e599]/40 dark:hover:border-[#00e599] text-white dark:text-[#00e599] font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-sm dark:shadow-md flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Curate Trail</span>
          </button>
        </div>

        {/* Part 2: Vibe Trails & Vibe Tours Display Cards (matching exact reference image_00d13d9c.png) */}
        {(() => {
          const displayedTrails = trailSubTab === 'tours'
            ? trails.filter((t) => t.isTour)
            : trails.filter((t) => !t.isTour);

          if (displayedTrails.length === 0) {
            return (
              <div className="rounded-3xl bg-white dark:bg-neutral-900/60 border border-[#DBDBDB] dark:border-neutral-800/80 p-6 text-center space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none">
                <Compass className="w-8 h-8 text-[#0866FF]/60 dark:text-[#00e599]/60 mx-auto" />
                <h4 className="font-bold text-sm text-[#050505] dark:text-white">No {trailSubTab === 'tours' ? 'Vibe Tours' : 'Vibe Trails'} available in this filter</h4>
                <p className="text-xs text-[#65676B] dark:text-neutral-400 max-w-sm mx-auto">
                  Be the first pathfinder to curate an itinerary for this district sector.
                </p>
                <button
                  onClick={() => setIsCurateOpen(true)}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#0866FF] dark:bg-[#00e599] text-white dark:text-neutral-950 font-bold text-xs cursor-pointer"
                >
                  + Curate First Trail
                </button>
              </div>
            );
          }

          return (
            <div
              ref={trailsScrollRef}
              className="flex space-x-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
            >
              {displayedTrails.map((trail) => {
                const isBookmarked = savedTrailIds.has(trail.id);
                const stopCount = trail.stopsCount || trail.waypoints_count || (trail.stops ? trail.stops.length : 3);
                const durationLabel = trail.durationHours ? `~${trail.durationHours}h` : `${Math.round((trail.duration_mins || 180)/60)}h`;

                return (
                  <div
                    key={trail.id}
                    onClick={() => setSelectedTrail(trail)}
                    className="w-[min(300px,calc(100vw-2rem))] sm:w-[330px] flex-shrink-0 snap-start rounded-3xl bg-white dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800/90 hover:border-[#0866FF]/50 dark:hover:border-[#00e599]/60 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between group shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-2xl relative"
                  >
                    {/* Media Banner Section with Top Header Overlays */}
                    <div className="relative h-44 w-full overflow-hidden bg-[#EFEFEF] dark:bg-neutral-900">
                      <img
                        src={trail.imageUrl || trail.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80'}
                        alt={trail.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-neutral-950/70" />

                      {/* Top Header Row on Image: Category Badge + City + Bookmark Action */}
                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                          <span className="text-[10px] font-black uppercase tracking-wider bg-black/70 text-pink-400 px-2.5 py-1 rounded-full border border-pink-500/30 backdrop-blur-md">
                            📍 {trail.category || 'FULL DAY CIRCUIT'}
                          </span>
                          <span className="text-[10px] font-bold text-neutral-300 bg-neutral-950/80 px-2.5 py-1 rounded-full border border-white/10 backdrop-blur-md truncate max-w-[120px]">
                            {trail.city || trail.district || 'Tunis, Tunisia'}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSaveTrail(trail.id);
                          }}
                          className={`p-1.5 rounded-full backdrop-blur-md border transition cursor-pointer ${
                            isBookmarked
                              ? 'bg-pink-500/20 text-pink-400 border-pink-500/40'
                              : 'bg-black/60 text-white/80 border-white/10 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-pink-400' : ''}`} />
                        </button>
                      </div>

                      {/* Media Banner Bottom Overlays: Duration Pill & Stop Count Tag */}
                      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between z-10">
                        <span className="text-[10px] font-bold text-amber-300 bg-black/75 px-2.5 py-1 rounded-xl border border-amber-500/30 backdrop-blur-md flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>⏱ {durationLabel}</span>
                        </span>

                        <span className="text-[10px] font-bold text-[#00e599] bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-[#00e599]/40 backdrop-blur-md">
                          {stopCount} Stops Circuit
                        </span>
                      </div>
                    </div>

                    {/* Card Content Body matching image_00d13d9c.png */}
                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      {/* Time Flow Indicator */}
                      <div className="flex items-center space-x-1 text-xs font-mono font-bold text-[#262626] dark:text-neutral-300">
                        <span className="text-[#65676B] dark:text-neutral-400 text-[11px]">FLOW:</span>
                        <span className="text-[#050505] dark:text-white">
                          {trail.flowSequence && trail.flowSequence.length > 0
                            ? trail.flowSequence.join(' -> ')
                            : '🌅 -> 🌆 -> 🌙'}
                        </span>
                      </div>

                      {/* Title & Story */}
                      <div className="space-y-1">
                        <h4 className="font-bold text-[#050505] dark:text-white text-base group-hover:text-[#0866FF] dark:group-hover:text-[#00e599] transition line-clamp-2 leading-snug">
                          {trail.title}
                        </h4>
                        <p className="text-xs text-[#65676B] dark:text-neutral-400 line-clamp-2 leading-relaxed font-normal dark:font-light">
                          &ldquo;{trail.story || trail.description}&rdquo;
                        </p>
                      </div>

                      {/* Vibe Tags */}
                      <div className="flex items-center space-x-1.5 overflow-hidden flex-wrap gap-y-1 pt-1">
                        {(trail.vibeTags && trail.vibeTags.length > 0 ? trail.vibeTags : ['tunis', 'culture', 'sunset']).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] font-semibold text-[#0866FF] dark:text-teal-300 bg-[#E7F3FF] dark:bg-teal-950/40 px-2 py-0.5 rounded-lg border border-[#0866FF]/20 dark:border-teal-500/30"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>

                      {/* Card Footer: Author + Hire + Explore now button */}
                      <div className="pt-3 border-t border-[#E4E6EB] dark:border-neutral-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <img
                            src={trail.authorAvatarUrl || trail.guardian_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                            alt={trail.authorName || trail.guardian_name || 'Curator'}
                            className="w-6 h-6 rounded-full object-cover border border-[#0866FF]/40 dark:border-[#00e599]/40 flex-shrink-0"
                          />
                          <span className="text-xs font-bold text-[#050505] dark:text-white truncate">
                            {trail.authorName || trail.guardian_name}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {/* Hire Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setHireTrail(trail);
                            }}
                            className="px-2.5 py-1.5 rounded-xl border border-[#DBDBDB] dark:border-purple-500/50 hover:border-[#0866FF]/40 dark:hover:border-purple-400 bg-[#EFEFEF] dark:bg-purple-950/40 text-[#050505] dark:text-purple-300 text-[11px] font-bold transition flex items-center space-x-1 cursor-pointer"
                          >
                            <Handshake className="w-3 h-3 text-[#0866FF] dark:text-purple-400" />
                            <span>Hire</span>
                          </button>

                          {/* Explore Now Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTrail(trail);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-[#00e599] dark:hover:bg-[#00c985] text-white dark:text-neutral-950 text-[11px] font-black transition cursor-pointer shadow-sm dark:shadow-md dark:shadow-emerald-500/20 active:scale-95"
                          >
                            <span>Explore now</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Part 3: Vibe Guardians & Local Legends */}
      <div className="space-y-4 pt-4 border-t border-[#DBDBDB] dark:border-neutral-800">
        {/* Master Header Container with World Map Backdrop */}
        <div className="relative rounded-3xl overflow-hidden bg-white dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 p-6 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-2xl space-y-4">
          {/* Subtle World Map Backdrop Effect */}
          <div className="absolute inset-0 opacity-10 dark:opacity-15 pointer-events-none bg-[radial-gradient(#0866FF_1px,transparent_1px)] dark:bg-[radial-gradient(#8b2cf5_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="hidden dark:block absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Avatars Preview: "3 online +12" */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center -space-x-2">
              {guardians.filter(isGuardianFresh).slice(0, 3).map((g, i) => {
                const avatar = (g.avatarUrl && g.avatarUrl.trim()) || (g.avatar_url && g.avatar_url.trim()) || null;
                return avatar ? (
                  <img key={g.id || i} src={avatar} alt={g.name}
                    className="w-8 h-8 rounded-full object-cover border-2 border-white dark:border-neutral-950 ring-1 ring-[#0866FF]/30 dark:ring-purple-500/40" />
                ) : (
                  <span key={g.id || i} aria-label={g.name}
                    className="w-8 h-8 rounded-full flex items-center justify-center bg-[#EFEFEF] dark:bg-neutral-800 border-2 border-white dark:border-neutral-950">
                    <Shield className="w-4 h-4 text-[#65676B] dark:text-neutral-400" />
                  </span>
                );
              })}
              <div className="w-8 h-8 rounded-full bg-[#E7F3FF] dark:bg-purple-900 border-2 border-white dark:border-neutral-950 flex items-center justify-center text-[10px] font-bold text-[#0866FF] dark:text-purple-200">
                +{Math.max(0, guardians.filter(isGuardianFresh).length - 3)}
              </div>
            </div>

            <div className="flex items-center space-x-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
              <span>{guardians.filter(isGuardianFresh).length} Fresh Selfies</span>
            </div>
          </div>

          {/* Verification Badges Stack */}
          <div className="relative z-10 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-[#E7F3FF] dark:bg-purple-950/60 text-[#0866FF] dark:text-purple-300 px-2.5 py-1 rounded-xl border border-[#0866FF]/20 dark:border-purple-500/30 flex items-center space-x-1">
              <Shield className="w-3 h-3 text-[#0866FF] dark:text-purple-400" />
              <span>REAL GUIDES & LOCALS DIRECTORY (D07)</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-500/30 flex items-center space-x-1">
              <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Seven-Day Selfie Freshness</span>
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-500/30 flex items-center space-x-1">
              <Handshake className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>Handshake Integration Pending</span>
            </span>
          </div>

          {/* Title & Subtitle */}
          <div className="relative z-10 space-y-1">
            <h2 className="text-2xl font-black text-[#050505] dark:text-white tracking-tight">
              Vibe Guardians
            </h2>
            <p className="text-xs text-[#262626] dark:text-neutral-300 leading-relaxed font-normal dark:font-light">
              Connect with verified tour guides and friendly locals. Pro Guardians show advance upfront rates; Local Legends offer free hangouts. Registration and selfie renewal are available now. Handshake and rewards integration comes later.
            </p>
          </div>

          {/* Primary Action Buttons: BECOME A GUARDIAN / IN-APP SELFIE & 7D Hidden Badge */}
          <div className="relative z-10 flex items-center space-x-2 pt-1 flex-wrap gap-y-2">
            <button
              onClick={() => openGuardianRegistration()}
              className="px-4 py-3 rounded-2xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-[#8b2cf5] dark:hover:bg-[#7823d6] text-white font-black text-xs uppercase tracking-wider shadow-sm dark:shadow-lg dark:shadow-purple-600/30 transition flex items-center space-x-2 cursor-pointer active:scale-98"
            >
              <Camera className="w-4 h-4" />
              <span>BECOME A GUARDIAN / IN-APP SELFIE</span>
            </button>

            <div className="px-3 py-2.5 rounded-2xl bg-[#EFEFEF] dark:bg-neutral-900 border border-[#DBDBDB] dark:border-amber-500/30 text-[#262626] dark:text-amber-300 text-xs font-bold flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{countExpiredGuardians(guardians)} Hidden (Selfie &gt; 7d)</span>
            </div>
          </div>
        </div>

        {/* Filter Tabs: TOP VIBES, PRO GUIDES, LOCAL LEGENDS */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => setGuardianFilter('top')}
            className={`py-2.5 px-2 rounded-2xl font-black text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
              guardianFilter === 'top'
                ? 'bg-[#E7F3FF] dark:bg-purple-900/60 text-[#0866FF] dark:text-purple-200 border-[#0866FF]/40 dark:border-purple-500 shadow-sm dark:shadow-md dark:shadow-purple-900/20'
                : 'bg-white dark:bg-neutral-900 text-[#65676B] dark:text-neutral-400 border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505] dark:hover:text-white'
            }`}
          >
            <span>⚡ TOP VIBES</span>
          </button>

          <button
            onClick={() => setGuardianFilter('pro')}
            className={`py-2.5 px-2 rounded-2xl font-black text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
              guardianFilter === 'pro'
                ? 'bg-[#E7F3FF] dark:bg-blue-900/60 text-[#0866FF] dark:text-blue-200 border-[#0866FF]/40 dark:border-blue-500 shadow-sm dark:shadow-md dark:shadow-blue-900/20'
                : 'bg-white dark:bg-neutral-900 text-[#65676B] dark:text-neutral-400 border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505] dark:hover:text-white'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#0866FF] dark:text-blue-400" />
            <span>PRO GUIDES</span>
          </button>

          <button
            onClick={() => setGuardianFilter('local')}
            className={`py-2.5 px-2 rounded-2xl font-black text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer border ${
              guardianFilter === 'local'
                ? 'bg-amber-50 dark:bg-amber-900/60 text-amber-700 dark:text-amber-200 border-amber-300 dark:border-amber-500 shadow-sm dark:shadow-md dark:shadow-amber-900/20'
                : 'bg-white dark:bg-neutral-900 text-[#65676B] dark:text-neutral-400 border-[#DBDBDB] dark:border-neutral-800 hover:text-[#050505] dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>LOCAL LEGENDS</span>
          </button>
        </div>

        {guardianFilter === 'local' && (
          <button
            type="button"
            onClick={() => openGuardianRegistration('local')}
            className="w-full rounded-2xl border border-amber-300 dark:border-amber-500/50 bg-amber-50 dark:bg-amber-500/15 px-4 py-3 text-xs font-black text-amber-800 dark:text-amber-200 transition hover:bg-amber-100 dark:hover:bg-amber-500/25 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>{guardians.some(guardian => guardian.id === user?.id && guardian.type === 'local')
              ? 'Renew Local Legend' : 'Create Local Legend'}</span>
          </button>
        )}

        {/* Guardian Profile Cards */}
        {(() => {
          const filtered = guardians.filter(isGuardianFresh).filter(g =>
            guardianFilter === 'pro' ? g.type === 'pro'
              : guardianFilter === 'local' ? g.type === 'local'
                : true
          );

          if (filtered.length === 0) {
            return (
              <div className="rounded-3xl bg-white dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800 p-6 text-center space-y-2 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-none">
                <Shield className="w-8 h-8 text-[#0866FF]/60 dark:text-purple-400/60 mx-auto" />
                <h4 className="font-bold text-sm text-[#050505] dark:text-white">No active guardians found in this category</h4>
                <p className="text-xs text-[#65676B] dark:text-neutral-400">
                  New guardians sync when live in-app selfies are updated.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-3">
              {filtered.map((g) => {
                const isPro = g.type === 'pro';
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGuardian(g)}
                    onKeyDown={event => { if (event.key === 'Enter') setSelectedGuardian(g); }}
                    role="button" tabIndex={0}
                    className="rounded-3xl bg-white dark:bg-neutral-950 border border-[#DBDBDB] dark:border-neutral-800/90 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-2xl space-y-4 hover:border-[#0866FF]/40 dark:hover:border-purple-500/40 transition duration-300 cursor-pointer"
                  >
                    {/* Top Identity Row */}
                    <div className="flex items-start space-x-3.5">
                      {/* Avatar with Live Indicator */}
                      <div className="relative flex-shrink-0">
                        {((g.avatarUrl && g.avatarUrl.trim()) || (g.avatar_url && g.avatar_url.trim())) ? (
                          <img src={(g.avatarUrl && g.avatarUrl.trim()) || (g.avatar_url && g.avatar_url.trim())} alt={g.name}
                            className="w-16 h-16 rounded-2xl object-cover border-2 border-[#DBDBDB] dark:border-neutral-800" />
                        ) : (
                          <span aria-label={g.name} className="w-16 h-16 rounded-2xl bg-[#EFEFEF] dark:bg-neutral-900 border-2 border-[#DBDBDB] dark:border-neutral-800 flex items-center justify-center">
                            <Shield className="w-7 h-7 text-[#65676B] dark:text-neutral-500" />
                          </span>
                        )}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white dark:bg-black/90 border border-emerald-500/50 text-[9px] font-black text-emerald-700 dark:text-emerald-400 flex items-center space-x-1 shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                          <span>SELFIE</span>
                        </div>
                      </div>

                      {/* Info & Badges */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-black text-base text-[#050505] dark:text-white truncate">{g.name}</h3>
                          <Shield className="w-4 h-4 text-[#0866FF] dark:text-blue-400 flex-shrink-0" />
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                            isPro
                              ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
                              : 'bg-[#E7F3FF] dark:bg-teal-500/10 text-[#0866FF] dark:text-teal-300 border-[#0866FF]/20 dark:border-teal-500/30'
                          }`}>
                            {isPro ? 'PRO GUIDE' : 'LOCAL LEGEND'}
                          </span>
                        </div>

                        <p className="text-xs text-[#65676B] dark:text-neutral-400 truncate flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-[#65676B] dark:text-neutral-500 flex-shrink-0" />
                          <span>{g.city || g.district}</span>
                        </p>

                        {/* Pricing & Endorsement Pills */}
                        <div className="flex items-center space-x-2 pt-0.5 flex-wrap gap-y-1">
                          <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 text-xs font-bold flex items-center space-x-1">
                            <span>💰</span>
                            <span>{g.type === 'local' ? 'Free Hangout' : g.pricingType === 'flat' ? `${g.flatRate} flat tour` : `${g.hourlyRate} / hr`}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bio Description Snippet */}
                    <p className="text-xs text-[#262626] dark:text-neutral-300 leading-relaxed font-normal dark:font-light">
                      {g.bio}
                    </p>

                    {/* Offered Vibe Trails Sub-card */}
                    {g.offeredTrailId && trails.some(trail => trail.id === g.offeredTrailId) && (
                      <div className="p-3 rounded-2xl bg-[#FAFAFA] dark:bg-neutral-900 border border-[#DBDBDB] dark:border-neutral-800 space-y-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-[#65676B] dark:text-neutral-400 font-mono">
                          OFFERED VIBE TRAILS (1/5):
                        </span>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#050505] dark:text-white truncate max-w-[200px]">
                            {trails.find(trail => trail.id === g.offeredTrailId)?.title}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const found = trails.find((t) => t.id === g.offeredTrailId);
                              if (found) setSelectedTrail(found);
                            }}
                            className="px-3 py-1 rounded-xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-[#00e599] dark:hover:bg-[#00c985] text-white dark:text-neutral-950 font-black text-[10px] uppercase tracking-wider cursor-pointer"
                          >
                            EXPLORE NOW
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Card Footer: HIRE button + Hire Counter + MESSAGE trigger */}
                    <div className="pt-2 border-t border-[#E4E6EB] dark:border-neutral-800 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <button
                          type="button"
                          disabled title="Hiring will be enabled in the deferred D22 Handshake checkpoint"
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-sm dark:shadow-md dark:shadow-amber-500/20 active:scale-95"
                        >
                          <Handshake className="w-3.5 h-3.5" />
                          <span>HIRE</span>
                        </button>
                        <span className="text-xs font-bold text-[#65676B] dark:text-neutral-400 font-mono">
                          Hiring pending
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled title="Messaging is not wired in this Explore checkpoint"
                        className="px-4 py-2 rounded-xl bg-[#0866FF] hover:bg-[#075CE5] dark:bg-[#8b2cf5] dark:hover:bg-[#7823d6] text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-sm dark:shadow-md dark:shadow-purple-600/20 active:scale-95"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>MESSAGE</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Trail Detail Modal */}
      {selectedTrail && (
        <TrailDetailModal
          trail={selectedTrail}
          onClose={() => setSelectedTrail(null)}
          onCheckInWaypoint={handleWaypointCheckIn}
          onToast={showToast}
          onAdoptTrail={openAdoptEditor}
          onReserveTour={tour => {setSelectedTrail(null);setReservationTour(tour);}}
          onToggleSave={handleSaveTrail}
          isSaved={savedTrailIds.has(selectedTrail.id)}
        />
      )}

      {/* Guardian Detail Modal */}
      {selectedGuardian && (
        <GuardianDetailModal
          guardian={selectedGuardian}
          currentUser={user}
          trails={trails}
          onClose={() => setSelectedGuardian(null)}
          onSelectTrail={(t) => {
            setSelectedGuardian(null);
            setSelectedTrail(t);
          }}
          onLocateMap={handleLocateGuardian}
          onRequireAuth={onRequireAuth}
          onToast={showToast}
          onReserveTour={(tour) => {
            setSelectedGuardian(null);
            setReservationTour(tour);
          }}
          onOpenMessage={(g) => {
            setSelectedGuardian(null);
            setSelectedHireGuardian(g);
          }}
        />
      )}

      {/* Curate Trail Modal */}
      {isCurateOpen && (
        <CurateTrailModal
          user={user}
          availableTrails={trails}
          initialTrail={adoptingTrail}
          initialIsTour={trailSubTab === 'tours' && !adoptingTrail}
          onClose={() => { setIsCurateOpen(false); setAdoptingTrail(null); }}
          onCreated={(newTrail) => {
            setTrails((prev) => [newTrail, ...prev]);
            setAdoptingTrail(null);
            showToast(`Curated trail "${newTrail.title}" is now active in directory!`);
          }}
          onToast={showToast}
          onRequireSignIn={() => onRequireAuth?.()}
        />
      )}

      {/* Live 7-Day In-App Selfie Verification Modal */}
      {isSelfieModalOpen && (
        <LiveSelfieModal
          key={guardianRegistrationType || 'guardian-default'}
          initialGuardianType={guardianRegistrationType}
          user={user}
          onClose={() => setIsSelfieModalOpen(false)}
          onVerified={() => {
            void fetchVibeGuardians().then(setGuardians).catch(error =>
              showToast(error instanceof Error ? error.message : 'Guardian directory refresh failed.')
            );
          }}
          availableTrails={trails.filter(trail => !trail.isTour).map(trail => ({id:trail.id,title:trail.title}))}
          onGuardianSaved={guardian => {
            setGuardians(prev => [guardian, ...prev.filter(g => g.id !== guardian.id)]);
          }}
          onToast={showToast}
        />
      )}

      {reservationTour && <TourReservationModal
        tour={reservationTour}
        onClose={()=>setReservationTour(null)}
        onRequireAuth={()=>onRequireAuth?.()}
        onToast={showToast}
      />}

      {/* Selected Trail -> real fresh Pro Guardian directory, without arbitrary selection */}
      <HireGuardianForTrailModal
        trail={hireTrail}
        guardians={guardians}
        isOpen={Boolean(hireTrail)}
        onClose={() => setHireTrail(null)}
        onSelectGuardian={(guardian) => {
          setSelectedHireTrailContext(hireTrail);
          setHireTrail(null);
          setSelectedHireGuardian(guardian);
        }}
      />

      {/* Hire & Vibe Handshake Proof Modal */}
      {selectedHireGuardian && (
        <HireHandshakeModal
          guardian={selectedHireGuardian}
          trail={selectedHireTrailContext}
          currentUser={user}
          onClose={() => { setSelectedHireGuardian(null); setSelectedHireTrailContext(null); }}
          onSuccess={(gId, newCount) => {
            setGuardians((prev) =>
              prev.map((g) => (g.id === gId ? { ...g, hiresCount: newCount } : g))
            );
          }}
          onToast={showToast}
        />
      )}
    </div>
  );
};

