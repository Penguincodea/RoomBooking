import React, { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs } from 'firebase/firestore';

import RoomCard from './components/RoomCard';
import { db } from './services/firebase';

type Room = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  available?: boolean;
};

const FILTERS = ['Tất cả', 'Tòa A3', 'Tòa B1', 'Trống'];

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'rooms'));
        const roomList: Room[] = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Room[];

        setRooms(roomList);
      } catch (error) {
        console.error('Error fetching rooms:', error);
        setLoadError(
          'Không tải được phòng. Kiểm tra Firebase config và Firestore Rules.',
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();
  }, []);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLowerCase().includes(keyword) ||
        room.building.toLowerCase().includes(keyword);

      const matchesFilter =
        activeFilter === 'Tất cả'
          ? true
          : activeFilter === 'Trống'
            ? room.available === true
            : room.building === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchText, activeFilter]);

  const renderRoomItem: ListRenderItem<Room> = ({ item }) => (
    <RoomCard
      name={item.name}
      building={item.building}
      capacity={item.capacity}
    />
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <Text style={styles.header}>Study Room Booking</Text>

          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Tìm phòng hoặc tòa nhà..."
            placeholderTextColor="#9CA3AF"
            style={styles.searchInput}
          />

          <View style={styles.filterWrap}>
            <FlatList
              data={FILTERS}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item}
              contentContainerStyle={styles.filterList}
              renderItem={({ item }) => {
                const selected = item === activeFilter;

                return (
                  <TouchableOpacity
                    style={[styles.filterChip, selected && styles.filterChipActive]}
                    onPress={() => setActiveFilter(item)}
                  >
                    <Text style={[styles.filterText, selected && styles.filterTextActive]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Đang tải danh sách phòng...</Text>
            </View>
          ) : loadError ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.errorText}>{loadError}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredRooms}
              renderItem={renderRoomItem}
              keyExtractor={(item) => item.id}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không tìm thấy phòng phù hợp.</Text>
                </View>
              }
            />
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterWrap: {
    marginBottom: 8,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingRight: 24,
  },
  filterChip: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#1D4ED8',
  },
  filterText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  separator: {
    height: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#4B5563',
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
