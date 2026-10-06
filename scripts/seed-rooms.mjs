import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const app = initializeApp({
  credential: applicationDefault(),
  projectId: 'study-room-booking-9107b',
});
const db = getFirestore(app);

const initialRooms = [
  ['lab-a3-101', 'Lab A3-101', 'Tòa A3', 12],
  ['lab-a3-102', 'Lab A3-102', 'Tòa A3', 10],
  ['lab-a3-103', 'Lab A3-103', 'Tòa A3', 8],
  ['lab-a3-104', 'Lab A3-104', 'Tòa A3', 14],
  ['room-b1-201', 'Room B1-201', 'Tòa B1', 16],
  ['room-b1-202', 'Room B1-202', 'Tòa B1', 9],
  ['room-b1-203', 'Room B1-203', 'Tòa B1', 11],
  ['room-b1-204', 'Room B1-204', 'Tòa B1', 7],
  ['room-c2-301', 'Room C2-301', 'Tòa C2', 15],
  ['room-c2-302', 'Room C2-302', 'Tòa C2', 13],
  ['room-c2-303', 'Room C2-303', 'Tòa C2', 6],
  ['room-c2-304', 'Room C2-304', 'Tòa C2', 18],
  ['room-d4-401', 'Room D4-401', 'Tòa D4', 20],
  ['room-d4-402', 'Room D4-402', 'Tòa D4', 12],
  ['room-d4-403', 'Room D4-403', 'Tòa D4', 8],
  ['room-d4-404', 'Room D4-404', 'Tòa D4', 10],
  ['room-e5-501', 'Room E5-501', 'Tòa E5', 14],
  ['room-e5-502', 'Room E5-502', 'Tòa E5', 9],
  ['room-e5-503', 'Room E5-503', 'Tòa E5', 11],
  ['room-e5-504', 'Room E5-504', 'Tòa E5', 17],
];

const additionalBuildings = [
  ['A1', 'Tòa A1'],
  ['A2', 'Tòa A2'],
  ['A4', 'Tòa A4'],
  ['B2', 'Tòa B2'],
  ['B3', 'Tòa B3'],
  ['C1', 'Tòa C1'],
  ['C3', 'Tòa C3'],
  ['D1', 'Tòa D1'],
  ['D2', 'Tòa D2'],
  ['E1', 'Tòa E1'],
];

const additionalRooms = additionalBuildings.flatMap(([code, building], buildingIndex) =>
  Array.from({ length: 10 }, (_, roomIndex) => {
    const roomNumber = 101 + roomIndex;
    const id = `extra-${code.toLowerCase()}-${roomNumber}`;
    const name = `Study ${code}-${roomNumber}`;
    const capacity = 6 + ((buildingIndex * 3 + roomIndex * 2) % 15);
    return [id, name, building, capacity];
  }),
);

const rooms = [...initialRooms, ...additionalRooms];
const buildingNames = [...new Set(rooms.map(([, , building]) => building))];
const buildingIds = new Map();
let buildingsCreated = 0;
let buildingsFound = 0;

for (const name of buildingNames) {
  const existingBuildings = await db
    .collection('buildings')
    .where('name', '==', name)
    .limit(1)
    .get();

  if (!existingBuildings.empty) {
    buildingIds.set(name, existingBuildings.docs[0].id);
    buildingsFound += 1;
    continue;
  }

  const id = `building-${name.toLowerCase().replace(/\s+/g, '-')}`;
  const buildingRef = db.collection('buildings').doc(id);
  await db.runTransaction(async (transaction) => {
    const existingBuilding = await transaction.get(buildingRef);
    if (!existingBuilding.exists) transaction.create(buildingRef, { name });
  });
  buildingIds.set(name, id);
  buildingsCreated += 1;
}

let roomsCreated = 0;
let roomsAlreadyPresent = 0;

for (const [id, name, building, capacity] of rooms) {
  const roomRef = db.collection('rooms').doc(id);
  const buildingId = buildingIds.get(building);
  const result = await db.runTransaction(async (transaction) => {
    const existingRoom = await transaction.get(roomRef);
    if (existingRoom.exists) {
      if (!existingRoom.data().buildingId) {
        transaction.update(roomRef, { buildingId });
      }
      return 'existing';
    }

    transaction.create(roomRef, {
      name,
      building,
      buildingId,
      capacity,
      description: `Phòng tự học tại ${building}, sức chứa ${capacity} chỗ.`,
      available: true,
      bookedAt: null,
    });
    return 'created';
  });

  if (result === 'created') roomsCreated += 1;
  else roomsAlreadyPresent += 1;
}

console.log(`Seed complete for ${app.options.projectId}.`);
console.log(`Buildings: ${buildingsCreated} created, ${buildingsFound} already existed.`);
console.log(`Rooms: ${roomsCreated} created, ${roomsAlreadyPresent} already existed.`);
