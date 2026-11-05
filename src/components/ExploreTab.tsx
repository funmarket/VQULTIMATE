import React, { useEffect, useRef, useState } from 'react';
import { Compass, Maximize2, Minimize2, Sparkles, Filter, Navigation, Flame, MapPin } from 'lucide-react';
import { fetchVibePlaces, VibePlace, VibeCategory } from '../domains/d03_vibe_orbit';

interface ExploreTabProps {
  onSelectPlace: (place: VibePlace) => void;
}

export const ExploreTab: React.FC<ExploreTabProps> = ({ onSelectPlace }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const [places, setPlaces] = useState<VibePlace[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<VibeCategory | 'All'>('All');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [loading, setLoading] = useState(true);

  const categories: (VibeCategory | 'All')[] = ['All', 'Food', 'Art', 'Spots', 'Culture', 'Night Owl'];

  useEffect(() => {
    fetchVibePlaces(selectedCategory === 'All' ? undefined : selectedCategory).then((data) => {
      setPlaces(data);
      setLoading(false);
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapInstance.current) return; // initialize once

    const maplibregl = (window as any).maplibregl;
    if (!maplibregl) {
      console.warn('MapLibre GL CDN not loaded yet');
      return;
    }

    try {
      const map = new maplibregl.Map({
        container: mapContainer.current,
        style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
        center: [55.2708, 25.2048], // Dubai coordinates anchor
        zoom: 13,
        pitch: 45,
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

  return (
    <div className={`space-y-4 pb-24 text-white transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-neutral-950 p-4 overflow-y-auto' : ''}`}>
      {/* Header & Fullscreen Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center space-x-2">
            <Compass className="w-6 h-6 text-orange-400 animate-spin-slow" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-neutral-200 to-orange-300">
              Vibe Orbit & Discovery Pulse
            </span>
          </h1>
          <p className="text-xs text-neutral-400">Organic concentric rings & live cultural radar</p>
        </div>
        <button
          onClick={() => setIsFullScreen(!isFullScreen)}
          className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition text-teal-400 flex items-center space-x-1.5 text-xs font-semibold"
        >
          {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span>{isFullScreen ? 'Collapse' : 'Expand Orbit'}</span>
        </button>
      </div>

      {/* Category Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 ${
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
        {/* MapLibre Container */}
        <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

        {/* Organic Concentric Rings Overlay Animation */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          <div className="absolute w-72 h-72 rounded-full border border-orange-500/20 animate-ping opacity-30" style={{ animationDuration: '4s' }} />
          <div className="absolute w-48 h-48 rounded-full border border-teal-500/30 animate-pulse" />
          <div className="absolute w-24 h-24 rounded-full border border-purple-500/40" />
        </div>

        {/* Floating Pulsing Vibe Orbs on Map Overlay */}
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-wrap items-center justify-around">
          {places.map((place, idx) => {
            return (
              <div
                key={place.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectPlace(place);
                }}
                className="pointer-events-auto cursor-pointer group relative flex flex-col items-center animate-bounce"
                style={{ animationDuration: `${3 + (idx % 3)}s` }}
              >
                <div className="px-2.5 py-1 rounded-xl bg-neutral-950/90 backdrop-blur-md border border-orange-500/40 text-[10px] font-bold text-white shadow-xl flex items-center space-x-1 group-hover:scale-110 transition">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                  <span className="truncate max-w-[100px]">{place.title}</span>
                  <span className="text-amber-400">+{place.vq_reward}</span>
                </div>
                <div className="w-3 h-3 rounded-full bg-orange-500 ring-4 ring-orange-500/30 mt-1 shadow-lg shadow-orange-500" />
              </div>
            );
          })}
        </div>

        {/* Bottom Legend Overlay */}
        <div className="absolute bottom-3 left-3 right-3 bg-neutral-950/80 backdrop-blur-xl border border-neutral-800 rounded-2xl p-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-bold">Discovery Pulse Active</span>
          </div>
          <span className="text-[11px] text-neutral-400">{places.length} Waypoints Loaded</span>
        </div>
      </div>

      {/* Place Cards List when Expanded or Default */}
      <div className="space-y-3">
        <h3 className="text-base font-bold flex items-center space-x-2">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Nearby Vibe Waypoints ({places.length})</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {places.map((place) => (
            <div
              key={place.id}
              onClick={() => onSelectPlace(place)}
              className="rounded-2xl bg-neutral-900 border border-neutral-800 hover:border-orange-500/50 transition cursor-pointer p-4 flex space-x-4 items-center group"
            >
              <img
                src={place.image_url}
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
                <div className="flex items-center space-x-1 text-[11px] text-neutral-400">
                  <MapPin className="w-3 h-3 text-orange-400" />
                  <span>Pulse Intensity: {place.pulse_intensity}/10</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
