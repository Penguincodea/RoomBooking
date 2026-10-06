import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PressableScale } from './Motion';

type RoomCardProps = {
  name: string;
  building: string;
  capacity: number;
  available?: boolean;
  onPress?: () => void;
};

export default function RoomCard({
  name,
  building,
  capacity,
  available,
  onPress,
}: RoomCardProps) {
  return (
    <PressableScale
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${name}, ${building}`}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.headerRow}>
        <Text style={styles.name}>{name}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{capacity} seats</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.building}>{building}</Text>
        {available === undefined ? null : (
          <View style={[styles.availability, available ? styles.available : styles.booked]}>
            <Text style={[styles.availabilityText, available ? styles.availableText : styles.bookedText]}>
              {available ? 'Trống' : 'Đã đặt'}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#EAEAF1',
  },
  cardPressed: {
    opacity: 0.82,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 12,
  },
  badge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '700',
  },
  building: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  availability: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  available: {
    backgroundColor: '#D9F0E1',
  },
  booked: {
    backgroundColor: '#FBE4DF',
  },
  availabilityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  availableText: {
    color: '#236744',
  },
  bookedText: {
    color: '#A13F35',
  },
});
