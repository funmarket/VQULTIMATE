import React, { useEffect, useRef, useState } from 'react';
import {
  Compass, Maximize2, Minimize2, Sparkles, Navigation, Flame,
  MapPin, Shield, Route, Clock, Award, ChevronLeft, ChevronRight,
  AlertCircle, Radio, Plus, Heart, Camera, Handshake, MessageCircle
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

interface ExploreTabProps {
  user?: UserProfile | null;
  onSelectPlace: (place: VibePlace) => void;
  onRequireAuth?: () => void;
}

// Fallback raster dark style if external Carto vector style fails
const FALLBACK_DARK_STYLE: any = {
  version: 8,
  sources: {
    'carto-dark': {
      type: 'raster',
      tiles: [
        'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
        'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors, © CARTO'
    }
  },
  layers: [
    {
      id: 'carto-dark-layer',
      type: 'raster',
      source: 'carto-dark',
      minzoom: 0,
      maxzoom: 20
    }
  ]
};

export const ExploreTab: React.FC<ExploreTabProps> = ({
  user = null,
  onSelectPlace,
  onRequireAuth
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);
  const hasInitiallyCenteredRef = useRef<boolean>(false);
  const [mapReady, setMapReady] = useState(false);

  const trailsScrollRef = useRef<HTMLDivElement>(null);

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
  const [, setLoading] = useState(true);

  const [trailSubTab, setTrailSubTab] = useState<'trails' | 'tours'>('trails');
  const [guardianFilter, setGuardianFilter] = useState<'top' | 'pro' | 'local'>('top');
  const [savedTrailIds, setSavedTrailIds] = useState<Set<string>>(new Set());

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
      showToast('Creating a Local Legend would replace that role.');
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

  // 1. Geolocation acquisition
  useEffect(() => {
    let unwatch: (() => void) | null = null;
    setLocationState({ status: 'requesting', coords: null });

    getDeviceLocation().then((initialState) => {
      setLocationState(initialState);
      if (initialState.coords) {
        prevCoordsRef.current = { lat: initialState.coords.lat, lng: initialState.coords.lng };
      }

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
    fetchActivePromotions().then(list => {
      setActivePromos(Array.isArray(list) ? list : list ? Object.values(list) : []);
    });
  }, []);

  // 2. Data fetching
  useEffect(() => {
    let cancelled = false;
    if (places.length === 0) setLoading(true);

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
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [locationState.coords?.lat, locationState.coords?.lng, selectedCategory, user?.id]);

  // 3. Initialize MapLibre via window.maplibregl with 150ms polling, ResizeObserver, and raster fallback
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let resizeTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const initMap = (): boolean => {
      const maplibregl = (window as any).maplibregl;
      if (!maplibregl || !mapContainer.current || mapInstance.current) return false;

      try {
        const initialCenter: [number, number] = locationState.coords
          ? [locationState.coords.lng, locationState.coords.lat]
          : [10.1815, 36.8065]; // Tunis center fallback

        let usedFallbackStyle = false;
        const map = new maplibregl.Map({
          container: mapContainer.current,
          style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
          center: initialCenter,
          zoom: locationState.coords ? 13.5 : 11,
          pitch: 45,
          bearing: -17,
          attributionControl: false
        });

        // Handle style load failure with reliable raster fallback
        map.on('error', (e: any) => {
          if (!usedFallbackStyle && e && e.error && (e.error.message?.includes('style') || (e.error as any).status === 404 || (e.error as any).status)) {
            usedFallbackStyle = true;
            console.warn('Vector style unavailable, switching to fallback raster dark style.');
            try {
              map.setStyle(FALLBACK_DARK_STYLE);
            } catch {}
          }
        });

        map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

        mapInstance.current = map;
        setMapReady(true);

        // Ensure proper canvas layout sizing
        map.on('load', () => {
          setMapReady(true);
          map.resize();
        });

        // Delayed resize to ensure layout settlement
        resizeTimer = setTimeout(() => {
          if (mapInstance.current) mapInstance.current.resize();
        }, 250);

        if (typeof ResizeObserver !== 'undefined' && mapContainer.current) {
          resizeObserver = new ResizeObserver(() => {
            try {
              mapInstance.current?.resize();
            } catch {}
          });
          resizeObserver.observe(mapContainer.current);
        }

        return true;
      } catch (err) {
        console.error('MapLibre init error:', err);
        return false;
      }
    };

    if (!initMap()) {
      pollTimer = setInterval(() => {
        attempts += 1;
        if (initMap() || attempts >= 30) {
          if (pollTimer) clearInterval(pollTimer);
        }
      }, 150);
    }

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (resizeTimer) clearTimeout(resizeTimer);
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Trigger resize whenever fullscreen is toggled
  useEffect(() => {
    if (mapInstance.current) {
      setTimeout(() => mapInstance.current?.resize(), 250);
    }
  }, [isFullScreen]);

  // 4. Center map once device coordinates resolve
  useEffect(() => {
    if (
      !hasInitiallyCenteredRef.current &&
      locationState.status === 'granted' &&
      locationState.coords &&
      mapInstance.current &&
      mapReady
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
        console.warn('Center flyTo error:', err);
      }
    }
  }, [locationState.status, locationState.coords, mapReady]);

  // 5. Update user and place markers
  useEffect(() => {
    const maplibregl = (window as any).maplibregl;
    const map = mapInstance.current;
    if (!map || !mapReady || !maplibregl) return;

    markersRef.current.forEach((m) => {
      try { m.remove(); } catch {}
    });
    markersRef.current = [];

    // User location beacon
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

    // Place markers
    places.forEach((place) => {
      if (!place.lng || !place.lat || isNaN(place.lng) || isNaN(place.lat)) return;

      const orbEl = document.createElement('div');
      orbEl.className = 'cursor-pointer group flex flex-col items-center select-none';

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

      const rewardBadge = place.is_promoted && place.vq_reward
        ? `<span class="text-amber-300 font-bold">+${place.vq_reward} PTS</span>`
        : `<span class="text-amber-400/90 font-medium text-[9px]">📍 Spot</span>`;

      orbEl.innerHTML = `
        <div class="px-2.5 py-1 rounded-xl bg-gradient-to-br ${orbBg} backdrop-blur-md border ${orbBorder} text-[10px] font-bold text-white shadow-xl flex items-center space-x-1.5 transition-transform duration-300 group-hover:scale-110" style="box-shadow: 0 4px 14px ${orbGlow}">
          <span class="w-2 h-2 rounded-full ${dotBg} animate-pulse"></span>
          <span class="truncate max-w-[110px]">${place.title}</span>
          ${rewardBadge}
        </div>
        <div class="w-3.5 h-3.5 rounded-full ${dotBg} ring-4 ring-white/20 mt-1 shadow-lg transition-transform group-hover:scale-125"></div>
      `;

      orbEl.onclick = (e) => {
        e.stopPropagation();
        onSelectPlace(place);
      };

      const marker = new maplibregl.Marker({ element: orbEl, anchor: 'bottom' })
        .setLngLat([place.lng, place.lat])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [places, locationState.coords, mapReady]);

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
      showToast(saved.savedBy?.includes(user.id) ? 'Trail saved.' : 'Trail removed from bookmarks.');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Could not save Trail.');
    }
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
        showToast('Centered on current location.');
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
        mapInstance.current?.flyTo({
          center: [res.coords.lng, res.coords.lat],
          zoom: 14,
          pitch: 45,
          bearing: -17,
          essential: true
        });
        showToast(`GPS Calibrated: ${res.coords.lat.toFixed(4)}, ${res.coords.lng.toFixed(4)}`);
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

  const handleLocateGuardian = (g: VibeGuardian) => {
    setSelectedGuardian(null);
    if (g.lng && g.lat && mapInstance.current) {
      mapInstance.current.flyTo({
        center: [g.lng, g.lat],
        zoom: 15.5,
        pitch: 50,
        essential: true
      });
    }
    showToast(g.lng !== undefined && g.lat !== undefined ? `Located ${g.name} on the map.` : 'Location unavailable for this guardian.');
  };

  const handleWaypointCheckIn = (wp: TrailWaypoint, trail: CulturalTrail) => {
    showToast(`Opened waypoint "${wp.title || wp.name}" on ${trail.title}.`);
  };

  return (
    <div className={`space-y-6 pb-24 text-white transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-neutral-950 p-4 overflow-y-auto' : ''}`}>
      {exploreToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 border border-teal-500/50 text-teal-300 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn pointer-events-none">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{exploreToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center space-x-2">
            <Compass className="w-6 h-6 text-orange-400 animate-spin-slow" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-orange-300">
              Vibe Orbit
            </span>
          </h1>
          <p className="text-xs text-neutral-400">23km : trust your instincts</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRecenterUser}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition text-cyan-400 flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
            title="Recenter on My Location"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">My Location</span>
          </button>
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition text-teal-400 flex items-center space-x-1.5 text-xs font-semibold cursor-pointer"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span>{isFullScreen ? 'Collapse' : 'Expand Orbit'}</span>
          </button>
        </div>
      </div>

      <VibeFlashBoard userCoords={locationState.coords ? { lat: locationState.coords.lat, lng: locationState.coords.lng } : undefined} onToast={showToast} />

      {locationState.status === 'denied' && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>Location permission was denied. Please allow browser location access.</span>
          </div>
          <button
            onClick={handleManualCalibrate}
            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs whitespace-nowrap ml-2 cursor-pointer"
          >
            Retry GPS
          </button>
        </div>
      )}

      {/* Category Filter Chips */}
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
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg shadow-orange-500/30 border border-orange-400/50'
                : 'bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* MapLibre Canvas Container */}
      <div className={`relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl ${isFullScreen ? 'h-[70vh]' : 'h-[380px]'}`}>
        <div ref={mapContainer} className="absolute inset-0 w-full h-full min-h-[380px]" style={{ minHeight: '380px' }} />

        {/* Radar concentric ring overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="absolute w-[320px] h-[320px] rounded-full border border-purple-500/20 animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute w-56 h-56 rounded-full border border-teal-500/25" />
          <div className="absolute w-36 h-36 rounded-full border border-orange-500/30 animate-pulse" style={{ animationDuration: '3s' }} />

          <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none opacity-80">
            <span className="text-[9px] uppercase tracking-[0.25em] text-amber-200/90 font-bold">
              ✦ VIBE ORBIT ✦
            </span>
            <span className="text-[7.5px] uppercase tracking-[0.18em] text-neutral-400 font-medium mt-0.5">
              CULTURAL DISCOVERY RADAR
            </span>
            <span className="text-[7px] text-teal-400/80 font-mono mt-0.5">
              23 KM SCOPE
            </span>
          </div>
        </div>

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-3 left-3 right-3 bg-neutral-950/85 backdrop-blur-xl border border-neutral-800 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${locationState.status === 'granted' ? 'bg-cyan-400 animate-pulse' : 'bg-neutral-500'}`} />
            <span className="font-bold text-white">
              {locationState.status === 'granted' && locationState.coords
                ? `GPS Active: ${locationState.coords.lat.toFixed(4)}, ${locationState.coords.lng.toFixed(4)}`
                : locationState.status === 'requesting'
                ? 'Acquiring GPS Signal...'
                : 'GPS Offline'}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 font-medium">
            {places.length} Places in 23 km
          </span>
        </div>
      </div>

      <div className="text-[10px] text-neutral-500 flex flex-wrap justify-end gap-x-1 px-2 -mt-4" aria-label="Map attribution">
        <span>MapLibre |</span>
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">© OpenStreetMap</a>
        <span>©</span>
        <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" className="underline hover:text-neutral-300">CARTO</a>
      </div>

      {/* Nearby Vibe Waypoints Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center space-x-2">
            <Flame className="w-4 h-4 text-orange-400" />
            <span>Nearby Vibe Waypoints (23 km Scope: {places.length})</span>
          </h3>
          {locationState.coords && (
            <span className="text-[11px] text-teal-400 font-mono">
              Radius: 23,000 m
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
                const promo = activePromos.find(p => p.place_id === place.id && p.status === 'active' && p.remaining_vq_pool > 0);
                const isPromoted = Boolean(place.is_promoted || (promo && promo.remaining_vq_pool > 0));
                const vqReward = promo ? promo.reward_per_checkin : place.vq_reward;

                return (
                  <div
                    key={place.id}
                    onClick={() => onSelectPlace(place)}
                    className="rounded-3xl bg-neutral-900 border border-neutral-800 hover:border-cyan-500/40 transition cursor-pointer p-4 sm:p-5 flex flex-col space-y-4 group shadow-xl relative"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/60 border border-teal-500/30 px-2.5 py-0.5 rounded">
                          {place.category || 'SPOTS'}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded">
                          {tier}
                        </span>
                        <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2.5 py-0.5 rounded flex items-center space-x-1">
                          <span>✨</span>
                          <span>{matchScore}% MATCH</span>
                        </span>
                      </div>
                      <h4 className="font-black text-lg sm:text-xl text-white tracking-tight leading-snug">
                        {place.title}
                      </h4>
                    </div>

                    <div className="relative w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-lg">
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

                    <div className="text-xs text-neutral-300 flex items-center space-x-1.5">
                      <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <span>{place.address}</span>
                    </div>

                    <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="font-semibold text-teal-300">
                        {place.distance_km !== undefined ? `${place.distance_km} km` : 'Nearby'}
                        {googleReviewsCount !== undefined ? ` • ${googleReviewsCount} reviews` : ''}
                        {appCheckinsCount !== undefined ? ` • ${appCheckinsCount} check-ins` : ''}
                      </span>
                      <div className="flex items-center space-x-2">
                        {isPromoted && vqReward ? (
                          <span className="px-3.5 py-2 rounded-xl bg-teal-950/60 text-emerald-400 border border-teal-500/30 text-xs font-bold shadow flex items-center space-x-1">
                            <span>🚀</span>
                            <span>+{vqReward} PTS</span>
                          </span>
                        ) : (
                          <span className="px-3.5 py-2 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-500/30 text-xs font-bold shadow flex items-center space-x-1">
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
                className="w-full py-3.5 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-teal-300 hover:text-white font-bold text-xs tracking-wider transition cursor-pointer shadow-lg flex items-center justify-center space-x-2"
              >
                <span>Load More</span>
                <span className="text-[10px] text-neutral-400">({places.length - visibleWaypointsCount} remaining)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-2">
            <Compass className="w-8 h-8 text-orange-400/60 mx-auto" />
            <h4 className="font-bold text-sm text-white">No cultural waypoints within 23 km</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {locationState.coords
                ? `No certified places found in your 23 km discovery orbit (${locationState.coords.lat.toFixed(4)}, ${locationState.coords.lng.toFixed(4)}).`
                : 'Awaiting device location coordinates to scan.'}
            </p>
          </div>
        )}
      </div>

      {/* Community Curations: Cultural Vibes Trails */}
      <div className="space-y-4 pt-4 border-t border-neutral-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#00e599] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-[#00e599] font-mono">
              COMMUNITY CURATIONS - LOCAL KNOWLEDGE
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cultural Vibes Trails
            </h2>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleScrollTrails('left')}
                className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScrollTrails('right')}
                className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Control Bar: Sub-tabs & Curate */}
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTrailSubTab('trails')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer border ${
                trailSubTab === 'trails'
                  ? 'bg-neutral-900 text-[#00e599] border-[#00e599]/60 shadow-lg shadow-[#00e599]/10'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Vibe Trails</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                trailSubTab === 'trails' ? 'bg-[#00e599]/20 text-[#00e599]' : 'bg-neutral-800 text-neutral-400'
              }`}>
                {trails.filter((t) => !t.isTour).length}
              </span>
            </button>

            <button
              onClick={() => setTrailSubTab('tours')}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition flex items-center space-x-2 cursor-pointer border ${
                trailSubTab === 'tours'
                  ? 'bg-neutral-900 text-amber-300 border-amber-500/60 shadow-lg shadow-amber-500/10'
                  : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Vibe Tours</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                trailSubTab === 'tours' ? 'bg-amber-500/20 text-amber-300' : 'bg-neutral-800 text-neutral-400'
              }`}>
                {trails.filter((t) => t.isTour).length}
              </span>
            </button>
          </div>

          <button
            onClick={() => setIsCurateOpen(true)}
            className="px-4 py-2 rounded-2xl bg-neutral-900 border border-[#00e599]/40 hover:border-[#00e599] text-[#00e599] font-black text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md flex-shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Curate Trail</span>
          </button>
        </div>

        {/* Trails Horizontal Carousel */}
        {(() => {
          const displayedTrails = trailSubTab === 'tours'
            ? trails.filter((t) => t.isTour)
            : trails.filter((t) => !t.isTour);

          if (displayedTrails.length === 0) {
            return (
              <div className="rounded-3xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-2">
                <Compass className="w-8 h-8 text-[#00e599]/60 mx-auto" />
                <h4 className="font-bold text-sm text-white">No {trailSubTab === 'tours' ? 'Vibe Tours' : 'Vibe Trails'} available</h4>
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
                    className="w-[min(300px,calc(100vw-2rem))] sm:w-[330px] flex-shrink-0 snap-start rounded-3xl bg-neutral-950 border border-neutral-800/90 hover:border-[#00e599]/60 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between group shadow-2xl relative"
                  >
                    <div className="relative h-44 w-full overflow-hidden bg-neutral-900">
                      <img
                        src={trail.imageUrl || trail.image_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80'}
                        alt={trail.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/20 to-neutral-950/70" />

                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-black/70 text-pink-400 px-2.5 py-1 rounded-full border border-pink-500/30 backdrop-blur-md">
                          📍 {trail.category || 'CIRCUIT'}
                        </span>
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

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <h4 className="font-bold text-white text-base group-hover:text-[#00e599] transition line-clamp-2 leading-snug">
                        {trail.title}
                      </h4>
                      <p className="text-xs text-neutral-400 line-clamp-2 font-light">
                        {trail.story || trail.description}
                      </p>

                      <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <img
                            src={trail.authorAvatarUrl || trail.guardian_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                            alt="Curator"
                            className="w-6 h-6 rounded-full object-cover border border-[#00e599]/40 flex-shrink-0"
                          />
                          <span className="text-xs font-bold text-white truncate">
                            {trail.authorName || trail.guardian_name}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTrail(trail);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-[#00e599] hover:bg-[#00c985] text-neutral-950 text-[11px] font-black transition cursor-pointer shadow-md shadow-emerald-500/20 active:scale-95"
                        >
                          Explore now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {/* Modals */}
      {selectedTrail && (
        <TrailDetailModal
          trail={selectedTrail}
          onClose={() => setSelectedTrail(null)}
          onCheckInWaypoint={handleWaypointCheckIn}
          onToast={showToast}
          onAdoptTrail={(source) => {
            setSelectedTrail(null);
            setAdoptingTrail(source);
            setIsCurateOpen(true);
          }}
          onReserveTour={(tour) => {
            setSelectedTrail(null);
            setReservationTour(tour);
          }}
          onToggleSave={handleSaveTrail}
          isSaved={savedTrailIds.has(selectedTrail.id)}
        />
      )}

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
            showToast(`Curated trail "${newTrail.title}" is now active!`);
          }}
          onToast={showToast}
          onRequireSignIn={() => onRequireAuth?.()}
        />
      )}

      {guardianFilter === 'local' && (
        <button
          type="button"
          onClick={() => openGuardianRegistration('local')}
          className="w-full rounded-2xl border border-amber-500/50 bg-amber-500/15 px-4 py-3 text-xs font-black text-amber-200 transition hover:bg-amber-500/25 flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>{guardians.some(guardian => guardian.id === user?.id && guardian.type === 'local')
            ? 'Renew Local Legend' : 'Create Local Legend'}</span>
        </button>
      )}

      {isSelfieModalOpen && (
        <LiveSelfieModal
          key={guardianRegistrationType || 'guardian-default'}
          initialGuardianType={guardianRegistrationType}
          user={user}
          onClose={() => setIsSelfieModalOpen(false)}
          onVerified={() => {
            fetchVibeGuardians().then(setGuardians);
          }}
          availableTrails={trails.filter(trail => !trail.isTour).map(trail => ({ id: trail.id, title: trail.title }))}
          onGuardianSaved={(guardian) => {
            setGuardians(prev => [guardian, ...prev.filter(g => g.id !== guardian.id)]);
          }}
          onToast={showToast}
        />
      )}

      {reservationTour && (
        <TourReservationModal
          tour={reservationTour}
          onClose={() => setReservationTour(null)}
          onRequireAuth={() => onRequireAuth?.()}
          onToast={showToast}
        />
      )}

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
