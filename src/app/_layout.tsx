import { router, Stack, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../../contexts/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const currentRoute = segments[0];

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      if (currentRoute !== 'login') router.replace('/login');
      return;
    }

    if (currentRoute === 'login') {
      router.replace(profile.role === 'manager' ? '/manager' : '/');
    } else if (currentRoute === 'manager' && profile.role !== 'manager') {
      router.replace('/');
    }
  }, [currentRoute, loading, profile, user]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color="#176B59" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#F4F6F3' },
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
