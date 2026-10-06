import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { db } from './firebase';
import type { Building } from '../types/building';
import type { Room } from '../types/room';

export function subscribeToBuildings(
  onBuildings: (buildings: Building[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    collection(db, 'buildings'),
    (snapshot) => {
      onBuildings(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Building));
    },
    onError,
  );
}

export function createBuilding(name: string) {
  return addDoc(collection(db, 'buildings'), {
    name: name.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function renameBuilding(building: Building, name: string) {
  const nextName = name.trim();
  const [linkedRooms, legacyRooms] = await Promise.all([
    getDocs(query(collection(db, 'rooms'), where('buildingId', '==', building.id))),
    getDocs(query(collection(db, 'rooms'), where('building', '==', building.name))),
  ]);
  const batch = writeBatch(db);
  batch.update(doc(db, 'buildings', building.id), { name: nextName });
  const roomRefs = new Map([...linkedRooms.docs, ...legacyRooms.docs].map((room) => [room.id, room.ref]));
  roomRefs.forEach((roomRef) => batch.update(roomRef, { building: nextName, buildingId: building.id }));
  await batch.commit();
}

export async function deleteBuilding(building: Building) {
  const rooms = await getDocs(
    query(collection(db, 'rooms'), where('buildingId', '==', building.id)),
  );
  const legacyRooms = await getDocs(
    query(collection(db, 'rooms'), where('building', '==', building.name)),
  );
  if (!rooms.empty || !legacyRooms.empty) {
    throw new Error('Hãy chuyển hoặc xóa các phòng thuộc tòa nhà trước.');
  }
  await deleteDoc(doc(db, 'buildings', building.id));
}

export async function createRoom(input: {
  name: string;
  building: Building;
  capacity: number;
  description: string;
}) {
  return addDoc(collection(db, 'rooms'), {
    name: input.name.trim(),
    building: input.building.name,
    buildingId: input.building.id,
    capacity: input.capacity,
    description: input.description.trim(),
    available: true,
    bookedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function updateRoom(
  room: Room,
  input: { name: string; building: Building; capacity: number; description: string },
) {
  await updateDoc(doc(db, 'rooms', room.id), {
    name: input.name.trim(),
    building: input.building.name,
    buildingId: input.building.id,
    capacity: input.capacity,
    description: input.description.trim(),
  });
}

export async function deleteRoom(roomId: string) {
  const slots = await getDocs(
    query(collection(db, 'roomSlots'), where('roomId', '==', roomId)),
  );
  if (!slots.empty) {
    throw new Error('Phòng đang có lịch đặt hoặc lịch sử slot; không thể xóa an toàn.');
  }
  await deleteDoc(doc(db, 'rooms', roomId));
}
