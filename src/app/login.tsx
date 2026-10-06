import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FadeInView, PressableScale } from '../../components/Motion';
import { useAuth } from '../../contexts/AuthContext';
import { logOut, registerGuest, signIn, signInWithGoogle } from '../../services/auth';

export default function LoginScreen() {
  const { user, profile, profileError, loading: authLoading } = useAuth();
  const [registering, setRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (authLoading || !user || !profile) return;
    router.replace(profile.role === 'manager' ? '/manager' : '/');
  }, [authLoading, profile, user]);

  const submit = async () => {
    setError('');
    if (registering && displayName.trim().length < 2) {
      setError('Nhập tên có ít nhất 2 ký tự.');
      return;
    }
    if (password.length < 6) {
      setError('Mật khẩu cần có ít nhất 6 ký tự.');
      return;
    }
    if (registering && password !== confirmPassword) {
      setError('Mật khẩu nhập lại chưa khớp.');
      return;
    }

    setBusy(true);
    try {
      if (registering) await registerGuest(displayName, email, password);
      else await signIn(email, password);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (authError) {
      const code = (authError as { code?: string }).code;
      const messages: Record<string, string> = {
        'auth/email-already-in-use': 'Email này đã được đăng ký.',
        'auth/invalid-email': 'Địa chỉ email không hợp lệ.',
        'auth/invalid-credential': 'Email hoặc mật khẩu chưa đúng.',
        'auth/weak-password': 'Mật khẩu chưa đủ mạnh.',
        'auth/operation-not-allowed': 'Hãy bật Email/Password trong Firebase Authentication.',
        'permission-denied': 'Firestore Rules chưa cho phép tạo/đọc hồ sơ tài khoản.',
        'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
      };
      const message = authError instanceof Error ? authError.message : '';
      setError(messages[code ?? ''] ?? (message || 'Không thể xác thực. Kiểm tra kết nối và Firebase Console.'));
    } finally {
      setBusy(false);
    }
  };

  const submitGoogle = async () => {
    setError('');
    setGoogleBusy(true);
    try {
      const googleUser = await signInWithGoogle();
      if (googleUser) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (authError) {
      const code = (authError as { code?: string }).code;
      const message = authError instanceof Error ? authError.message : '';
      const messages: Record<string, string> = {
        'auth/operation-not-allowed': 'Hãy bật Google trong Firebase Authentication → Sign-in method.',
        'auth/popup-closed-by-user': 'Bạn đã đóng cửa sổ đăng nhập Google.',
        'auth/unauthorized-domain': 'Thêm domain hiện tại vào Firebase Authentication → Settings → Authorized domains.',
        'DEVELOPER_ERROR': 'Kiểm tra SHA-1, package name và google-services.json trong Firebase.',
      };
      setError(messages[code ?? ''] ?? (message || 'Đăng nhập Google không thành công.'));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGoogleBusy(false);
    }
  };

  if (user && !authLoading && !profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.profileError}>
          <Text style={styles.title}>Chưa có hồ sơ vai trò</Text>
          <Text style={styles.errorText}>
            {profileError || 'Tài khoản chưa có document users/{uid}. Hãy tạo hồ sơ guest hoặc cấp role manager trong Firestore.'}
          </Text>
          <PressableScale onPress={() => router.replace('/login')} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Quay lại đăng nhập</Text>
          </PressableScale>
          <PressableScale onPress={() => void logOut()} style={styles.secondaryButton}>
            <Text style={styles.secondaryText}>Đăng xuất tài khoản này</Text>
          </PressableScale>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <FadeInView style={styles.content}>
          <Text style={styles.eyebrow}>VKU · STUDY SPACES</Text>
          <Text style={styles.title}>{registering ? 'Tạo tài khoản khách' : 'Đăng nhập'}</Text>
          <Text style={styles.subtitle}>Đặt không gian học tập phù hợp với lịch của bạn.</Text>

          {registering ? (
            <TextInput
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Họ và tên"
              placeholderTextColor="#7E8B82"
              autoCapitalize="words"
              style={styles.input}
            />
          ) : null}
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#7E8B82"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            style={styles.input}
          />
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="Mật khẩu"
            placeholderTextColor="#7E8B82"
            secureTextEntry
            autoComplete={registering ? 'new-password' : 'current-password'}
            style={styles.input}
            onSubmitEditing={submit}
          />
          {registering ? (
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Nhập lại mật khẩu"
              placeholderTextColor="#7E8B82"
              secureTextEntry
              autoComplete="new-password"
              style={styles.input}
              onSubmitEditing={submit}
            />
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <PressableScale disabled={busy || googleBusy} onPress={submit} style={styles.primaryButton}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : (
              <Text style={styles.primaryText}>{registering ? 'Tạo tài khoản' : 'Đăng nhập'}</Text>
            )}
          </PressableScale>

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerLabel}>hoặc</Text>
            <View style={styles.divider} />
          </View>

          <PressableScale
            disabled={busy || googleBusy}
            onPress={() => void submitGoogle()}
            style={styles.googleButton}
          >
            {googleBusy ? (
              <ActivityIndicator color="#176B59" />
            ) : (
              <>
                <View style={styles.googleMark}><Text style={styles.googleMarkText}>G</Text></View>
                <Text style={styles.googleText}>Tiếp tục với Google</Text>
              </>
            )}
          </PressableScale>

          <PressableScale
            disabled={busy || googleBusy}
            onPress={() => {
              setRegistering((value) => !value);
              setError('');
              setConfirmPassword('');
            }}
            style={styles.toggleButton}
          >
            <Text style={styles.toggleText}>
              {registering ? 'Đã có tài khoản? Đăng nhập' : 'Chưa có tài khoản? Đăng ký khách'}
            </Text>
          </PressableScale>
        </FadeInView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F4F6F3' },
  keyboardView: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingVertical: 28 },
  eyebrow: { color: '#176B59', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: { marginTop: 10, color: '#1A2922', fontSize: 30, fontWeight: '800' },
  subtitle: { marginTop: 8, marginBottom: 26, color: '#66736B', fontSize: 14, lineHeight: 21 },
  input: {
    minHeight: 50,
    marginBottom: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#D9E0DA',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    color: '#1A2922',
    fontSize: 15,
  },
  primaryButton: {
    minHeight: 52,
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#176B59',
  },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 17 },
  divider: { flex: 1, height: 1, backgroundColor: '#DDE4DD' },
  dividerLabel: { color: '#7C8880', fontSize: 12 },
  googleButton: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#D5DDD6',
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  googleMark: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#F2F5F2',
  },
  googleMarkText: { color: '#4285F4', fontSize: 15, fontWeight: '800' },
  googleText: { color: '#26352D', fontSize: 14, fontWeight: '700' },
  toggleButton: { alignSelf: 'center', padding: 14 },
  toggleText: { color: '#176B59', fontSize: 14, fontWeight: '700' },
  errorText: { marginBottom: 10, color: '#A33A32', fontSize: 13, lineHeight: 19 },
  profileError: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  secondaryButton: { marginTop: 18, alignSelf: 'flex-start' },
  secondaryText: { color: '#176B59', fontWeight: '700' },
});
