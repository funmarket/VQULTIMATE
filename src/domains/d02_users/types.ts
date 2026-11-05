export interface Guardian {
  id: string;
  name: string;
  district: string;
  avatar: string;
  badge: string;
  status: 'active' | 'patrolling' | 'resting';
  trustScore: number;
  lat: number;
  lng: number;
}
