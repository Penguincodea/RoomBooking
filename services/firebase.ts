import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  getAuth,
  initializeAuth,
  type Persistence,
} from 'firebase/auth';
import * as firebaseAuth from 'firebase/auth';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCGWN7uHhd919_RDIWLr1a39Oi74AxgpA4',
  authDomain: 'study-room-booking-9107b.firebaseapp.com',
  projectId: 'study-room-booking-9107b',
  storageBucket: 'study-room-booking-9107b.firebasestorage.app',
  messagingSenderId: '786145351823',
  appId: '1:786145351823:web:7a4b80f9813b1e613d38fa',
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  if (Platform.OS === 'web') {
    authInstance = getAuth(app);
  } else {
    const nativeAuth = firebaseAuth as typeof firebaseAuth & {
      getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
    };
    authInstance = initializeAuth(app, {
      persistence: nativeAuth.getReactNativePersistence(AsyncStorage),
    });
  }
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
