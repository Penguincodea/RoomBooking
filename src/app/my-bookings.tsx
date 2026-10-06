import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../components/Motion';
import { useAuth } from '../../contexts/AuthContext';
import { cancelBooking, subscribeToMyBookings } from '../../services/bookings';
import type { Booking } from '../../types/booking';

export default function MyBookingsScreen() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyBookingId, setBusyBookingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    return subscribeToMyBookings(
      user.uid,
      (nextBookings) => {
        setBookings(nextBookings);
        setLoading(false);
      },
      (subscriptionError) => {
        setError(subscriptionError.message || 'Không tải được lịch đặt.');
        setLoading(false);
      },
    );
  }, [user]);

  const handleCancel = async (booking: Booking) => {
    if (!user || busyBookingId) return;
    setError('');
    setMessage('');
    setBusyBookingId(booking.id);
    try {
      await cancelBooking(booking, user.uid);
      setMessage('Đã hủy lịch đặt.');
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : 'Không thể hủy lịch đặt.');
    } finally {
      setBusyBookingId('');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FadeInView style={styles.header}>
        <PressableScale accessibilityRole="button" accessibilityLabel="Quay lại" onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backArrow}>‹</Text>
        </PressableScale>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>TÀI KHOẢN KHÁCH</Text>
          <Text style={styles.title}>Lịch của tôi</Text>
        </View>
        <View style={styles.backSpacer} />
      </FadeInView>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#176B59" />
          <Text style={styles.muted}>Đang tải lịch...</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={<Text style={styles.empty}>Bạn chưa có lịch đặt nào.</Text>}
          renderItem={({ item }) => (
            <View style={styles.booking}>
              <View style={styles.bookingHeading}>
                <Text style={styles.roomName}>{item.roomName}</Text>
                <View style={[styles.statusBadge, item.status === 'active' ? styles.activeBadge : styles.cancelledBadge]}>
                  <Text style={[styles.statusText, item.status === 'active' ? styles.activeText : styles.cancelledText]}>
                    {item.status === 'active' ? 'Đang đặt' : 'Đã hủy'}
                  </Text>
                </View>
              </View>
              <Text style={styles.building}>{item.building}</Text>
              <Text style={styles.time}>{item.day} · {String(item.startHour).padStart(2, '0')}:00–{String(item.startHour + item.durationHours).padStart(2, '0')}:00</Text>
              {item.status === 'active' ? (
                <PressableScale disabled={busyBookingId === item.id} onPress={() => void handleCancel(item)} style={styles.cancelButton}>
                  {busyBookingId === item.id ? <ActivityIndicator color="#A9473B" /> : <Text style={styles.cancelText}>Hủy lịch</Text>}
                </PressableScale>
              ) : null}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F3' },
  header: { height: 66, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 8, marginBottom: 12 },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#E7ECE7' },
  backArrow: { marginTop: -3, color: '#1A2922', fontSize: 34, lineHeight: 38 },
  headerCopy: { flex: 1, paddingHorizontal: 12 },
  eyebrow: { color: '#176B59', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 3, color: '#1A2922', fontSize: 20, fontWeight: '800' },
  backSpacer: { width: 40 },
  list: { paddingHorizontal: 16, paddingBottom: 28 },
  separator: { height: 10 },
  booking: { padding: 15, borderRadius: 11, backgroundColor: '#FFFFFF' },
  bookingHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  roomName: { flex: 1, color: '#203028', fontSize: 16, fontWeight: '800' },
  statusBadge: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 99 },
  activeBadge: { backgroundColor: '#D9F0E1' },
  cancelledBadge: { backgroundColor: '#ECE9E6' },
  statusText: { fontSize: 10, fontWeight: '800' },
  activeText: { color: '#236744' },
  cancelledText: { color: '#6D716D' },
  building: { marginTop: 5, color: '#68756D', fontSize: 13 },
  time: { marginTop: 11, color: '#33463A', fontSize: 14, fontWeight: '700' },
  cancelButton: { minHeight: 39, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 12, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FBEAE6' },
  cancelText: { color: '#A9473B', fontSize: 12, fontWeight: '800' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  muted: { marginTop: 8, color: '#69766E', fontSize: 13 },
  empty: { padding: 22, color: '#748078', fontSize: 14, textAlign: 'center' },
  error: { marginHorizontal: 18, marginBottom: 8, color: '#A33A32', fontSize: 13 },
  message: { marginHorizontal: 18, marginBottom: 8, color: '#226343', fontSize: 13 },
});
