/**
 * Supabase Edge Function: nearby-places
 * Calls Google Places API Nearby Search securely server-side using GOOGLE_PLACES_API_KEY.
 *
 * Strict Leisure-Only Rules:
 * - Includes: restaurant, cafe, bar, night_club, lounge, meal_takeaway, bakery,
 *             art_gallery, museum, movie_theater, tourist_attraction, park,
 *             amusement_park, spa, bowling_alley.
 * - Explicitly excludes: banks, schools, universities, hospitals, pharmacies, stores,
 *                        supermarkets, gas stations, offices, accounting, lawyer, etc.
 * - Queries multiple leisure types and merges results when no category is requested.
 * - Sorts final results by distance (closest first), then by rating (highest first).
 * - Proxies place photos on GET requests so the API key is never exposed to the client.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type VibeCategory = 'Food' | 'Art' | 'Spots' | 'Culture' | 'Night Owl';

const ALLOWED_LEISURE_TYPES = new Set([
  'restaurant',
  'cafe',
  'bar',
  'night_club',
  'lounge',
  'meal_takeaway',
  'bakery',
  'art_gallery',
  'museum',
  'movie_theater',
  'tourist_attraction',
  'park',
  'amusement_park',
  'spa',
  'bowling_alley'
]);

const EXCLUDED_TYPES = new Set([
  'bank',
  'atm',
  'finance',
  'accounting',
  'lawyer',
  'school',
  'university',
  'secondary_school',
  'primary_school',
  'hospital',
  'doctor',
  'dentist',
  'health',
  'pharmacy',
  'drugstore',
  'store',
  'supermarket',
  'grocery_or_supermarket',
  'gas_station',
  'real_estate_agency',
  'insurance_agency',
  'local_government_office',
  'city_hall',
  'courthouse',
  'embassy',
  'police',
  'fire_station',
  'post_office',
  'car_dealer',
  'car_repair',
  'car_wash',
  'hardware_store',
  'convenience_store',
  'department_store',
  'clothing_store',
  'shoe_store',
  'electronics_store',
  'home_goods_store',
  'jewelry_store',
  'pet_store',
  'storage',
  'cemetery',
  'funeral_home',
  'laundry',
  'locksmith',
  'moving_company',
  'plumber',
  'electrician',
  'roofing_contractor',
  'travel_agency',
  'veterinary_care'
]);

const EXCLUDED_NAME_PATTERNS = [
  /\b(school|école|ecole|lycée|lycee|collège|college|university|université|universite|faculté|faculte|institut|institute|académie|academie)\b/i,
  /\b(hospital|hôpital|hopital|clinic|clinique|pharmacy|pharmacie|cabinet|médical|medical|santé|sante|dispensaire)\b/i,
  /\b(police|protection\s*civile|civil\s*protection|gendarmerie|pompiers|municipalité|municipalite|commune|mairie|ministère|ministere|ambassade|consulat|tribunal)\b/i,
  /\b(bank|banque|atm|assurance|insurance|notaire|avocat|courtier|finance)\b/i,
  /\b(société|societe|ste\b|sté\b|sarl|s\.a\b|company|enterprise|entreprise|industrie|industry|manufactur|usine|holding|consulting|corporate|crown\s*maghreb|marquardt)\b/i,
  /\b(supermarket|supérette|superette|monoprix|carrefour|magasin\s*général|épicerie|epicerie|station\s*service|totalenergies|shell|agil|ola\s*energy)\b/i,
  /\b(post\s*office|la\s*poste|telecom|orange|ooredoo|tunisie\s*telecom)\b/i
];

const CATEGORY_FALLBACK_IMAGES: Record<VibeCategory, string> = {
  Food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  Spots: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
  Culture: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  Art: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  'Night Owl': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80'
};

function mapGoogleTypesToCategory(types: string[] = [], requestedCategory?: string): VibeCategory {
  const set = new Set(types);

  if (requestedCategory && requestedCategory !== 'All') {
    const cat = requestedCategory.toLowerCase();
    if (cat.includes('food') && (set.has('restaurant') || set.has('cafe') || set.has('bakery') || set.has('meal_takeaway'))) {
      return 'Food';
    }
    if ((cat.includes('night') || cat.includes('owl')) && (set.has('bar') || set.has('night_club') || set.has('lounge'))) {
      return 'Night Owl';
    }
    if (cat.includes('art') && set.has('art_gallery')) {
      return 'Art';
    }
    if (cat.includes('culture') && (set.has('museum') || set.has('movie_theater'))) {
      return 'Culture';
    }
    if (cat.includes('spot') && (set.has('tourist_attraction') || set.has('park') || set.has('spa') || set.has('amusement_park') || set.has('bowling_alley'))) {
      return 'Spots';
    }
  }

  if (set.has('bar') || set.has('night_club') || set.has('lounge')) {
    return 'Night Owl';
  }
  if (set.has('restaurant') || set.has('cafe') || set.has('bakery') || set.has('meal_takeaway')) {
    return 'Food';
  }
  if (set.has('art_gallery')) {
    return 'Art';
  }
  if (set.has('museum') || set.has('movie_theater')) {
    return 'Culture';
  }
  return 'Spots';
}

function isStrictlyLeisurePlace(item: any): boolean {
  const types: string[] = Array.isArray(item?.types) ? item.types : [];
  const name: string = item?.name || '';

  // 1. Must have at least one allowed leisure type
  const hasAllowedLeisure = types.some((t) => ALLOWED_LEISURE_TYPES.has(t));
  if (!hasAllowedLeisure) {
    return false;
  }

  // 2. Reject if place has ANY excluded non-leisure type
  for (const t of types) {
    if (EXCLUDED_TYPES.has(t)) {
      return false;
    }
  }

  // 3. Reject if name matches non-leisure entities (schools, institutes, companies, hospitals, public offices)
  for (const pattern of EXCLUDED_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return false;
    }
  }

  return true;
}

function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

async function queryGooglePlacesByType(
  lat: number,
  lng: number,
  radius: number,
  type: string,
  apiKey: string
): Promise<any[]> {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${encodeURIComponent(type)}&key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.status === 'OK' && Array.isArray(data.results) ? data.results : [];
  } catch {
    return [];
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');

  // Handle Photo Proxy GET request: /functions/v1/nearby-places?photo_reference=...
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const photoReference = url.searchParams.get('photo_reference');

    if (!photoReference) {
      return new Response(JSON.stringify({ error: 'Missing photo_reference' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'GOOGLE_PLACES_API_KEY is not configured in Supabase secrets.' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    try {
      const maxwidth = url.searchParams.get('maxwidth') || '800';
      const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
      const photoRes = await fetch(googlePhotoUrl, { redirect: 'follow' });

      if (!photoRes.ok) {
        return new Response(null, { status: photoRes.status, headers: cors });
      }

      const contentType = photoRes.headers.get('content-type') || 'image/jpeg';
      const imageBuffer = await photoRes.arrayBuffer();

      return new Response(imageBuffer, {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400, s-maxage=86400'
        }
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Failed to retrieve photo.' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle Places Search POST request
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const lat = Number(body?.lat);
    const lng = Number(body?.lng);
    const radius = Number(body?.radius) || 23000;
    const category = body?.category;

    if (isNaN(lat) || isNaN(lng)) {
      return new Response(JSON.stringify({ places: [] }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    if (!apiKey) {
      console.warn('GOOGLE_PLACES_API_KEY is not set in Supabase Edge Function secrets.');
      return new Response(
        JSON.stringify({
          error: 'GOOGLE_PLACES_API_KEY is not configured in Supabase secrets.',
          places: []
        }),
        {
          status: 200,
          headers: { ...cors, 'Content-Type': 'application/json' }
        }
      );
    }

    const radiusMeters = Math.min(50000, Math.max(500, radius));

    // Determine leisure types to query based on requested category
    let typesToQuery: string[] = [];

    if (!category || category === 'All') {
      // Query major leisure categories in parallel and merge results
      typesToQuery = [
        'restaurant',
        'cafe',
        'bar',
        'night_club',
        'tourist_attraction',
        'art_gallery',
        'museum',
        'park'
      ];
    } else {
      const cat = String(category).toLowerCase();
      if (cat.includes('food')) {
        typesToQuery = ['restaurant', 'cafe', 'bakery', 'meal_takeaway'];
      } else if (cat.includes('night') || cat.includes('owl')) {
        typesToQuery = ['bar', 'night_club'];
      } else if (cat.includes('art')) {
        typesToQuery = ['art_gallery', 'museum'];
      } else if (cat.includes('culture')) {
        typesToQuery = ['museum', 'tourist_attraction'];
      } else {
        typesToQuery = ['tourist_attraction', 'park', 'spa', 'amusement_park', 'bowling_alley'];
      }
    }

    // Run parallel queries across allowed leisure types
    const queryResults = await Promise.all(
      typesToQuery.map((t) => queryGooglePlacesByType(lat, lng, radiusMeters, t, apiKey))
    );

    // Merge and deduplicate by place_id
    const placeMap = new Map<string, any>();
    for (const batch of queryResults) {
      for (const item of batch) {
        if (item?.place_id && !placeMap.has(item.place_id)) {
          placeMap.set(item.place_id, item);
        }
      }
    }

    // Apply strict leisure filtering (exclude banks, schools, hospitals, offices, etc.)
    const strictlyLeisureItems = Array.from(placeMap.values()).filter(isStrictlyLeisurePlace);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    let places = strictlyLeisureItems.map((item: any) => {
      const pLat = item.geometry?.location?.lat;
      const pLng = item.geometry?.location?.lng;
      const distMeters =
        typeof pLat === 'number' && typeof pLng === 'number'
          ? calculateHaversineMeters(lat, lng, pLat, pLng)
          : undefined;

      const mappedCategory = mapGoogleTypesToCategory(item.types, category);
      const photoRef = item.photos?.[0]?.photo_reference;

      const imageUrl =
        photoRef && supabaseUrl
          ? `${supabaseUrl}/functions/v1/nearby-places?photo_reference=${encodeURIComponent(photoRef)}`
          : CATEGORY_FALLBACK_IMAGES[mappedCategory];

      const rating = typeof item.rating === 'number' ? item.rating : 4.5;
      const reviewsCount = typeof item.user_ratings_total === 'number' ? item.user_ratings_total : 0;
      const isLegendary = rating >= 4.5 && reviewsCount >= 40;

      const priceBands = ['Free', 'TND 1–10', 'TND 10–25', 'TND 25–50', 'TND 50+'];
      const priceBand =
        item.price_level !== undefined ? priceBands[item.price_level] || 'TND 10–30' : 'TND 10–30';

      const openNow =
        typeof item.opening_hours?.open_now === 'boolean'
          ? item.opening_hours.open_now
          : undefined;

      return {
        id: item.place_id,
        title: item.name || 'Leisure Spot',
        category: mappedCategory,
        description: item.vicinity ? `Leisure spot in ${item.vicinity}.` : 'Verified local leisure destination.',
        image_url: imageUrl,
        lat: pLat,
        lng: pLng,
        address: item.vicinity || item.formatted_address || 'Nearby Spot',
        distance_meters: distMeters,
        distance_km: distMeters !== undefined ? Number((distMeters / 1000).toFixed(2)) : undefined,
        rating: Number(rating.toFixed(1)),
        reviews_count: reviewsCount,
        checkins_count: Math.max(12, Math.round(reviewsCount * 0.4)),
        pulse_intensity: Math.min(10, Math.max(6, Math.round(rating * 2))),
        vq_reward: 500,
        created_by: 'google_places',
        vibe_confidence: Math.min(99, Math.max(72, Math.round(rating * 20))),
        confirmations_count: Math.min(50, Math.max(4, Math.round(reviewsCount / 10))),
        is_legendary: isLegendary,
        price_band: priceBand,
        ai_match_score: Math.min(98, Math.max(65, Math.round(68 + (rating - 3) * 15))),
        open_now: openNow
      };
    });

    // If a specific category was requested, ensure returned places strictly match that category
    if (category && category !== 'All') {
      places = places.filter((p) => p.category === category);
    }

    // Sort final results: distance (closest first), then by rating (highest first)
    places.sort((a, b) => {
      const distA = a.distance_meters ?? 999999;
      const distB = b.distance_meters ?? 999999;
      const distDiff = distA - distB;
      if (Math.abs(distDiff) > 200) {
        return distDiff;
      }
      return (b.rating ?? 0) - (a.rating ?? 0);
    });

    return new Response(JSON.stringify({ places }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  } catch (err: any) {
    console.error('nearby-places edge function error:', err);
    return new Response(JSON.stringify({ places: [], error: err?.message || 'Server error' }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
