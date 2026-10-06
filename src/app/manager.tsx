import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { FadeInView, PressableScale } from '../../components/Motion';
import { useAuth } from '../../contexts/AuthContext';
import { logOut } from '../../services/auth';
import {
  createBuilding,
  createRoom,
  deleteBuilding,
  deleteRoom,
  renameBuilding,
  subscribeToBuildings,
  updateRoom,
} from '../../services/management';
import { managerCancelBooking, subscribeToAllBookings } from '../../services/bookings';
import { subscribeToRooms } from '../../services/rooms';
import type { Booking } from '../../types/booking';
import type { Building } from '../../types/building';
import type { Room } from '../../types/room';

const SECTIONS = ['Phòng', 'Tòa nhà', 'Đặt chỗ'] as const;
type Section = (typeof SECTIONS)[number];

export default function ManagerScreen() {
  const { profile } = useAuth();
  const [section, setSection] = useState<Section>('Phòng');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [roomName, setRoomName] = useState('');
  const [capacity, setCapacity] = useState('12');
  const [description, setDescription] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => subscribeToRooms(setRooms, (value) => setError(value.message)), []);
  useEffect(() => subscribeToBuildings(setBuildings, (value) => setError(value.message)), []);
  useEffect(() => subscribeToAllBookings(setBookings, (value) => setError(value.message)), []);

  const selectedBuilding = useMemo(
    () => buildings.find((item) => item.id === buildingId) ?? null,
    [buildingId, buildings],
  );
  const activeBookings = bookings.filter((booking) => booking.status === 'active');

  const resetRoomForm = () => {
    setEditingRoom(null);
    setRoomName('');
    setCapacity('12');
    setDescription('');
    setBuildingId('');
  };

  const submitRoom = async () => {
    setError('');
    setMessage('');
    const parsedCapacity = Number(capacity);
    if (!roomName.trim() || !selectedBuilding || !Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setError('Nhập tên phòng, chọn tòa nhà và nhập sức chứa hợp lệ.');
      return;
    }

    setBusy(true);
    try {
      const input = { name: roomName, building: selectedBuilding, capacity: parsedCapacity, description };
      if (editingRoom) await updateRoom(editingRoom, input);
      else await createRoom(input);
      setMessage(editingRoom ? 'Đã cập nhật phòng.' : 'Đã thêm phòng.');
      resetRoomForm();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được phòng.');
    } finally {
      setBusy(false);
    }
  };

  const editRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomName(room.name);
    setCapacity(String(room.capacity));
    setDescription(room.description ?? '');
    setBuildingId(room.buildingId ?? buildings.find((item) => item.name === room.building)?.id ?? '');
    setSection('Phòng');
  };

  const submitBuilding = async () => {
    setError('');
    setMessage('');
    if (buildingName.trim().length < 2) {
      setError('Tên tòa nhà cần có ít nhất 2 ký tự.');
      return;
    }

    setBusy(true);
    try {
      if (editingBuilding) await renameBuilding(editingBuilding, buildingName);
      else await createBuilding(buildingName);
      setMessage(editingBuilding ? 'Đã đổi tên tòa nhà.' : 'Đã thêm tòa nhà.');
      setBuildingName('');
      setEditingBuilding(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không lưu được tòa nhà.');
    } finally {
      setBusy(false);
    }
  };

  const removeRoom = async (room: Room) => {
    setError('');
    setMessage('');
    try {
      await deleteRoom(room.id);
      setMessage(`Đã xóa ${room.name}.`);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Không xóa được phòng.');
    }
  };

  const removeBuilding = async (building: Building) => {
    setError('');
    setMessage('');
    try {
      await deleteBuilding(building);
      setMessage(`Đã xóa ${building.name}.`);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Không xóa được tòa nhà.');
    }
  };

  const cancelBooking = async (booking: Booking) => {
    setError('');
    setMessage('');
    try {
      await managerCancelBooking(booking.id, booking.slotIds);
      setMessage(`Đã hủy lịch ${booking.roomName}.`);
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Không hủy được lịch đặt.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>BẢNG ĐIỀU KHIỂN</Text>
          <Text style={styles.title}>Quản lý không gian</Text>
          <Text style={styles.account}>{profile?.email}</Text>
        </View>
        <PressableScale onPress={() => void logOut()} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </PressableScale>
      </FadeInView>

      <View style={styles.sectionBar}>
        {SECTIONS.map((item) => (
          <PressableScale
            key={item}
            onPress={() => {
              setSection(item);
              void Haptics.selectionAsync();
            }}
            style={[styles.sectionButton, section === item && styles.sectionSelected]}
          >
            <Text style={[styles.sectionText, section === item && styles.sectionTextSelected]}>
              {item}{item === 'Đặt chỗ' ? ` · ${activeBookings.length}` : ''}
            </Text>
          </PressableScale>
        ))}
      </View>

      {error ? <Text style={styles.feedbackError}>{error}</Text> : null}
      {message ? <Text style={styles.feedbackMessage}>{message}</Text> : null}

      {section === 'Phòng' ? (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={(
            <View style={styles.form}>
              <Text style={styles.formTitle}>{editingRoom ? 'Sửa phòng' : 'Thêm phòng'}</Text>
              <TextInput value={roomName} onChangeText={setRoomName} placeholder="Tên phòng" style={styles.input} />
              <Text style={styles.fieldLabel}>Tòa nhà</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.choiceRow}>
                {buildings.map((building) => (
                  <PressableScale
                    key={building.id}
                    onPress={() => setBuildingId(building.id)}
                    style={[styles.choice, buildingId === building.id && styles.choiceSelected]}
                  >
                    <Text style={[styles.choiceText, buildingId === building.id && styles.choiceTextSelected]}>{building.name}</Text>
                  </PressableScale>
                ))}
              </ScrollView>
              {!buildings.length ? <Text style={styles.hint}>Hãy thêm tòa nhà trước.</Text> : null}
              <TextInput value={capacity} onChangeText={setCapacity} placeholder="Sức chứa" keyboardType="number-pad" style={styles.input} />
              <TextInput value={description} onChangeText={setDescription} placeholder="Mô tả (không bắt buộc)" style={styles.input} />
              <View style={styles.formActions}>
                <PressableScale disabled={busy} onPress={() => void submitRoom()} style={styles.primaryButton}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{editingRoom ? 'Lưu thay đổi' : 'Thêm phòng'}</Text>}
                </PressableScale>
                {editingRoom ? <PressableScale onPress={resetRoomForm} style={styles.cancelEditButton}><Text style={styles.cancelEditText}>Bỏ sửa</Text></PressableScale> : null}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có phòng nào.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemTitle}>{item.name}</Text>
                <Text style={styles.itemSubtitle}>{item.building} · {item.capacity} chỗ</Text>
              </View>
              <PressableScale onPress={() => editRoom(item)} style={styles.smallAction}><Text style={styles.smallActionText}>Sửa</Text></PressableScale>
              <PressableScale onPress={() => void removeRoom(item)} style={styles.deleteAction}><Text style={styles.deleteText}>Xóa</Text></PressableScale>
            </View>
          )}
        />
      ) : section === 'Tòa nhà' ? (
        <FlatList
          data={buildings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={(
            <View style={styles.form}>
              <Text style={styles.formTitle}>{editingBuilding ? 'Đổi tên tòa nhà' : 'Thêm tòa nhà'}</Text>
              <TextInput value={buildingName} onChangeText={setBuildingName} placeholder="Tên tòa nhà, ví dụ Tòa A3" style={styles.input} />
              <View style={styles.formActions}>
                <PressableScale disabled={busy} onPress={() => void submitBuilding()} style={styles.primaryButton}>
                  {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>{editingBuilding ? 'Lưu thay đổi' : 'Thêm tòa nhà'}</Text>}
                </PressableScale>
                {editingBuilding ? <PressableScale onPress={() => { setEditingBuilding(null); setBuildingName(''); }} style={styles.cancelEditButton}><Text style={styles.cancelEditText}>Bỏ sửa</Text></PressableScale> : null}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có tòa nhà nào.</Text>}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <View style={styles.itemInfo}><Text style={styles.itemTitle}>{item.name}</Text></View>
              <PressableScale onPress={() => { setEditingBuilding(item); setBuildingName(item.name); }} style={styles.smallAction}><Text style={styles.smallActionText}>Sửa</Text></PressableScale>
              <PressableScale onPress={() => void removeBuilding(item)} style={styles.deleteAction}><Text style={styles.deleteText}>Xóa</Text></PressableScale>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.emptyText}>Chưa có lịch đặt.</Text>}
          renderItem={({ item }) => (
            <View style={styles.bookingItem}>
              <Text style={styles.itemTitle}>{item.roomName} · {item.building}</Text>
              <Text style={styles.itemSubtitle}>{item.day} · {String(item.startHour).padStart(2, '0')}:00–{String(item.startHour + item.durationHours).padStart(2, '0')}:00</Text>
              <Text style={styles.itemSubtitle}>{item.userEmail}</Text>
              <View style={styles.bookingFooter}>
                <Text style={[styles.bookingStatus, item.status === 'active' ? styles.activeStatus : styles.cancelledStatus]}>
                  {item.status === 'active' ? 'Đang đặt' : 'Đã hủy'}
                </Text>
                {item.status === 'active' ? <PressableScale onPress={() => void cancelBooking(item)} style={styles.deleteAction}><Text style={styles.deleteText}>Hủy lịch</Text></PressableScale> : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F3' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 14, paddingBottom: 18 },
  eyebrow: { color: '#176B59', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 4, color: '#1A2922', fontSize: 23, fontWeight: '800' },
  account: { marginTop: 4, color: '#718078', fontSize: 12 },
  logoutButton: { paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: '#E6EBE6' },
  logoutText: { color: '#344239', fontSize: 12, fontWeight: '700' },
  sectionBar: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 8, padding: 4, borderRadius: 11, backgroundColor: '#E7ECE7' },
  sectionButton: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 8 },
  sectionSelected: { backgroundColor: '#FFFFFF' },
  sectionText: { color: '#69766E', fontSize: 12, fontWeight: '700' },
  sectionTextSelected: { color: '#176B59' },
  feedbackError: { marginHorizontal: 18, marginBottom: 8, color: '#A33A32', fontSize: 13 },
  feedbackMessage: { marginHorizontal: 18, marginBottom: 8, color: '#226343', fontSize: 13 },
  listContent: { padding: 16, paddingBottom: 32 },
  form: { marginBottom: 18, padding: 16, borderRadius: 12, backgroundColor: '#E8EEE8' },
  formTitle: { marginBottom: 12, color: '#1A2922', fontSize: 16, fontWeight: '800' },
  input: { minHeight: 44, marginBottom: 9, paddingHorizontal: 12, borderWidth: 1, borderColor: '#D7DFD8', borderRadius: 9, backgroundColor: '#FFFFFF', color: '#1A2922', fontSize: 14 },
  fieldLabel: { marginBottom: 7, color: '#56645B', fontSize: 12, fontWeight: '700' },
  choiceRow: { paddingBottom: 10 },
  choice: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: '#FFFFFF' },
  choiceSelected: { backgroundColor: '#176B59' },
  choiceText: { color: '#435047', fontSize: 12, fontWeight: '700' },
  choiceTextSelected: { color: '#FFFFFF' },
  hint: { marginBottom: 8, color: '#77837B', fontSize: 12 },
  formActions: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 2 },
  primaryButton: { minHeight: 43, minWidth: 118, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 15, borderRadius: 9, backgroundColor: '#176B59' },
  primaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  cancelEditButton: { padding: 8 },
  cancelEditText: { color: '#56645B', fontSize: 13, fontWeight: '700' },
  separator: { height: 10 },
  listItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: '#FFFFFF' },
  itemInfo: { flex: 1, paddingRight: 8 },
  itemTitle: { color: '#203028', fontSize: 14, fontWeight: '800' },
  itemSubtitle: { marginTop: 5, color: '#728077', fontSize: 12 },
  smallAction: { paddingHorizontal: 10, paddingVertical: 8 },
  smallActionText: { color: '#176B59', fontSize: 12, fontWeight: '800' },
  deleteAction: { paddingHorizontal: 10, paddingVertical: 8 },
  deleteText: { color: '#A9473B', fontSize: 12, fontWeight: '800' },
  bookingItem: { padding: 14, borderRadius: 10, backgroundColor: '#FFFFFF' },
  bookingFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  bookingStatus: { fontSize: 12, fontWeight: '800' },
  activeStatus: { color: '#226343' },
  cancelledStatus: { color: '#8B6863' },
  emptyText: { padding: 18, color: '#748078', fontSize: 14, textAlign: 'center' },
});
