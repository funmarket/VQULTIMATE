export interface CaptureSession {
  sceneImageUrl: string | null;
  selfieImageUrl: string | null;
  compositeImageUrl: string | null;
  caption: string;
  placeId?: string;
  timestamp: string;
}

export interface SharePostPayload {
  user_id: string;
  username: string;
  avatar_url: string;
  caption: string;
  image_url: string;
  selfie_url: string;
  composite_url: string;
  lat: number;
  lng: number;
  place_id?: string;
  destination?: 'gossip' | 'squad' | 'orbit';
}

