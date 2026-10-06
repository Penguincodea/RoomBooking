import {
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';

import { db } from './firebase';
import type { Room } from '../types/room';

const roomsCollection = collection(db, 'rooms');

export function subscribeToRooms(
  onRooms: (rooms: Room[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    roomsCollection,
    (snapshot) => {
      const rooms = snapshot.docs.map((roomDoc) => ({
        id: roomDoc.id,
        ...roomDoc.data(),
      })) as Room[];

      onRooms(rooms);
    },
    onError,
  );
}

export function subscribeToRoom(
  roomId: string,
  onRoom: (room: Room | null) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    doc(db, 'rooms', roomId),
    (snapshot) => {
      onRoom(
        snapshot.exists()
          ? ({ id: snapshot.id, ...snapshot.data() } as Room)
          : null,
      );
    },
    onError,
  );
}

