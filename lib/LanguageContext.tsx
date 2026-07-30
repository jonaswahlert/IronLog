import { createContext, useContext, useState, ReactNode } from 'react';

export type Lang = 'sv' | 'en';

interface LangCtx { lang: Lang; setLang: (l: Lang) => void; }

const LanguageContext = createContext<LangCtx>({ lang: 'sv', setLang: () => {} });

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('sv');
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  return useContext(LanguageContext);
}
