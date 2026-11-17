import {useCallback} from 'react';
import {TranslationKey, translate} from '../i18n/translations';
import {useLanguageStore} from '../store/languageStore';

export type TFunction = (
  key: TranslationKey,
  params?: Record<string, string | number>,
) => string;

export const useT = (): TFunction => {
  const language = useLanguageStore(state => state.language);
  return useCallback<TFunction>(
    (key, params) => translate(language, key, params),
    [language],
  );
};

export const useLanguage = () => useLanguageStore(state => state.language);
