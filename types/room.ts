import type { Timestamp } from 'firebase/firestore';

export type Room = {
  id: string;
  name: string;
  building: string;
  buildingId?: string;
  capacity: number;
  available: boolean;
  description?: string;
  bookedAt?: Timestamp | null;
};
