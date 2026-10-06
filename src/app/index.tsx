import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../components/Motion';
import RoomCard from '../../components/RoomCard';
import { useAuth } from '../../contexts/AuthContext';
import { logOut } from '../../services/auth';
import { subscribeToBuildings } from '../../services/management';
import { subscribeToRooms } from '../../services/rooms';
import type { Building } from '../../types/building';
import type { Room } from '../../types/room';

export default function RoomListScreen() {
  const { profile } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [searchText, setSearchText] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    return subscribeToRooms(
      (nextRooms) => {
        setRooms(nextRooms);
        setLoading(false);
        setLoadError('');
      },
      (error) => {
        console.error('Failed to subscribe to rooms:', error);
        setLoadError(error.message || 'Không tải được danh sách phòng.');
        setLoading(false);
      },
    );
  }, []);

  useEffect(() => subscribeToBuildings(setBuildings, (error) => setLoadError(error.message)), []);

  const filters = useMemo(() => ['Tất cả', ...buildings.map((building) => building.name)], [buildings]);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLocaleLowerCase();

    return rooms.filter((room) => {
      const matchesSearch =
        room.name.toLocaleLowerCase().includes(keyword) ||
        room.building.toLocaleLowerCase().includes(keyword);
      const matchesFilter =
        activeFilter === 'Tất cả' ||
        room.building === activeFilter;

      return matchesSearch && matchesFilter;
    });
  }, [activeFilter, rooms, searchText]);

  const renderRoom: ListRenderItem<Room> = ({ item }) => (
    <RoomCard
      name={item.name}
      building={item.building}
      capacity={item.capacity}
      onPress={() =>
        router.push({ pathname: '/room/[roomId]', params: { roomId: item.id } })
      }
    />
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FadeInView style={styles.headerBlock}>
        <Text style={styles.eyebrow}>VKU · STUDY SPACES</Text>
        <Text style={styles.title}>Tìm phòng học</Text>
        <Text style={styles.subtitle}>Chọn không gian phù hợp cho buổi học của bạn.</Text>
        <View style={styles.accountActions}>
          <Text style={styles.accountEmail} numberOfLines={1}>{profile?.email}</Text>
          <PressableScale onPress={() => router.push('/my-bookings')} style={styles.accountButton}>
            <Text style={styles.accountButtonText}>Lịch của tôi</Text>
          </PressableScale>
          {profile?.role === 'manager' ? (
            <PressableScale onPress={() => router.push('/manager')} style={styles.accountButton}>
              <Text style={styles.accountButtonText}>Quản lý</Text>
            </PressableScale>
          ) : null}
          <PressableScale onPress={() => void logOut()} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Thoát</Text>
          </PressableScale>
        </View>
        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Tìm tên phòng hoặc tòa nhà"
          placeholderTextColor="#788078"
          style={styles.searchInput}
          accessibilityLabel="Tìm tên phòng hoặc tòa nhà"
          returnKeyType="search"
        />
        <FlatList
              data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => {
            const selected = item === activeFilter;
            return (
              <PressableScale
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => {
                  setActiveFilter(item);
                  void Haptics.selectionAsync();
                }}
                style={[styles.filterChip, selected && styles.filterChipSelected]}
              >
                <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
                  {item}
                </Text>
              </PressableScale>
            );
          }}
        />
      </FadeInView>

      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#176B59" />
          <Text style={styles.stateText}>Đang tải phòng...</Text>
        </View>
      ) : loadError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>Không thể tải dữ liệu</Text>
          <Text style={styles.errorText}>{loadError}</Text>
          <Text style={styles.stateHint}>Kiểm tra kết nối và Firestore Rules.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item.id}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <Text style={styles.emptyTitle}>Chưa có phòng phù hợp</Text>
              <Text style={styles.stateText}>Thử đổi từ khóa hoặc bộ lọc.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F3',
  },
  headerBlock: {
    paddingTop: 12,
  },
  eyebrow: {
    marginHorizontal: 20,
    color: '#176B59',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginHorizontal: 20,
    marginTop: 6,
    color: '#1A2922',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    marginHorizontal: 20,
    marginTop: 4,
    marginBottom: 18,
    color: '#66736B',
    fontSize: 14,
  },
  accountActions: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  accountEmail: {
    flex: 1,
    color: '#68756D',
    fontSize: 11,
  },
  accountButton: {
    marginLeft: 6,
    paddingHorizontal: 9,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5ECE6',
  },
  accountButtonText: {
    color: '#176B59',
    fontSize: 10,
    fontWeight: '800',
  },
  logoutButton: {
    marginLeft: 5,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  logoutText: {
    color: '#A9473B',
    fontSize: 10,
    fontWeight: '800',
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D9E0DA',
    backgroundColor: '#FFFFFF',
    color: '#1A2922',
    fontSize: 15,
  },
  filterList: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  filterChip: {
    marginRight: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#E6EBE6',
  },
  filterChipSelected: {
    backgroundColor: '#176B59',
  },
  filterText: {
    color: '#3D4A42',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 28,
  },
  separator: {
    height: 12,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  stateText: {
    marginTop: 9,
    color: '#69766E',
    fontSize: 14,
    textAlign: 'center',
  },
  stateHint: {
    marginTop: 6,
    color: '#879189',
    fontSize: 12,
    textAlign: 'center',
  },
  errorTitle: {
    color: '#A33A32',
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorText: {
    marginTop: 8,
    color: '#803A35',
    fontSize: 13,
    textAlign: 'center',
  },
  emptyTitle: {
    color: '#1A2922',
    fontSize: 17,
    fontWeight: '800',
  },
});
