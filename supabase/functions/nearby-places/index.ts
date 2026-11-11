const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type VibeCategory = 'Food' | 'Art' | 'Spots' | 'Culture' | 'Night Owl';

const CATEGORY_QUERY_MAP: Record<string, string> = {
  All: 'restaurant cafe bar lounge museum night club art gallery park',
  Food: 'restaurant cafe bakery',
  'Night Owl': 'bar night club lounge',
  Art: 'art gallery',
  Culture: 'museum theatre cultural center',
  Spots: 'tourist attraction park viewpoint'
};

const ALLOWED_LEISURE_TYPES = new Set([
  'restaurant',
  'cafe',
  'bar',
  'night_club',
  'meal_takeaway',
  'meal_delivery',
  'bakery',
  'art_gallery',
  'museum',
  'performing_arts_theater',
  'movie_theater',
  'cultural_center',
  'tourist_attraction',
  'park',
  'natural_feature',
  'amusement_park',
  'aquarium',
  'zoo',
  'bowling_alley',
  'casino'
]);

const EXCLUDED_TYPES = new Set([
  'lodging',
  'locality',
  'political',
  'administrative_area_level_1',
  'administrative_area_level_2',
  'country',
  'neighborhood',
  'sublocality',
  'route',
  'bank',
  'atm',
  'finance',
  'accounting',
  'lawyer',
  'school',
  'university',
  'secondary_school',
  'primary_school',
  'preschool',
  'hospital',
  'doctor',
  'dentist',
  'health',
  'pharmacy',
  'drugstore',
  'physiotherapist',
  'veterinary_care',
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
  'parking',
  'transit_station',
  'bus_station',
  'train_station',
  'subway_station',
  'hardware_store',
  'convenience_store',
  'department_store',
  'clothing_store',
  'shoe_store',
  'electronics_store',
  'home_goods_store',
  'furniture_store',
  'jewelry_store',
  'pet_store',
  'storage',
  'cemetery',
  'funeral_home',
  'laundry',
  'hair_care',
  'beauty_salon',
  'locksmith',
  'moving_company',
  'plumber',
  'electrician',
  'roofing_contractor',
  'general_contractor',
  'painter',
  'travel_agency',
  'place_of_worship',
  'mosque',
  'church',
  'synagogue'
]);

const EXCLUDED_NAME_PATTERNS = [
  /\b(hotel|hôtel|motel|hostel|auberge|aparthotel|résidence|residence)\b/i,
  /\b(school|école|ecole|lycée|lycee|collège|college|university|université|universite|faculté|faculte|institut|institute|académie|academie|training|formation|éducation|education|enseignement)\b/i,
  /\b(jardin\s*d['’]?enfants|crèche|creche|garderie|maternelle|primaire|préparatoire|preparatoire|scolaire|campus|iset|isg|insat|esprit|fst|enit|ihec)\b/i,
  /\b(hospital|hôpital|hopital|clinic|clinique|pharmacy|pharmacie|cabinet|médical|medical|santé|sante|dispensaire|laboratoire|laboratory|polyclinique|dentaire|dentiste|optique|opticien|kiné|kine)\b/i,
  /\b(police|protection\s*civile|civil\s*protection|civil|gendarmerie|pompiers|municipalité|municipalite|commune|mairie|ministère|ministere|ambassade|consulat|tribunal|gouvernorat|délégation|delegation|recette\s*des\s*finances|cnss|cnam|steg|sonede|onàs|onas)\b/i,
  /\b(bank|banque|atm|biat|bna|stb|bh\b|amen\s*bank|attijari|zitouna|uib|ubci|btk|tsb|wifak|assurance|insurance|gat|star|comar|maghrébia|lloyd|mae|notaire|avocat|courtier|finance|leasing|microfinance|endatamweel)\b/i,
  /\b(société|societe|ste\b|sté\b|sarl|suarl|s\.a\.r\.l|s\.a\b|company|enterprise|entreprise|industrie|industry|industrial|manufactur|usine|holding|groupe|group|consulting|conseil|corporate|siège|siege|direction\s*générale|centre\s*d['’]?affaires|business\s*center|bureau|office|agence|agency|imprimerie|impression|plv\b|publicité|publicite|travaux|batiment|bâtiment|immobilier|immobilière|promotion|construction|logistique|logistics|transport|import|export|distribution|commerce|commercial|crown\s*maghreb|marquardt)\b/i,
  /\b(supermarket|supérette|superette|monoprix|carrefour|magasin\s*général|mg\b|aziza|épicerie|epicerie|station\s*service|totalenergies|shell|agil|ola\s*energy|kiosque|lavage)\b/i,
  /\b(post\s*office|la\s*poste|rapid\s*poste|telecom|télécom|orange|ooredoo|tunisie\s*telecom|topnet|globalnet)\b/i
];

const LOUNGE_NIGHT_REGEX = /\b(lounge|bar|pub|club|night\s*club|disco|discothèque|discotheque|rooftop|tapas|bistro|bistrot|brasserie|cabaret|speakeasy|hookah|shisha|chicha)\b/i;
const CULTURE_REGEX = /\b(museum|musée|musee|theatre|théâtre|theater|opéra|opera|cinéma|cinema|galerie|gallery|centre\s*culturel|cultural\s*center|palais|medina|médina|conservatoire)\b/i;
const SPOTS_REGEX = /\b(park|parc|viewpoint|belvédère|belvedere|plage|beach|corniche|marina|port|monument|ruines|ruins|archéologique|archaeological|fort|kasbah|citadelle|attraction|lac|lake|colline)\b/i;

function normalizeCategory(raw?: string): 'All' | VibeCategory {
  if (!raw) return 'All';
  const c = raw.trim().toLowerCase();
  if (c === 'food') return 'Food';
  if (c === 'night owl' || c === 'night_owl' || c === 'nightowl') return 'Night Owl';
  if (c === 'art') return 'Art';
  if (c === 'culture') return 'Culture';
  if (c === 'spots' || c === 'spot') return 'Spots';
  return 'All';
}

function isStrictlyLeisurePlace(item: any, requestedCategory: 'All' | VibeCategory): boolean {
  const types: string[] = Array.isArray(item?.types) ? item.types : [];
  const name: string = (item?.name || '').trim();
  const address: string = (item?.formatted_address || item?.vicinity || '').trim();

  if (!name || name.toLowerCase() === 'tunis') return false;

  for (const t of types) {
    if (EXCLUDED_TYPES.has(t)) {
      return false;
    }
  }

  for (const pattern of EXCLUDED_NAME_PATTERNS) {
    if (pattern.test(name)) {
      return false;
    }
  }

  if (
    /\b(zone\s*industrielle|z\.i\b|technopole|pôle\s*technologique|immeuble\s*bureau)\b/i.test(address) &&
    !types.includes('restaurant') &&
    !types.includes('cafe') &&
    !types.includes('bar') &&
    !types.includes('night_club')
  ) {
    return false;
  }

  const hasAllowedLeisureType = types.some((t) => ALLOWED_LEISURE_TYPES.has(t));
  if (hasAllowedLeisureType) {
    return true;
  }

  if (requestedCategory === 'Night Owl' || requestedCategory === 'All') {
    if (LOUNGE_NIGHT_REGEX.test(name)) return true;
  }
  if (requestedCategory === 'Culture' || requestedCategory === 'All') {
    if (CULTURE_REGEX.test(name)) return true;
  }
  if (requestedCategory === 'Spots' || requestedCategory === 'All') {
    if (SPOTS_REGEX.test(name)) return true;
  }

  return false;
}

function mapPlaceToCategory(
  types: string[] = [],
  name: string = '',
  requestedCategory: 'All' | VibeCategory = 'All'
): VibeCategory | null {
  const set = new Set(types);

  const isFood =
    set.has('restaurant') ||
    set.has('cafe') ||
    set.has('bakery') ||
    set.has('meal_takeaway') ||
    set.has('meal_delivery');
  const isNightOwl =
    set.has('bar') ||
    set.has('night_club') ||
    set.has('casino') ||
    LOUNGE_NIGHT_REGEX.test(name);
  const isArt =
    set.has('art_gallery') ||
    /\b(galerie|gallery|atelier\s*d['’]?art|art\s*space)\b/i.test(name);
  const isCulture =
    set.has('museum') ||
    set.has('performing_arts_theater') ||
    set.has('movie_theater') ||
    set.has('cultural_center') ||
    CULTURE_REGEX.test(name);
  const isSpot =
    set.has('tourist_attraction') ||
    set.has('park') ||
    set.has('natural_feature') ||
    set.has('amusement_park') ||
    set.has('aquarium') ||
    set.has('zoo') ||
    set.has('bowling_alley') ||
    SPOTS_REGEX.test(name);

  if (requestedCategory === 'Food') return isFood ? 'Food' : null;
  if (requestedCategory === 'Night Owl') return isNightOwl ? 'Night Owl' : null;
  if (requestedCategory === 'Art') return isArt ? 'Art' : null;
  if (requestedCategory === 'Culture') return isCulture ? 'Culture' : null;
  if (requestedCategory === 'Spots') return isSpot ? 'Spots' : null;

  if (isNightOwl && !set.has('bakery')) return 'Night Owl';
  if (isArt) return 'Art';
  if (isCulture) return 'Culture';
  if (isFood) return 'Food';
  if (isSpot) return 'Spots';

  return null;
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

async function queryGooglePlacesTextSearch(
  lat: number,
  lng: number,
  radius: number,
  query: string,
  apiKey: string
): Promise<{ status: string; results: any[]; error_message?: string }> {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', query);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('radius', String(radius));
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return { status: `HTTP_${res.status}`, results: [] };
    const data = await res.json();
    return {
      status: data.status || 'UNKNOWN',
      results: Array.isArray(data.results) ? data.results : [],
      error_message: data.error_message
    };
  } catch (err: any) {
    return { status: 'FETCH_ERROR', results: [], error_message: err?.message };
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
  const reqUrl = new URL(request.url);

  if (request.method === 'GET') {
    const photoReference = reqUrl.searchParams.get('photo_reference');
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
      const maxwidth = reqUrl.searchParams.get('maxwidth') || '800';
      const googlePhotoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${encodeURIComponent(maxwidth)}&photoreference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
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
    const requestedCategory = normalizeCategory(body?.category);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ places: [], error: 'Valid lat and lng required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'GOOGLE_PLACES_API_KEY is not configured in Supabase secrets.',
          places: []
        }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const radiusMeters = 8000;
    const maxCutoffMeters = 15000;
    const searchQuery = CATEGORY_QUERY_MAP[requestedCategory] || CATEGORY_QUERY_MAP['All'];

    const { status: googleStatus, results: rawResults, error_message } = await queryGooglePlacesTextSearch(
      lat,
      lng,
      radiusMeters,
      searchQuery,
      apiKey
    );

    const supabaseUrl = (Deno.env.get('SUPABASE_URL') || reqUrl.origin).replace(/\/$/, '');

    const places = rawResults
      .map((item: any, googleIndex: number) => {
        const pLat = item.geometry?.location?.lat;
        const pLng = item.geometry?.location?.lng;
        if (typeof pLat !== 'number' || typeof pLng !== 'number') return null;

        const distMeters = calculateHaversineMeters(lat, lng, pLat, pLng);
        if (distMeters > maxCutoffMeters) return null;

        if (!isStrictlyLeisurePlace(item, requestedCategory)) return null;

        const mappedCategory = mapPlaceToCategory(item.types, item.name, requestedCategory);
        if (!mappedCategory) return null;

        const photoRef = item.photos?.[0]?.photo_reference;
        const imageUrl =
          photoRef
            ? `${supabaseUrl}/functions/v1/nearby-places?photo_reference=${encodeURIComponent(photoRef)}&maxwidth=800`
            : undefined;

        const rating = typeof item.rating === 'number' ? Number(item.rating.toFixed(1)) : undefined;
        const reviewsCount = typeof item.user_ratings_total === 'number' ? item.user_ratings_total : undefined;
        const isLegendary = Boolean(rating !== undefined && rating >= 4.5 && (reviewsCount ?? 0) >= 40);

        const priceBands = ['Free', 'TND 1–10', 'TND 10–25', 'TND 25–50', 'TND 50+'];
        const priceBand =
          typeof item.price_level === 'number' ? priceBands[item.price_level] : undefined;

        const openNow =
          typeof item.opening_hours?.open_now === 'boolean'
            ? item.opening_hours.open_now
            : undefined;

        return {
          id: item.place_id,
          place_id: item.place_id,
          title: item.name,
          name: item.name,
          types: Array.isArray(item.types) ? item.types : [],
          category: mappedCategory,
          description: item.formatted_address || item.vicinity || '',
          image_url: imageUrl,
          lat: pLat,
          lng: pLng,
          address: item.formatted_address || item.vicinity || '',
          distance_meters: distMeters,
          distance_km: Number((distMeters / 1000).toFixed(2)),
          rating: rating,
          reviews_count: reviewsCount,
          checkins_count: undefined,
          confirmations_count: undefined,
          created_by: 'google_places',
          is_legendary: isLegendary,
          price_band: priceBand,
          open_now: openNow,
          _googleRank: googleIndex
        };
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    places.sort((a, b) => {
      const ratingA = a.rating ?? 0;
      const ratingB = b.rating ?? 0;
      const reviewsA = a.reviews_count ?? 0;
      const reviewsB = b.reviews_count ?? 0;

      const relevanceScoreA = ratingA * Math.log10(reviewsA + 10) - a._googleRank * 0.12;
      const relevanceScoreB = ratingB * Math.log10(reviewsB + 10) - b._googleRank * 0.12;

      if (Math.abs(relevanceScoreB - relevanceScoreA) > 0.3) {
        return relevanceScoreB - relevanceScoreA;
      }

      return (a.distance_meters ?? 999999) - (b.distance_meters ?? 999999);
    });

    const cleanPlaces = places.map(({ _googleRank, ...rest }) => rest);

    return new Response(
      JSON.stringify({
        endpoint: 'https://maps.googleapis.com/maps/api/place/textsearch/json',
        google_status: googleStatus,
        google_error: error_message || null,
        requested_category: requestedCategory,
        query_used: searchQuery,
        count: cleanPlaces.length,
        places: cleanPlaces
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('nearby-places edge function error:', err);
    return new Response(JSON.stringify({ places: [], error: err?.message || 'Server error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
