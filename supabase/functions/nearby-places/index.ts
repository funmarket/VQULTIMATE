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

// Hard-excluded non-leisure types (Note: generic 'store' is NOT here so bakeries/cafes/galleries with 'store' aren't wiped out)
const HARD_EXCLUDED_TYPES = new Set([
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
  /\b(police|protection\s*civile|civil\s*protection|gendarmerie|pompiers|municipalité|municipalite|commune|mairie|ministère|ministere|ambassade|consulat|tribunal|gouvernorat|délégation|delegation|recette\s*des\s*finances|cnss|cnam|steg|sonede|onàs|onas)\b/i,
  /\b(bank|banque|atm|biat|bna|stb|bh\b|amen\s*bank|attijari|zitouna|uib|ubci|btk|tsb|wifak|assurance|insurance|gat|star|comar|maghrébia|lloyd|mae|notaire|avocat|courtier|finance|leasing|microfinance|endatamweel)\b/i,
  /\b(société|societe|ste\b|sté\b|sarl|suarl|s\.a\.r\.l|s\.a\b|company|enterprise|entreprise|industrie|industry|industrial|manufactur|usine|holding|groupe|group|consulting|conseil|corporate|siège|siege|direction\s*générale|centre\s*d['’]?affaires|business\s*center|bureau|office|agence|agency|imprimerie|impression|plv\b|publicité|publicite|travaux|batiment|bâtiment|immobilier|immobilière|promotion|construction|logistique|logistics|transport|import|export|distribution|commerce|commercial|crown\s*maghreb|marquardt)\b/i,
  /\b(supermarket|supérette|superette|monoprix|carrefour|magasin\s*général|mg\b|aziza|épicerie|epicerie|station\s*service|totalenergies|shell|agil|ola\s*energy|kiosque|lavage)\b/i,
  /\b(post\s*office|la\s*poste|rapid\s*poste|telecom|télécom|orange|ooredoo|tunisie\s*telecom|topnet|globalnet)\b/i
];

const FOOD_NAME_REGEX = /\b(restaurant|resto|café|cafe|coffee|salon\s*de\s*thé|salon\s*de\s*the|pâtisserie|patisserie|boulangerie|bakery|pizzeria|pizza|burger|bistro|bistrot|brasserie|grill|crêperie|creperie|gelato|glacier|snack|traitor|traiteur)\b/i;
const LOUNGE_NIGHT_REGEX = /\b(lounge|bar\b|pub\b|club\b|night\s*club|disco|discothèque|discotheque|rooftop|tapas|cabaret|speakeasy|hookah|shisha|chicha)\b/i;
const ART_NAME_REGEX = /\b(galerie|gallery|atelier\s*d['’]?art|art\s*space|art\s*center|centre\s*d['’]?art|exposition|beaux[\s-]*arts)\b/i;
const CULTURE_REGEX = /\b(museum|musée|musee|cité\s*de\s*la\s*culture|cite\s*de\s*la\s*culture|theatre|théâtre|theater|opéra|opera|cinéma|cinema|centre\s*culturel|cultural\s*center|palais|medina|médina|conservatoire|maison\s*de\s*la\s*culture|bibliothèque|bibliotheque|acropolium|cathédrale|cathedrale|thermes|amphithéâtre|site\s*archéologique)\b/i;
const SPOTS_REGEX = /\b(park|parc|viewpoint|belvédère|belvedere|plage|beach|corniche|marina|port|monument|ruines|ruins|archéologique|archaeological|fort|kasbah|citadelle|attraction|lac|lake|colline|jardin)\b/i;

function normalizeCategory(raw?: string): 'All' | VibeCategory {
  if (!raw) return 'All';
  const c = raw.trim().toLowerCase();
  if (c === 'food' || c === 'cafes' || c === 'cafe') return 'Food';
  if (c === 'night owl' || c === 'night_owl' || c === 'nightowl' || c === 'venues' || c === 'venue') return 'Night Owl';
  if (c === 'art') return 'Art';
  if (c === 'culture') return 'Culture';
  if (c === 'spots' || c === 'spot' || c === 'hidden') return 'Spots';
  return 'All';
}

function isStrictlyLeisurePlace(item: any, requestedCategory: 'All' | VibeCategory): boolean {
  const types: string[] = Array.isArray(item?.types) ? item.types : [];
  const name: string = (item?.name || '').trim();
  const address: string = (item?.formatted_address || item?.vicinity || '').trim();

  if (!name || /^(tunis|ariana|manouba|ben\s*arous)$/i.test(name)) return false;

  for (const t of types) {
    if (HARD_EXCLUDED_TYPES.has(t)) {
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
    !types.includes('bakery') &&
    !types.includes('bar') &&
    !types.includes('night_club') &&
    !types.includes('museum')
  ) {
    return false;
  }

  const hasAllowedLeisureType = types.some((t) => ALLOWED_LEISURE_TYPES.has(t));
  if (hasAllowedLeisureType) {
    return true;
  }

  if (FOOD_NAME_REGEX.test(name)) return true;
  if (LOUNGE_NIGHT_REGEX.test(name)) return true;
  if (ART_NAME_REGEX.test(name)) return true;
  if (CULTURE_REGEX.test(name)) return true;
  if (SPOTS_REGEX.test(name)) return true;

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
    set.has('meal_delivery') ||
    FOOD_NAME_REGEX.test(name);

  const isNightOwl =
    set.has('bar') ||
    set.has('night_club') ||
    set.has('casino') ||
    LOUNGE_NIGHT_REGEX.test(name);

  const isArt =
    set.has('art_gallery') ||
    ART_NAME_REGEX.test(name);

  const isCulture =
    set.has('museum') ||
    set.has('performing_arts_theater') ||
    set.has('movie_theater') ||
    set.has('cultural_center') ||
    CULTURE_REGEX.test(name) ||
    (requestedCategory === 'Culture' && set.has('tourist_attraction'));

  const isSpot =
    set.has('tourist_attraction') ||
    set.has('park') ||
    set.has('natural_feature') ||
    set.has('amusement_park') ||
    set.has('aquarium') ||
    set.has('zoo') ||
    set.has('bowling_alley') ||
    SPOTS_REGEX.test(name);

  // When a specific category tab is clicked, return that category if it matches
  if (requestedCategory === 'Food') return isFood ? 'Food' : null;
  if (requestedCategory === 'Night Owl') return isNightOwl ? 'Night Owl' : null;
  if (requestedCategory === 'Art') return isArt ? 'Art' : null;
  if (requestedCategory === 'Culture') return isCulture ? 'Culture' : null;
  if (requestedCategory === 'Spots') return isSpot ? 'Spots' : null;

  // In 'All' mode, assign the most specific primary category without letting Night Owl swallow restaurants
  if (isArt) return 'Art';
  if (isCulture) return 'Culture';
  if (isNightOwl && !set.has('restaurant') && !set.has('cafe') && !set.has('bakery')) return 'Night Owl';
  if (isFood && !LOUNGE_NIGHT_REGEX.test(name)) return 'Food';
  if (isNightOwl) return 'Night Owl';
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

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (request.method === 'GET') {
    return new Response(
      JSON.stringify({ error: 'The former venue photo proxy has been retired.', code: 'PHOTO_PROXY_RETIRED' }),
      { status: 410, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
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

    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return new Response(JSON.stringify({ places: [], error: 'Valid lat and lng required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    // D03 discovery reads the existing, RLS-governed community place catalog.
    // The D05 OSM/Photon link resolver is intentionally a separate read-only flow.
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !anonKey) throw new Error('Supabase catalog configuration unavailable');

    const pageSize = 1000;
    const catalog: any[] = [];
    let offset = 0;
    while (true) {
      const url = new URL(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/places`);
      url.searchParams.set('select', '*');
      url.searchParams.set('order', 'id.asc');
      url.searchParams.set('limit', String(pageSize));
      url.searchParams.set('offset', String(offset));
      const response = await fetch(url, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
      });
      if (!response.ok) {
        throw new Error(`Community place catalog returned HTTP ${response.status}`);
      }
      const page = await response.json();
      if (!Array.isArray(page)) throw new Error('Invalid community place catalog response');
      catalog.push(...page);
      if (page.length < pageSize) break;
      offset += pageSize;
    }

    const allowedCategories = new Set<VibeCategory>(['Food', 'Art', 'Spots', 'Culture', 'Night Owl']);
    const places = catalog
      .filter((item: any) => {
        if (!item?.id || typeof item.name !== 'string' || !item.name.trim()) return false;
        if (!allowedCategories.has(item.category)) return false;
        if (requestedCategory !== 'All' && item.category !== requestedCategory) return false;
        const placeLat = Number(item.lat);
        const placeLng = Number(item.lng);
        return Number.isFinite(placeLat) && Number.isFinite(placeLng) && Math.abs(placeLat) <= 90 && Math.abs(placeLng) <= 180;
      })
      .map((item: any) => ({
        ...item,
        title: item.name,
        image_url: item.image_url ?? '',
        description: item.description ?? '',
        lat: Number(item.lat),
        lng: Number(item.lng),
        distance_meters: calculateHaversineMeters(lat, lng, Number(item.lat), Number(item.lng))
      }))
      .sort((a: any, b: any) => a.distance_meters - b.distance_meters);

    return new Response(JSON.stringify({
      places,
      source: 'community_places',
      requested_category: requestedCategory
    }), { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('nearby-places edge function error:', err);
    return new Response(JSON.stringify({ places: [], error: err?.message || 'Server error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
});
