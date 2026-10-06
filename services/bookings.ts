import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';

import { db } from './firebase';
import type { Booking, RoomSlot } from '../types/booking';
import type { Room } from '../types/room';

const BOOKINGS = 'bookings';
const ROOM_SLOTS = 'roomSlots';

export function getSlotIds(roomId: string, day: string, startHour: number, durationHours: number) {
  return Array.from({ length: durationHours }, (_, index) =>
    `${roomId}_${day}_${String(startHour + index).padStart(2, '0')}`,
  );
}

export function subscribeToRoomSlots(
  roomId: string,
  day: string,
  onSlots: (slots: RoomSlot[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(
      collection(db, ROOM_SLOTS),
      where('roomId', '==', roomId),
      where('day', '==', day),
    ),
    (snapshot) => {
      onSlots(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as RoomSlot));
    },
    onError,
  );
}

export function subscribeToMyBookings(
  userId: string,
  onBookings: (bookings: Booking[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, BOOKINGS), where('userId', '==', userId)),
    (snapshot) => {
      const bookings = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Booking);
      bookings.sort((left, right) => (right.createdAt?.toMillis() ?? 0) - (left.createdAt?.toMillis() ?? 0));
      onBookings(bookings);
    },
    onError,
  );
}

export function subscribeToAllBookings(
  onBookings: (bookings: Booking[]) => void,
  onError: (error: Error) => void,
) {
  return onSnapshot(
    query(collection(db, BOOKINGS), orderBy('createdAt', 'desc')),
    (snapshot) => {
      onBookings(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as Booking));
    },
    onError,
  );
}

export async function bookRoom(
  room: Room,
  userId: string,
  userEmail: string,
  day: string,
  startHour: number,
  durationHours: number,
) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Ngày phải theo định dạng YYYY-MM-DD.');
  if (!Number.isInteger(startHour) || startHour < 0 || startHour > 23) {
    throw new Error('Giờ bắt đầu không hợp lệ.');
  }
  if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 8) {
    throw new Error('Thời lượng phải từ 1 đến 8 giờ.');
  }
  if (startHour + durationHours > 24) throw new Error('Lịch đặt không thể vượt quá 24:00.');

  const [year, month, dayOfMonth] = day.split('-').map(Number);
  const startAt = new Date(year, month - 1, dayOfMonth, startHour, 0, 0, 0);
  const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);
  if (
    Number.isNaN(startAt.getTime()) ||
    startAt.getFullYear() !== year ||
    startAt.getMonth() !== month - 1 ||
    startAt.getDate() !== dayOfMonth
  ) {
    throw new Error('Ngày đặt không hợp lệ.');
  }
  if (startAt.getTime() <= Date.now()) throw new Error('Không thể đặt vào thời gian đã qua.');

  const slotIds = getSlotIds(room.id, day, startHour, durationHours);
  const bookingRef = doc(collection(db, BOOKINGS));
  const roomRef = doc(db, 'rooms', room.id);

  await runTransaction(db, async (transaction) => {
    const roomSnapshot = await transaction.get(roomRef);
    if (!roomSnapshot.exists()) throw new Error('Phòng không còn tồn tại.');

    const slotRefs = slotIds.map((slotId) => doc(db, ROOM_SLOTS, slotId));
    const slotSnapshots = await Promise.all(slotRefs.map((slotRef) => transaction.get(slotRef)));
    if (slotSnapshots.some((snapshot) => snapshot.exists())) {
      throw new Error('Một hoặc nhiều giờ đã có người đặt. Hãy chọn giờ khác.');
    }

    transaction.set(bookingRef, {
      roomId: room.id,
      roomName: room.name,
      building: room.building,
      userId,
      userEmail,
      day,
      startHour,
      durationHours,
      slotIds,
      startsAt: Timestamp.fromDate(startAt),
      endsAt: Timestamp.fromDate(endAt),
      status: 'active',
      createdAt: serverTimestamp(),
      cancelledAt: null,
    });

    slotRefs.forEach((slotRef, index) => {
      transaction.set(slotRef, {
        roomId: room.id,
        day,
        hour: startHour + index,
        bookingId: bookingRef.id,
        userId,
      });
    });
  });

  return bookingRef.id;
}

export async function cancelBooking(booking: Booking, userId: string) {
  if (booking.userId !== userId) throw new Error('Chỉ người đặt mới có thể hủy lịch này.');
  if (booking.status !== 'active') throw new Error('Lịch đặt này đã được hủy.');
  if (booking.startsAt && booking.startsAt.toMillis() <= Date.now()) {
    throw new Error('Không thể hủy lịch đã bắt đầu.');
  }

  const bookingRef = doc(db, BOOKINGS, booking.id);
  await runTransaction(db, async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists() || bookingSnapshot.data().status !== 'active') {
      throw new Error('Lịch vừa thay đổi. Hãy tải lại danh sách.');
    }
    const startsAt = bookingSnapshot.data().startsAt as Timestamp | undefined;
    if (startsAt && startsAt.toMillis() <= Date.now()) {
      throw new Error('Không thể hủy lịch đã bắt đầu.');
    }

    const slotRefs = booking.slotIds.map((slotId) => doc(db, ROOM_SLOTS, slotId));
    const slotSnapshots = await Promise.all(slotRefs.map((slotRef) => transaction.get(slotRef)));

    transaction.update(bookingRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
    });
    slotSnapshots.forEach((snapshot, index) => {
      if (snapshot.exists() && snapshot.data().bookingId === booking.id) {
        transaction.delete(slotRefs[index]);
      }
    });
  });
}

export async function managerCancelBooking(bookingId: string, slotIds: string[]) {
  const bookingRef = doc(db, BOOKINGS, bookingId);
  await runTransaction(db, async (transaction) => {
    const bookingSnapshot = await transaction.get(bookingRef);
    if (!bookingSnapshot.exists() || bookingSnapshot.data().status !== 'active') {
      throw new Error('Lịch vừa thay đổi hoặc đã được hủy.');
    }

    const slotRefs = slotIds.map((slotId) => doc(db, ROOM_SLOTS, slotId));
    const slotSnapshots = await Promise.all(slotRefs.map((slotRef) => transaction.get(slotRef)));
    transaction.update(bookingRef, {
      status: 'cancelled',
      cancelledAt: serverTimestamp(),
    });
    slotSnapshots.forEach((snapshot, index) => {
      if (snapshot.exists() && snapshot.data().bookingId === bookingId) {
        transaction.delete(slotRefs[index]);
      }
    });
  });
}
