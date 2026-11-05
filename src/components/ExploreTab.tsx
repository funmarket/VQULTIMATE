import React, { useEffect, useRef, useState } from 'react';
import {
  Compass, Maximize2, Minimize2, Sparkles, Navigation, Flame,
  MapPin, Shield, Route, Clock, Award, ChevronLeft, ChevronRight,
  AlertCircle, RefreshCw, Radio
} from 'lucide-react';
import {
  fetchNearbyVibePlaces,
  getDeviceLocation,
  watchDeviceLocation,
  VibePlace,
  VibeCategory,
  DeviceLocationState,
  DISCOVERY_RADIUS_METERS
} from '../domains/d03_vibe_orbit';
import { fetchCulturalTrails, fetchVibeGuardians, CulturalTrail, VibeGuardian, TrailWaypoint } from '../domains/d07_trails';
import { UserProfile } from '../domains/d01_auth';
import { TrailDetailModal } from './TrailDetailModal';
import { GuardianDetailModal } from './GuardianDetailModal';

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
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userMarkerRef = useRef<any>(null);

  const trailsScrollRef = useRef<HTMLDivElement>(null);
  const guardiansScrollRef = useRef<HTMLDivElement>(null);

  // Real Geolocation State (Zero hardcoded Dubai)
  const [locationState, setLocationState] = useState<DeviceLocationState>({
    status: 'requesting',
    coords: null
  });

  const [places, setPlaces] = useState<VibePlace[]>([]);
  const [trails, setTrails] = useState<CulturalTrail[]>([]);
  const [guardians, setGuardians] = useState<VibeGuardian[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<VibeCategory | 'All'>('All');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Active Modals & Toast State
  const [selectedTrail, setSelectedTrail] = useState<CulturalTrail | null>(null);
  const [selectedGuardian, setSelectedGuardian] = useState<VibeGuardian | null>(null);
  const [exploreToast, setExploreToast] = useState<string | null>(null);

  const categories: (VibeCategory | 'All')[] = ['All', 'Food', 'Art', 'Spots', 'Culture', 'Night Owl'];

  const showToast = (msg: string) => {
    setExploreToast(msg);
    setTimeout(() => {
      setExploreToast(null);
    }, 3500);
  };

  // 1. Acquire real device location via watchPosition / getCurrentPosition
  useEffect(() => {
    let unwatch: (() => void) | null = null;

    setLocationState({ status: 'requesting', coords: null });

    getDeviceLocation().then((initialState) => {
      setLocationState(initialState);

      // Start continuous GPS watch
      unwatch = watchDeviceLocation((updatedState) => {
        setLocationState(updatedState);
      });
    });

    return () => {
      if (unwatch) unwatch();
    };
  }, []);

  // 2. Query real places within 23 km based on acquired device coordinates
  useEffect(() => {
    setLoading(true);

    Promise.all([
      fetchNearbyVibePlaces(locationState.coords, selectedCategory),
      fetchCulturalTrails(),
      fetchVibeGuardians()
    ]).then(([placesData, trailsData, guardiansData]) => {
      setPlaces(placesData);
      setTrails(trailsData);
      setGuardians(guardiansData);
      setLoading(false);
    });
  }, [locationState.coords?.lat, locationState.coords?.lng, selectedCategory]);

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
      const initialCenter: [number, number] = locationState.coords
        ? [locationState.coords.lng, locationState.coords.lat]
        : [0, 20];
      const initialZoom = locationState.coords ? 13 : 2;

      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: initialCenter,
        zoom: initialZoom,
        pitch: locationState.coords ? 45 : 0,
        bearing: -17
      });

      map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      mapInstance.current = map;
    } catch (err) {
      console.warn('MapLibre init error:', err);
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // 4. Recenter MapLibre on real device coordinates once received
  useEffect(() => {
    if (locationState.status === 'granted' && locationState.coords && mapInstance.current) {
      try {
        mapInstance.current.flyTo({
          center: [locationState.coords.lng, locationState.coords.lat],
          zoom: 13.5,
          pitch: 45,
          bearing: -17,
          essential: true
        });
      } catch (err) {
        console.warn('Error recentering map on user location:', err);
      }
    }
  }, [locationState.status, locationState.coords?.lat, locationState.coords?.lng]);

  // 5. Update MapLibre markers: User location beacon + Cultural orbs colored by category
  useEffect(() => {
    const map = mapInstance.current;
    const maplibregl = (window as any).maplibregl;
    if (!map || !maplibregl) return;

    // Remove previous place markers
    markersRef.current.forEach((m) => m.remove());
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

    // Add cultural orb markers for places within 23 km
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

      orbEl.innerHTML = `
        <div class="px-2.5 py-1 rounded-xl bg-gradient-to-br ${orbBg} backdrop-blur-md border ${orbBorder} text-[10px] font-bold text-white shadow-xl flex items-center space-x-1.5 transition-transform duration-300 group-hover:scale-110" style="box-shadow: 0 4px 14px ${orbGlow}">
          <span class="w-2 h-2 rounded-full ${dotBg} animate-pulse"></span>
          <span class="truncate max-w-[110px]">${place.title}</span>
          <span class="text-amber-300 font-bold">+${place.vq_reward}</span>
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

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [places, locationState.coords]);

  const handleManualCalibrate = () => {
    setLocationState({ status: 'requesting', coords: null });
    getDeviceLocation().then((res) => {
      setLocationState(res);
      if (res.status === 'granted' && res.coords) {
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

  const handleStartTrailNav = (trail: CulturalTrail) => {
    setSelectedTrail(null);
    if (trail.waypoints && trail.waypoints.length > 0 && mapInstance.current) {
      const wp = trail.waypoints[0];
      try {
        mapInstance.current.flyTo({
          center: [wp.lng, wp.lat],
          zoom: 16,
          pitch: 55,
          bearing: -20,
          essential: true
        });
      } catch (err) {
        console.warn('Map fly error:', err);
      }
    }
    showToast(`Radar navigation initiated for "${trail.title}"! Approaching Stop 1.`);
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
    showToast(`Radar locked onto ${g.name}'s jurisdiction (${g.district}).`);
  };

  const handleWaypointCheckIn = (wp: TrailWaypoint, trail: CulturalTrail) => {
    showToast(`Waypoint Verified: "${wp.title}" (+${wp.vq_reward} VQ awarded to your purse)!`);
  };

  return (
    <div className={`space-y-6 pb-24 text-white transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-neutral-950 p-4 overflow-y-auto' : ''}`}>
      {/* Toast Notification */}
      {exploreToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-neutral-900/95 border border-teal-500/50 text-teal-300 px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold flex items-center space-x-2 animate-fadeIn pointer-events-none">
          <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
          <span>{exploreToast}</span>
        </div>
      )}

      {/* Header & Fullscreen Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center space-x-2">
            <Compass className="w-6 h-6 text-orange-400 animate-spin-slow" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-orange-300">
              Vibe Orbit & Discovery Pulse
            </span>
          </h1>
          <p className="text-xs text-neutral-400">23 km real device location radar & organic concentric rings</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleManualCalibrate}
            className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition text-orange-400 flex items-center space-x-1 text-xs font-semibold cursor-pointer"
            title="Calibrate Real GPS"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${locationState.status === 'requesting' ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Calibrate GPS</span>
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

      {/* Geolocation Status / Permission Warning Banner */}
      {locationState.status === 'denied' && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
            <span>Location permission was denied. Please allow browser location access to scan the 23 km discovery orbit around your device.</span>
          </div>
          <button
            onClick={handleManualCalibrate}
            className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-xs whitespace-nowrap ml-2 cursor-pointer"
          >
            Retry GPS
          </button>
        </div>
      )}

      {locationState.status === 'unavailable' && (
        <div className="p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-4 h-4 flex-shrink-0 text-neutral-500" />
            <span>GPS sensor is unavailable or timed out. Re-calibrating radar...</span>
          </div>
          <button
            onClick={handleManualCalibrate}
            className="px-3 py-1 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold text-xs whitespace-nowrap ml-2 cursor-pointer"
          >
            Calibrate GPS
          </button>
        </div>
      )}

      {/* Category Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
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

      {/* Vibe Orbit Radar Container / Map View */}
      <div className={`relative rounded-3xl overflow-hidden border border-neutral-800 bg-neutral-900 shadow-2xl ${isFullScreen ? 'h-[70vh]' : 'h-[380px]'}`}>
        {/* MapLibre Container (Real device coordinates center) */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {/* Soft Organic Concentric Rings Visual Overlay (Matches Reference 0DvcX_6bc6cde4.jpg) */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          {/* Outer ring */}
          <div className="absolute w-[320px] h-[320px] rounded-full border border-purple-500/20 animate-pulse" style={{ animationDuration: '6s' }} />
          {/* Middle ring */}
          <div className="absolute w-56 h-56 rounded-full border border-teal-500/25" />
          {/* Inner ring */}
          <div className="absolute w-36 h-36 rounded-full border border-orange-500/30 animate-pulse" style={{ animationDuration: '3s' }} />

          {/* Central Compass Rose Emblem */}
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

        {/* Bottom Legend Overlay with Real Device Coordinates */}
        <div className="absolute bottom-3 left-3 right-3 bg-neutral-950/85 backdrop-blur-xl border border-neutral-800 rounded-2xl p-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${locationState.status === 'granted' ? 'bg-cyan-400 animate-pulse' : 'bg-neutral-500'}`} />
            <span className="font-bold text-white">
              {locationState.status === 'granted' && locationState.coords
                ? `GPS Active: ${locationState.coords.lat.toFixed(4)}, ${locationState.coords.lng.toFixed(4)}`
                : locationState.status === 'requesting'
                ? 'Acquiring GPS Signal...'
                : 'GPS Offline (Tap Calibrate)'}
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 font-medium">
            {places.length} Places in 23 km
          </span>
        </div>
      </div>

      {/* Nearby Vibe Waypoints (23 km Discovery Scope) */}
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {places.map((place) => (
              <div
                key={place.id}
                onClick={() => onSelectPlace(place)}
                className="rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 transition cursor-pointer p-4 flex space-x-4 items-center group shadow-md"
              >
                <img
                  src={place.image_url || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'}
                  alt={place.title}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0 group-hover:scale-105 transition duration-300"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded">
                      {place.category}
                    </span>
                    <span className="text-xs font-bold text-amber-300">+{place.vq_reward} VQ</span>
                  </div>
                  <h4 className="font-bold text-sm text-white truncate">{place.title}</h4>
                  <p className="text-xs text-neutral-400 truncate">{place.address}</p>
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                    <span className="flex items-center space-x-1 text-teal-300 font-medium">
                      <MapPin className="w-3 h-3 text-orange-400" />
                      <span>{place.distance_km !== undefined ? `${place.distance_km} km away` : 'Within 23 km'}</span>
                    </span>
                    <span>Pulse: {place.pulse_intensity}/10</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-6 text-center space-y-2">
            <Compass className="w-8 h-8 text-orange-400/60 mx-auto" />
            <h4 className="font-bold text-sm text-white">No cultural waypoints within 23 km</h4>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              {locationState.coords
                ? `No certified places or secrets were returned in your 23 km discovery orbit (${locationState.coords.lat.toFixed(4)}, ${locationState.coords.lng.toFixed(4)}). Zero mock fallback is active.`
                : 'Awaiting device location coordinates to scan for nearby cultural waypoints.'}
            </p>
          </div>
        )}
      </div>

      {/* Curated Cultural Vibe Trails (Horizontally Scrollable & Clickable) */}
      <div className="space-y-3 pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <Route className="w-4 h-4 text-teal-400" />
              <span>Curated Cultural Vibe Trails</span>
            </h3>
            <p className="text-[11px] text-neutral-400">Sequential historical waypoints & certified expeditions</p>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-neutral-400 font-semibold">{trails.length} Trails</span>
            <div className="flex items-center space-x-1 pl-1">
              <button
                onClick={() => handleScrollTrails('left')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScrollTrails('right')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll trails right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {trails.length > 0 ? (
          <div
            ref={trailsScrollRef}
            className="flex space-x-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
          >
            {trails.map((trail) => (
              <div
                key={trail.id}
                onClick={() => setSelectedTrail(trail)}
                className="w-[280px] sm:w-[320px] flex-shrink-0 snap-start rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-teal-500/50 transition cursor-pointer overflow-hidden flex flex-col justify-between group shadow-xl"
              >
                {/* Trail Cover Image */}
                <div className="relative h-36 w-full overflow-hidden">
                  <img
                    src={trail.image_url}
                    alt={trail.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-neutral-900/30 to-transparent" />

                  {/* Badges on Image */}
                  <div className="absolute top-2.5 left-2.5 flex items-center space-x-1.5">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border backdrop-blur-md ${
                        trail.difficulty === 'Easy'
                          ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/40'
                          : trail.difficulty === 'Moderate'
                          ? 'bg-orange-500/30 text-orange-300 border-orange-500/40'
                          : 'bg-purple-500/30 text-purple-300 border-purple-500/40'
                      }`}
                    >
                      {trail.difficulty}
                    </span>
                    {trail.category && (
                      <span className="text-[10px] font-semibold text-neutral-300 bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-md border border-white/10">
                        {trail.category}
                      </span>
                    )}
                  </div>

                  <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-xs">
                    <span className="flex items-center space-x-1 text-neutral-300 font-medium bg-black/60 px-2 py-0.5 rounded-lg backdrop-blur-md text-[11px]">
                      <Clock className="w-3 h-3 text-orange-400" />
                      <span>{trail.duration_mins} mins</span>
                    </span>
                    <span className="text-xs font-bold text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/40 backdrop-blur-md">
                      +{trail.vq_reward} VQ
                    </span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <h4 className="font-bold text-white text-base group-hover:text-amber-300 transition line-clamp-1">
                      {trail.title}
                    </h4>
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {trail.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <img
                        src={trail.guardian_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                        alt={trail.guardian_name}
                        className="w-6 h-6 rounded-full object-cover border border-orange-500/40"
                      />
                      <span className="text-[11px] text-neutral-300 font-medium truncate max-w-[120px]">
                        {trail.guardian_name}
                      </span>
                    </div>
                    <span className="text-[11px] text-teal-400 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition">
                      <span>Explore</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-5 text-center space-y-2">
            <Award className="w-8 h-8 text-amber-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No cultural trails published yet</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              Certified pathfinders and guardians are mapping the next historical trail.
            </p>
          </div>
        )}
      </div>

      {/* District Vibe Guardians (Horizontally Scrollable, Rich & Clickable) */}
      <div className="space-y-3 pt-4 border-t border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center space-x-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <span>District Vibe Guardians</span>
            </h3>
            <p className="text-[11px] text-neutral-400">Verified cultural stewards & local sentinels</p>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-neutral-400 font-semibold">{guardians.length} On Duty</span>
            <div className="flex items-center space-x-1 pl-1">
              <button
                onClick={() => handleScrollGuardians('left')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll guardians left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScrollGuardians('right')}
                className="p-1 rounded-lg bg-neutral-900 border border-neutral-800 text-teal-400 hover:bg-neutral-800 cursor-pointer"
                aria-label="Scroll guardians right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {guardians.length > 0 ? (
          <div
            ref={guardiansScrollRef}
            className="flex space-x-4 overflow-x-auto pb-3 pt-1 scrollbar-none snap-x snap-mandatory scroll-smooth"
          >
            {guardians.map((guardian) => (
              <div
                key={guardian.id}
                onClick={() => setSelectedGuardian(guardian)}
                className="w-[240px] sm:w-[260px] flex-shrink-0 snap-start rounded-2xl bg-neutral-900/90 border border-neutral-800 hover:border-orange-500/50 transition cursor-pointer p-4 flex flex-col justify-between group shadow-xl"
              >
                {/* Header row with Status and Trust */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{guardian.status === 'patrolling' ? 'PATROL' : 'ON DUTY'}</span>
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center space-x-1">
                    <Award className="w-3 h-3 text-amber-400" />
                    <span>Trust {guardian.trust_score}%</span>
                  </span>
                </div>

                {/* Guardian Avatar & Identity */}
                <div className="flex flex-col items-center text-center my-3 space-y-2">
                  <div className="relative">
                    <img
                      src={guardian.avatar_url}
                      alt={guardian.name}
                      className="w-16 h-16 rounded-full object-cover ring-2 ring-orange-500/50 group-hover:scale-105 group-hover:ring-orange-400 transition duration-300"
                    />
                    <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-neutral-950 border border-teal-500/40">
                      <Shield className="w-3 h-3 text-teal-400" />
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-white group-hover:text-amber-300 transition truncate max-w-[200px]">
                      {guardian.name}
                    </h4>
                    <p className="text-xs text-teal-400 font-mono">{guardian.handle}</p>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400 bg-neutral-950 px-2.5 py-0.5 rounded-lg border border-neutral-800 truncate max-w-[200px]">
                    {guardian.tier || 'PRO GUARDIAN'}
                  </span>
                </div>

                {/* Bio / Specialty Snippet */}
                <p className="text-[11px] text-neutral-400 line-clamp-2 text-center italic mb-3">
                  &ldquo;{guardian.bio}&rdquo;
                </p>

                {/* Footer with District and Click indicator */}
                <div className="pt-2.5 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-neutral-400 truncate max-w-[120px] flex items-center space-x-1">
                    <MapPin className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span className="truncate">{guardian.district}</span>
                  </span>
                  <span className="text-teal-400 font-bold flex items-center space-x-0.5 group-hover:translate-x-0.5 transition">
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-neutral-900/60 border border-neutral-800/80 p-5 text-center space-y-2">
            <Shield className="w-8 h-8 text-orange-400/60 mx-auto" />
            <h4 className="font-bold text-xs text-white">No district guardians on shift</h4>
            <p className="text-[11px] text-neutral-400 max-w-xs mx-auto">
              District guardian rotation active. New sentinels sync when verified in Supabase.
            </p>
          </div>
        )}
      </div>

      {/* Trail Detail Modal */}
      {selectedTrail && (
        <TrailDetailModal
          trail={selectedTrail}
          onClose={() => setSelectedTrail(null)}
          onStartNavigation={handleStartTrailNav}
          onCheckInWaypoint={handleWaypointCheckIn}
          onToast={showToast}
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
        />
      )}
    </div>
  );
};
