import AsyncStorage from '@react-native-async-storage/async-storage';
import {create} from 'zustand';
import {createJSONStorage, persist} from 'zustand/middleware';
import {Language, translations} from '../i18n/translations';

const detectLanguage = (): Language => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale ?? '';
    const code = locale.slice(0, 2).toLowerCase();
    return code in translations ? (code as Language) : 'en';
  } catch {
    return 'en';
  }
};

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    set => ({
      language: detectLanguage(),
      setLanguage: language => set({language}),
    }),
    {
      name: 'ashi-language',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
