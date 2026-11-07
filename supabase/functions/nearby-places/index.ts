/**
 * Supabase Edge Function: nearby-places
 * Calls Google Places API Nearby Search securely server-side using GOOGLE_PLACES_API_KEY.
 * Proxies place photos on GET requests so the API key is never exposed to the client.
 */

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

type VibeCategory = 'Food' | 'Art' | 'Spots' | 'Culture' | 'Night Owl';

const CATEGORY_FALLBACK_IMAGES: Record<VibeCategory, string> = {
  Food: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
  Spots: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
  Culture: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=800&q=80',
  Art: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?auto=format&fit=crop&w=800&q=80',
  'Night Owl': 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=800&q=80'
};

function mapGoogleTypesToCategory(types: string[] = []): VibeCategory {
  const set = new Set(types);
  if (set.has('bar') || set.has('night_club') || set.has('casino') || set.has('liquor_store')) {
    return 'Night Owl';
  }
  if (set.has('restaurant') || set.has('cafe') || set.has('bakery') || set.has('food') || set.has('meal_takeaway')) {
    return 'Food';
  }
  if (set.has('art_gallery')) {
    return 'Art';
  }
  if (set.has('museum') || set.has('church') || set.has('mosque') || set.has('place_of_worship') || set.has('library') || set.has('city_hall')) {
    return 'Culture';
  }
  return 'Spots';
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
    } catch (err) {
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
      // If coordinates are missing or invalid, return empty array cleanly without crashing
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
    let googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&key=${apiKey}`;

    // Optional category filtering
    if (category && category !== 'All') {
      const cat = String(category).toLowerCase();
      if (cat.includes('food')) {
        googleUrl += '&type=restaurant';
      } else if (cat.includes('night') || cat.includes('owl')) {
        googleUrl += '&type=bar';
      } else if (cat.includes('art')) {
        googleUrl += '&type=art_gallery';
      } else if (cat.includes('culture')) {
        googleUrl += '&type=museum';
      } else if (cat.includes('spot')) {
        googleUrl += '&type=tourist_attraction';
      }
    }

    const googleRes = await fetch(googleUrl);
    if (!googleRes.ok) {
      console.error('Google Places Nearby Search returned status:', googleRes.status);
      return new Response(JSON.stringify({ places: [] }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const googleData = await googleRes.json();

    if (googleData.status !== 'OK' || !Array.isArray(googleData.results) || googleData.results.length === 0) {
      // Clean empty results for ZERO_RESULTS or unhandled status
      return new Response(JSON.stringify({ places: [] }), {
        status: 200,
        headers: { ...cors, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';

    const places = googleData.results.map((item: any) => {
      const mappedCategory = mapGoogleTypesToCategory(item.types);
      const photoRef = item.photos?.[0]?.photo_reference;

      // Use the Edge Function photo proxy so the API key is never sent to the client browser
      const imageUrl = photoRef && supabaseUrl
        ? `${supabaseUrl}/functions/v1/nearby-places?photo_reference=${encodeURIComponent(photoRef)}`
        : CATEGORY_FALLBACK_IMAGES[mappedCategory];

      const rating = typeof item.rating === 'number' ? item.rating : 4.5;
      const reviewsCount = typeof item.user_ratings_total === 'number' ? item.user_ratings_total : 0;
      const isLegendary = rating >= 4.5 && reviewsCount >= 40;

      const priceBands = ['Free', 'TND 1–10', 'TND 10–25', 'TND 25–50', 'TND 50+'];
      const priceBand = item.price_level !== undefined ? priceBands[item.price_level] || 'TND 10–30' : 'TND 10–30';

      return {
        id: item.place_id,
        title: item.name || 'Vibe Waypoint',
        category: mappedCategory,
        description: item.vicinity ? `Discoverable venue in ${item.vicinity}.` : 'Verified local spot on Google Places.',
        image_url: imageUrl,
        lat: item.geometry?.location?.lat,
        lng: item.geometry?.location?.lng,
        address: item.vicinity || item.formatted_address || 'Nearby Spot',
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
        ai_match_score: Math.min(98, Math.max(65, Math.round(68 + (rating - 3) * 15)))
      };
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
