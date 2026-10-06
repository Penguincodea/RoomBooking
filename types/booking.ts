import type { Timestamp } from 'firebase/firestore';

export type Booking = {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  userId: string;
  userEmail: string;
  day: string;
  startHour: number;
  durationHours: number;
  slotIds: string[];
  startsAt: Timestamp;
  endsAt: Timestamp;
  status: 'active' | 'cancelled';
  createdAt?: Timestamp;
  cancelledAt?: Timestamp | null;
};

export type RoomSlot = {
  id: string;
  roomId: string;
  day: string;
  hour: number;
  bookingId: string;
  userId: string;
};
