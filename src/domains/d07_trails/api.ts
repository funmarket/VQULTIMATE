import { supabase } from '../../lib/supabase';
import { CulturalTrail, VibeGuardian } from './types';

export const CANONICAL_CULTURAL_TRAILS: CulturalTrail[] = [
  {
    id: 'trail-neon-souk',
    title: 'Neon Souk & Spice Arcades',
    description: 'Traverse centuries-old spice alleys under warm lantern glow, discovering hidden saffron merchants, cedar wind towers, and rooftop tea sanctuaries.',
    difficulty: 'Easy',
    duration_mins: 35,
    distance_km: 1.8,
    category: 'Heritage & Spices',
    vq_reward: 250,
    image_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
    waypoints_count: 3,
    guardian_name: 'Tariq Al-Mansoori',
    guardian_handle: '@tariq_guardian',
    guardian_avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    district: 'Old Souk Heritage Quarter',
    remix_count: 14,
    waypoints: [
      {
        id: 'wp-1-1',
        order: 1,
        title: 'Archway of the Frankincense Guild',
        description: 'Historic gateway marked by sandalwood carvings and sweet myrrh aromas.',
        hint: 'Look for the carved cedar wooden door next to the spice merchant.',
        vq_reward: 75
      },
      {
        id: 'wp-1-2',
        order: 2,
        title: 'Saffron Courtyard Majlis',
        description: 'Quiet shaded courtyard where merchants evaluated Grade A saffron strands.',
        hint: 'Under the arched wind tower with clay water jugs.',
        vq_reward: 75
      },
      {
        id: 'wp-1-3',
        order: 3,
        title: 'Rooftop Cardamom Tea Sanctuary',
        description: 'Panoramic rooftop overlooking the creek estuary with spiced black tea.',
        hint: 'Climb the spiral stone staircase behind stall #42.',
        vq_reward: 100
      }
    ]
  },
  {
    id: 'trail-cyber-marina',
    title: 'Cyber Marina Augmented Mural Walk',
    description: 'Explore futuristic street art and holographic light installations along the waterfront promenades with interactive kinetic sculptures.',
    difficulty: 'Moderate',
    duration_mins: 55,
    distance_km: 3.4,
    category: 'Digital Art & Architecture',
    vq_reward: 350,
    image_url: 'https://images.unsplash.com/photo-1561214115-f2f134cc4912?auto=format&fit=crop&w=800&q=80',
    waypoints_count: 4,
    guardian_name: 'Layla Chen',
    guardian_handle: '@layla_vibes',
    guardian_avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    district: 'Marina Waterfront Node',
    remix_count: 28,
    waypoints: [
      {
        id: 'wp-2-1',
        order: 1,
        title: 'Prismatic Pier Beacon',
        description: 'Interactive kinetic sculpture responsive to ocean breezes and pedestrian frequency.',
        hint: 'Beside the solar boat docking station.',
        vq_reward: 75
      },
      {
        id: 'wp-2-2',
        order: 2,
        title: 'Bioluminescent Canopy',
        description: 'Overhanging pergola woven with fiber-optic vines that pulse with urban sounds.',
        hint: 'Look up at the glowing canopy over the pedestrian boardwalk.',
        vq_reward: 75
      },
      {
        id: 'wp-2-3',
        order: 3,
        title: 'The Glitch Falcon Mural',
        description: 'Massive geometric falcon mural rendered with iridescent reflective pigments.',
        hint: 'Painted on the western facade of the amphitheater.',
        vq_reward: 100
      },
      {
        id: 'wp-2-4',
        order: 4,
        title: 'Zero-G Espresso Terrace',
        description: 'Rooftop specialty roastery with skyline views across the marina canal.',
        hint: 'Take the external glass lift to level 3.',
        vq_reward: 100
      }
    ]
  },
  {
    id: 'trail-carthage-coast',
    title: 'Carthage Ruins & Sea Cliff Horizon',
    description: 'Ride along ancient Phoenician coastal battlements overlooking turquoise Mediterranean waters, Punic naval ports, and Roman thermal columns.',
    difficulty: 'Legendary',
    duration_mins: 75,
    distance_km: 5.2,
    category: 'Antiquity & Coast',
    vq_reward: 500,
    image_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    waypoints_count: 5,
    guardian_name: 'Sarah K.',
    guardian_handle: '@sarah_carthage',
    guardian_avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    district: 'Carthage Coastline',
    remix_count: 42,
    waypoints: [
      {
        id: 'wp-3-1',
        order: 1,
        title: 'Antonine Baths Column Portico',
        description: 'Gigantic granite columns standing right against the azure sea.',
        lat: 36.8525,
        lng: 10.3340,
        hint: 'Base of the imperial frigidarium column.',
        vq_reward: 100
      },
      {
        id: 'wp-3-2',
        order: 2,
        title: 'Byrsa Hill Citadelle Look',
        description: 'Panoramic apex offering sweeping vistas of the Gulf of Tunis.',
        lat: 36.8540,
        lng: 10.3235,
        hint: 'Next to the Carthage National Museum balustrade.',
        vq_reward: 100
      },
      {
        id: 'wp-3-3',
        order: 3,
        title: 'Punic Admiralty Circular Port',
        description: 'The legendary circular naval military port of ancient Carthaginian triremes.',
        lat: 36.8430,
        lng: 10.3275,
        hint: 'Island pavilion in the center of the circular basin.',
        vq_reward: 100
      },
      {
        id: 'wp-3-4',
        order: 4,
        title: 'Tophet Sacred Olive Grove',
        description: 'Serene botanical sanctuary shaded by ancient millennial olive trees.',
        lat: 36.8400,
        lng: 10.3220,
        hint: 'Carved stela path under the olive shade.',
        vq_reward: 100
      },
      {
        id: 'wp-3-5',
        order: 5,
        title: 'Cliffside Mint Tea Lookout',
        description: 'Traditional cafe perched on cliff rocks serving pine-nut infused mint tea.',
        lat: 36.8580,
        lng: 10.3410,
        hint: 'Straw mat terrace overlooking the horizon.',
        vq_reward: 100
      }
    ]
  }
];

export async function fetchCulturalTrails(): Promise<CulturalTrail[]> {
  try {
    const { data, error } = await supabase.from('cultural_trails').select('*');
    if (!error && data && data.length > 0) {
      return data as CulturalTrail[];
    }
    // Also try canonical vibe_trails table
    const { data: vTrails, error: vErr } = await supabase.from('vibe_trails').select('*');
    if (!vErr && vTrails && vTrails.length > 0) {
      return (vTrails as any[]).map(t => ({
        id: t.id,
        title: t.title || t.name || 'Cultural Trail',
        description: t.description || '',
        difficulty: t.difficulty || 'Moderate',
        duration_mins: t.duration_mins || 45,
        distance_km: t.distance_km || 2.5,
        category: t.category || 'Heritage',
        vq_reward: t.vq_reward || 150,
        image_url: t.image_url || t.cover_image || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&q=80',
        waypoints_count: t.waypoints_count || t.stops_count || 3,
        guardian_name: t.author_name || t.guardian_name || 'District Guardian',
        guardian_handle: t.author_handle || '@guardian',
        guardian_avatar: t.author_avatar || '',
        district: t.district || 'Heritage Node',
        remix_count: t.remix_count || 0
      }));
    }
    return CANONICAL_CULTURAL_TRAILS;
  } catch (err) {
    console.warn('Error fetching cultural trails, using canonical district trails:', err);
    return CANONICAL_CULTURAL_TRAILS;
  }
}

export const CANONICAL_VIBE_GUARDIANS: VibeGuardian[] = [
  {
    id: 'g-tariq',
    name: 'Tariq Al-Mansoori',
    handle: '@tariq_guardian',
    district: 'Old Souk Heritage Quarter',
    tier: 'MASTER SENTINEL',
    status: 'on_duty',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
    bio: 'Guardian of the Old Souk archives, ancient cedar wind towers, and spice trade guild sanctuaries.',
    trust_score: 98,
    specialty: 'Historic Souks & Wind Towers',
    curated_trails_count: 1,
    curated_trail_ids: ['trail-neon-souk'],
    years_patrolling: 4
  },
  {
    id: 'g-layla',
    name: 'Layla Chen',
    handle: '@layla_vibes',
    district: 'Marina Waterfront Node',
    tier: 'PRO GUARDIAN',
    status: 'patrolling',
    avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
    bio: 'Augmented reality curator, kinetic light sculptress, and urban waterfront walk coordinator.',
    trust_score: 96,
    specialty: 'Interactive Street Art & Kinetic Light',
    curated_trails_count: 1,
    curated_trail_ids: ['trail-cyber-marina'],
    years_patrolling: 2
  },
  {
    id: 'g-sarah',
    name: 'Sarah K.',
    handle: '@sarah_carthage',
    district: 'Carthage Coastline',
    tier: 'LOCAL LEGEND',
    status: 'active',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
    bio: 'Carthage ruins photographer, sea cliff cyclist, and Phoenician maritime heritage researcher.',
    trust_score: 97,
    specialty: 'Phoenician Archeology & Sea Cliffs',
    curated_trails_count: 1,
    curated_trail_ids: ['trail-carthage-coast'],
    lat: 36.8525,
    lng: 10.3340,
    years_patrolling: 5
  },
  {
    id: 'g-yassine',
    name: 'Yassine B.',
    handle: '@yassine_medina',
    district: 'Tunis Medina Node',
    tier: 'HERITAGE ARCHIVIST',
    status: 'on_duty',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    bio: 'Historic Medina architect, zellij restoration craftsman, and traditional mint tea archivist.',
    trust_score: 95,
    specialty: 'Zellij Mosaics & Ottoman Majlis',
    curated_trails_count: 1,
    lat: 36.7992,
    lng: 10.1706,
    years_patrolling: 6
  }
];

export async function fetchVibeGuardians(): Promise<VibeGuardian[]> {
  try {
    const { data, error } = await supabase.from('vibe_guardians').select('*');
    if (!error && data && data.length > 0) {
      return data as VibeGuardian[];
    }
    const { data: profData, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .or('role.eq.guardian,account_type.eq.pro');
    if (!profErr && profData && profData.length > 0) {
      return (profData as any[]).map(p => ({
        id: p.id,
        name: p.display_name || p.full_name || p.handle || 'Guardian',
        handle: '@' + (p.handle || p.username || 'guardian'),
        district: p.district || 'Heritage Quarter',
        tier: p.tier || 'PRO GUARDIAN',
        status: 'on_duty',
        avatar_url: p.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        bio: p.bio || 'District guardian and cultural curator.',
        trust_score: p.trust_score || 95,
        curated_trails_count: 1
      }));
    }
    return CANONICAL_VIBE_GUARDIANS;
  } catch (err) {
    console.warn('Error fetching vibe guardians, falling back to canonical:', err);
    return CANONICAL_VIBE_GUARDIANS;
  }
}

