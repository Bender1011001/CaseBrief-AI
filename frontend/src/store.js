import { create } from 'zustand';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';

export const useAuthStore = create((set, get) => ({
  user: null,
  documents: [],
  token: null,
  init: () => {
    onAuthStateChanged(auth, (user) => {
      set({ user });
      if (user) {
        user.getIdToken().then(token => set({ token }));
        get().subscribeToDocs(user.uid);
      } else {
        set({ user: null, token: null, documents: [] });
      }
    });
  },
  subscribeToDocs: (userId) => {
    const q = query(collection(db, 'users', userId, 'documents'));
    return onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      set({ documents: docs });
    });
  }
}));

useAuthStore.getState().init(); // Auto-init on import