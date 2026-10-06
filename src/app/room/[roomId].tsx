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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { FadeInView, PressableScale } from '../../../components/Motion';
import { useAuth } from '../../../contexts/AuthContext';
import { bookRoom, getSlotIds, subscribeToRoomSlots } from '../../../services/bookings';
import { subscribeToRoom } from '../../../services/rooms';
import type { RoomSlot } from '../../../types/booking';
import type { Room } from '../../../types/room';

const START_HOURS = Array.from({ length: 17 }, (_, index) => index + 7);
const DURATIONS = [1, 2, 3, 4];

function localDayString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function RoomDetailScreen() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const resolvedRoomId = Array.isArray(roomId) ? roomId[0] : roomId;
  const router = useRouter();
  const { user, profile } = useAuth();
  const [room, setRoom] = useState<Room | null>(null);
  const [slots, setSlots] = useState<RoomSlot[]>([]);
  const [day, setDay] = useState(localDayString);
  const [startHour, setStartHour] = useState(9);
  const [durationHours, setDurationHours] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!resolvedRoomId) return;

    return subscribeToRoom(
      resolvedRoomId,
      (nextRoom) => {
        setRoom(nextRoom);
        setLoading(false);
        setError(nextRoom ? '' : 'Phòng này không còn tồn tại.');
      },
      (subscriptionError) => {
        setError(subscriptionError.message || 'Không tải được thông tin phòng.');
        setLoading(false);
      },
    );
  }, [resolvedRoomId]);

  useEffect(() => {
    if (!resolvedRoomId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;

    return subscribeToRoomSlots(
      resolvedRoomId,
      day,
      setSlots,
      (subscriptionError) => setError(subscriptionError.message || 'Không tải được lịch phòng.'),
    );
  }, [day, resolvedRoomId]);

  const visibleSlots = useMemo(() => slots.filter((slot) => slot.day === day), [day, slots]);
  const bookedHours = useMemo(() => new Set(visibleSlots.map((slot) => slot.hour)), [visibleSlots]);
  const requestedSlotIds = resolvedRoomId
    ? getSlotIds(resolvedRoomId, day, startHour, durationHours)
    : [];
  const selectedTimeBooked = requestedSlotIds.some((slotId) => visibleSlots.some((slot) => slot.id === slotId));
  const isManager = profile?.role === 'manager';

  const submitBooking = async () => {
    if (!room || !user || saving || isManager) return;
    setError('');
    setNotice('');
    setSaving(true);
    try {
      await bookRoom(room, user.uid, user.email ?? '', day, startHour, durationHours);
      setNotice(`Đã đặt ${room.name} ngày ${day}, ${String(startHour).padStart(2, '0')}:00.`);
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : 'Không thể đặt phòng.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <FadeInView style={styles.topBar}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </PressableScale>
        <Text style={styles.topBarTitle}>Chi tiết phòng</Text>
        <PressableScale accessibilityRole="button" onPress={() => router.push('/my-bookings')} style={styles.topAction}>
          <Text style={styles.topActionText}>Lịch của tôi</Text>
        </PressableScale>
      </FadeInView>

      {!resolvedRoomId ? (
        <View style={styles.centerState}><Text style={styles.errorText}>Không tìm thấy mã phòng.</Text></View>
      ) : loading ? (
        <View style={styles.centerState}><ActivityIndicator color="#176B59" /><Text style={styles.mutedText}>Đang tải thông tin phòng...</Text></View>
      ) : room ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.kicker}>PHÒNG HỌC</Text>
            <Text style={styles.roomName}>{room.name}</Text>
            <Text style={styles.building}>{room.building}</Text>
            <Text style={styles.capacity}>{room.capacity} chỗ ngồi</Text>
            {room.description ? <Text style={styles.description}>{room.description}</Text> : null}
          </View>

          <View style={styles.bookingSection}>
            <View style={styles.sectionHeading}>
              <Text style={styles.sectionTitle}>Chọn lịch đặt</Text>
              <Text style={styles.liveLabel}>● Trực tiếp</Text>
            </View>
            <Text style={styles.fieldLabel}>Ngày · YYYY-MM-DD</Text>
            <TextInput
              value={day}
              onChangeText={setDay}
              placeholder="2026-10-05"
              placeholderTextColor="#89948D"
              style={styles.dateInput}
              autoCapitalize="none"
              maxLength={10}
            />
            <Text style={styles.fieldLabel}>Giờ bắt đầu</Text>
            <FlatList
              horizontal
              data={START_HOURS}
              keyExtractor={(hour) => String(hour)}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.optionsRow}
              renderItem={({ item }) => {
                const selected = item === startHour;
                const occupied = bookedHours.has(item);
                return (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled: occupied }}
                    disabled={occupied}
                    onPress={() => {
                      setStartHour(item);
                      void Haptics.selectionAsync();
                    }}
                    style={[styles.hourOption, selected && styles.optionSelected, occupied && styles.optionOccupied]}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected, occupied && styles.optionTextOccupied]}>
                      {String(item).padStart(2, '0')}:00
                    </Text>
                  </PressableScale>
                );
              }}
            />
            <Text style={styles.fieldLabel}>Thời lượng</Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((duration) => (
                <PressableScale
                  key={duration}
                  disabled={startHour + duration > 24}
                  onPress={() => {
                    setDurationHours(duration);
                    void Haptics.selectionAsync();
                  }}
                  style={[styles.durationOption, duration === durationHours && styles.optionSelected, startHour + duration > 24 && styles.optionDisabled]}
                >
                  <Text style={[styles.optionText, duration === durationHours && styles.optionTextSelected]}>{duration} giờ</Text>
                </PressableScale>
              ))}
            </View>
            <View style={styles.schedule}>
              <Text style={styles.scheduleTitle}>Lịch trong ngày</Text>
              <View style={styles.scheduleGrid}>
                {START_HOURS.slice(0, 14).map((hour) => (
                  <View key={hour} style={[styles.scheduleCell, bookedHours.has(hour) && styles.scheduleCellBooked]}>
                    <Text style={[styles.scheduleHour, bookedHours.has(hour) && styles.scheduleHourBooked]}>{String(hour).padStart(2, '0')}h</Text>
                    <Text style={[styles.scheduleStatus, bookedHours.has(hour) && styles.scheduleStatusBooked]}>
                      {bookedHours.has(hour) ? 'Đã đặt' : 'Trống'}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            {isManager ? <Text style={styles.mutedText}>Tài khoản quản lý không thể đặt phòng.</Text> : null}
            {notice ? <Text style={styles.noticeText}>{notice}</Text> : null}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {!isManager ? (
              <PressableScale
                accessibilityRole="button"
                disabled={saving || selectedTimeBooked || !/^\d{4}-\d{2}-\d{2}$/.test(day)}
                onPress={() => void submitBooking()}
                style={[styles.bookButton, (saving || selectedTimeBooked) && styles.buttonDisabled]}
              >
                {saving ? <ActivityIndicator color="#FFFFFF" /> : (
                  <Text style={styles.bookButtonText}>
                    {selectedTimeBooked ? 'Khung giờ đã có người đặt' : `Đặt ${durationHours} giờ`}
                  </Text>
                )}
              </PressableScale>
            ) : null}
          </View>
        </ScrollView>
      ) : (
        <View style={styles.centerState}><Text style={styles.errorText}>{error || 'Không tìm thấy phòng.'}</Text></View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F3' },
  topBar: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#E7ECE7' },
  backArrow: { marginTop: -3, color: '#1A2922', fontSize: 34, lineHeight: 38 },
  topBarTitle: { color: '#1A2922', fontSize: 15, fontWeight: '700' },
  topAction: { minWidth: 64, alignItems: 'flex-end', justifyContent: 'center' },
  topActionText: { color: '#176B59', fontSize: 12, fontWeight: '800' },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  hero: { padding: 20, borderRadius: 16, backgroundColor: '#E4EEE7' },
  kicker: { color: '#176B59', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  roomName: { marginTop: 8, color: '#1A2922', fontSize: 26, fontWeight: '800' },
  building: { marginTop: 4, color: '#647168', fontSize: 14 },
  capacity: { marginTop: 14, color: '#33463A', fontSize: 13, fontWeight: '700' },
  description: { marginTop: 9, color: '#647168', fontSize: 13, lineHeight: 19 },
  bookingSection: { marginTop: 24 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15 },
  sectionTitle: { color: '#1A2922', fontSize: 18, fontWeight: '800' },
  liveLabel: { color: '#26734F', fontSize: 11, fontWeight: '700' },
  fieldLabel: { marginBottom: 7, color: '#536158', fontSize: 12, fontWeight: '700' },
  dateInput: { height: 46, marginBottom: 16, paddingHorizontal: 13, borderWidth: 1, borderColor: '#D9E0DA', borderRadius: 10, backgroundColor: '#FFFFFF', color: '#1A2922', fontSize: 14 },
  optionsRow: { paddingBottom: 15 },
  hourOption: { minWidth: 62, height: 38, marginRight: 7, alignItems: 'center', justifyContent: 'center', borderRadius: 9, backgroundColor: '#E7ECE7' },
  optionSelected: { backgroundColor: '#176B59' },
  optionOccupied: { backgroundColor: '#F4DFD9' },
  optionDisabled: { opacity: 0.4 },
  optionText: { color: '#435047', fontSize: 12, fontWeight: '700' },
  optionTextSelected: { color: '#FFFFFF' },
  optionTextOccupied: { color: '#9A4036' },
  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  durationOption: { minWidth: 66, alignItems: 'center', paddingVertical: 9, borderRadius: 9, backgroundColor: '#E7ECE7' },
  schedule: { padding: 14, borderRadius: 12, backgroundColor: '#FFFFFF' },
  scheduleTitle: { marginBottom: 10, color: '#24352B', fontSize: 13, fontWeight: '800' },
  scheduleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scheduleCell: { width: '23%', minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 7, backgroundColor: '#E7F0E9' },
  scheduleCellBooked: { backgroundColor: '#F8E8E4' },
  scheduleHour: { color: '#285E40', fontSize: 11, fontWeight: '800' },
  scheduleHourBooked: { color: '#9A4036' },
  scheduleStatus: { marginTop: 2, color: '#67806F', fontSize: 9 },
  scheduleStatusBooked: { color: '#A45A50' },
  mutedText: { marginTop: 12, color: '#69766E', fontSize: 13, textAlign: 'center' },
  noticeText: { marginTop: 14, color: '#226343', fontSize: 13 },
  errorText: { marginTop: 12, color: '#A33A32', fontSize: 13, textAlign: 'center' },
  bookButton: { minHeight: 51, marginTop: 18, alignItems: 'center', justifyContent: 'center', borderRadius: 11, backgroundColor: '#176B59' },
  buttonDisabled: { opacity: 0.55 },
  bookButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
});
