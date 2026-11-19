/**
 * D05 Places: provider-neutral contribution contract.
 * Pure mapping only; no database writes, media uploads, or authorization decisions.
 * The executable D05 writer is gated on approved RLS and profile/auth reconciliation.
 */
export const PLACE_CATEGORIES = ['Food', 'Art', 'Spots', 'Culture', 'Night Owl'] as const;
export type PlaceCategory = typeof PLACE_CATEGORIES[number];

export interface PlaceContributionDraft {
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  createdBy: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
}

export interface PlaceInsert {
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  created_by: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  image_url: string | null;
}

export interface PlaceRow extends Omit<PlaceInsert, 'created_by'> {
  id: string;
  created_by: string | null;
}

export interface PlaceReadDto {
  id: string;
  name: string;
  category: PlaceCategory;
  lat: number;
  lng: number;
  description: string | null;
  address: string | null;
  phone: string | null;
  imageUrl: string | null;
  createdBy: string | null;
}

function optionalText(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized || null;
}

function requireCategory(value: string): asserts value is PlaceCategory {
  if (!(PLACE_CATEGORIES as readonly string[]).includes(value)) {
    throw new Error('Invalid place category');
  }
}

function checkPosition(lat: number, lng: number): void {
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
    throw new Error('Invalid latitude');
  }
  if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
    throw new Error('Invalid longitude');
  }
}

export function buildPlaceInsert(input: PlaceContributionDraft): PlaceInsert {
  const name = input.name.trim();
  const createdBy = input.createdBy.trim();
  if (!name) throw new Error('Place name is required');
  if (!createdBy) throw new Error('Place creator profile ID is required');
  requireCategory(input.category);
  checkPosition(input.lat, input.lng);
  const imageUrl = optionalText(input.imageUrl);
  if (imageUrl) {
    let url: URL;
    try { url = new URL(imageUrl); } catch { throw new Error('Invalid image URL'); }
    if (url.protocol !== 'https:') throw new Error('Invalid image URL: HTTPS required');
  }
  // Do not submit a timestamp identifier, invented ratings, review counts, or fallback address.
  return {
    name,
    category: input.category,
    lat: input.lat,
    lng: input.lng,
    created_by: createdBy,
    description: optionalText(input.description),
    address: optionalText(input.address),
    phone: optionalText(input.phone),
    image_url: imageUrl
  };
}

export function normalizePlaceRecord(row: PlaceRow): PlaceReadDto {
  if (!row.id || !row.name?.trim()) throw new Error('Invalid persisted Place identity');
  requireCategory(row.category);
  checkPosition(row.lat, row.lng);
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    lat: row.lat,
    lng: row.lng,
    description: optionalText(row.description),
    address: optionalText(row.address),
    phone: optionalText(row.phone),
    imageUrl: optionalText(row.image_url),
    createdBy: row.created_by || null
  };
}

