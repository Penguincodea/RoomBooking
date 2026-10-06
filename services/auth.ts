import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Platform } from 'react-native';

import { auth, db } from './firebase';

export async function signIn(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  await ensureGuestProfile(credential.user);
  return credential.user;
}

export async function signInWithGoogle() {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    throw new Error('Thiếu EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID trong cấu hình môi trường.');
  }

  let user: User;
  if (Platform.OS === 'web') {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    user = credential.user;
  } else {
    const { GoogleSignin, isSuccessResponse } = await import(
      '@react-native-google-signin/google-signin'
    );
    GoogleSignin.configure({ webClientId });
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();
    if (!isSuccessResponse(response)) return null;
    if (!response.data.idToken) {
      throw new Error('Google không trả về ID token. Kiểm tra Web OAuth client ID.');
    }

    const credential = GoogleAuthProvider.credential(response.data.idToken);
    user = (await signInWithCredential(auth, credential)).user;
  }

  await ensureGuestProfile(user);
  return user;
}

export async function registerGuest(
  displayName: string,
  email: string,
  password: string,
) {
  const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  await setDoc(doc(db, 'users', credential.user.uid), {
    email: credential.user.email ?? email.trim(),
    displayName: displayName.trim(),
    role: 'guest',
    createdAt: serverTimestamp(),
  });
  return credential.user;
}

async function ensureGuestProfile(user: User) {
  const profileRef = doc(db, 'users', user.uid);
  const profileSnapshot = await getDoc(profileRef);
  if (profileSnapshot.exists()) return;

  await setDoc(profileRef, {
    email: user.email ?? '',
    displayName: user.displayName ?? '',
    role: 'guest',
    createdAt: serverTimestamp(),
  });
}

export function logOut() {
  return signOut(auth);
}
