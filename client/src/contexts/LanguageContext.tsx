import { createContext, useContext, useState, ReactNode } from "react";

type Language = "en" | "id";

interface LanguageContextType {
  language: Language;
  toggleLanguage: () => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    appTitle: "Kali x Tuan Hades MCP Agent",
    aiConnected: "AI Connected",
    kaliOffline: "Kali: Offline",
    kaliConnected: "Kali",
    commandPrompt: "Enter prompt for Kali Linux",
    commandPlaceholder: "Example: Scan ports 80 and 443 on 192.168.1.1 using nmap...",
    pressCtrl: "Press Ctrl+Enter or Cmd+Enter to execute",
    timeout: "Timeout",
    seconds: "sec",
    commandHistory: "Command History",
    author: "Author",
    settings: "Settings",
    howToUse: "How to Use",
    clearHistory: "Clear History",
    historyCleared: "History Cleared",
    allHistoryCleared: "All command history has been cleared",
    github: "GitHub",
    linkedin: "LinkedIn",
  },
  id: {
    appTitle: "Kali x Tuan Hades MCP Agent",
    aiConnected: "AI Terhubung",
    kaliOffline: "Kali: Offline",
    kaliConnected: "Kali",
    commandPrompt: "Masukkan Prompt untuk Kali Linux",
    commandPlaceholder: "Contoh: Scan port 80 dan 443 pada 192.168.1.1 menggunakan nmap...",
    pressCtrl: "Tekan Ctrl+Enter atau Cmd+Enter untuk menjalankan",
    timeout: "Timeout",
    seconds: "detik",
    commandHistory: "Riwayat Command",
    author: "Pembuat",
    settings: "Pengaturan",
    howToUse: "Cara Menggunakan",
    clearHistory: "Hapus Riwayat",
    historyCleared: "Riwayat Dihapus",
    allHistoryCleared: "Semua command history telah dihapus",
    github: "GitHub",
    linkedin: "LinkedIn",
  },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const stored = localStorage.getItem("language");
    return (stored as Language) || "id";
  });

  const toggleLanguage = () => {
    const newLang = language === "id" ? "en" : "id";
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations.en] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
