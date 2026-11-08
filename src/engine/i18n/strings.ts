/**
 * Teks UI dua bahasa (PRD FR-10). EN untuk tamu, ID untuk tim. Isi itinerary TIDAK di sini:
 * itu datang dari trip-data setelah kode benar. Placeholder {nama} harus sama di kedua bahasa (dites).
 */
export const STRINGS = {
  "lang.label": { en: "Language", id: "Bahasa" },
  "lang.en": { en: "English", id: "Bahasa Inggris" },
  "lang.id": { en: "Indonesian", id: "Bahasa Indonesia" },

  "gate.prompt": { en: "Enter your booking code", id: "Masukkan kode booking" },
  "gate.codeLabel": { en: "Booking code", id: "Kode booking" },
  "gate.checking": { en: "Opening the door…", id: "Membuka pintu…" },
  "gate.wrong": { en: "That code doesn’t open this door. Please check it and try again.", id: "Kode itu belum membuka pintu ini. Periksa lagi, lalu coba sekali lagi." },
  "gate.remaining": { en: "{n} tries left before a short pause.", id: "Sisa {n} percobaan sebelum jeda sebentar." },
  "gate.remainingOne": { en: "1 try left before a short pause.", id: "Sisa 1 percobaan sebelum jeda sebentar." },
  "gate.locked": { en: "Too many tries. Please wait {s} seconds.", id: "Terlalu banyak percobaan. Tunggu {s} detik." },
  "gate.offline": { en: "No connection. Check your signal and try again.", id: "Tidak ada koneksi. Cek sinyal, lalu coba lagi." },
  "gate.server": { en: "Something went wrong on our side. Please try again in a minute.", id: "Ada kendala di sisi kami. Coba lagi sebentar lagi." },
  "gate.ended": { en: "This lakon has ended. Matur nuwun for joining us.", id: "Lakon ini sudah selesai. Matur nuwun sudah ikut." },
  "gate.welcome": { en: "Welcome. The lakon is about to begin.", id: "Selamat datang. Lakon segera dimulai." },
  "gate.welcomeBack": { en: "Welcome back.", id: "Selamat datang kembali." },
  "gate.team": { en: "Team access", id: "Akses tim" },
  "gate.switch": { en: "Use a different code", id: "Pakai kode lain" },

  "begin.sound": { en: "Begin with gamelan", id: "Mulai dengan gamelan" },
  "begin.quiet": { en: "Begin quietly", id: "Mulai tanpa suara" },
  "begin.note": { en: "Sound can be switched at any time.", id: "Suara bisa diubah kapan saja." },

  "sound.label": { en: "Gamelan sound", id: "Suara gamelan" },
  "sound.on": { en: "Gamelan on", id: "Gamelan menyala" },
  "sound.off": { en: "Gamelan off", id: "Gamelan mati" },

  "film.title": { en: "A Three-Day Lakon", id: "Lakon Tiga Hari" },
  "film.soon": { en: "The film is being prepared.", id: "Filmnya sedang disiapkan." },
  "film.toToday": { en: "Open Today", id: "Buka Today" },

  "today.title": { en: "Today", id: "Today" },
  "today.loading": { en: "Unfolding the itinerary…", id: "Membuka jadwal…" },
  "today.offline": { en: "No connection, so the itinerary couldn’t load.", id: "Tidak ada koneksi, jadwal belum bisa dimuat." },
  "today.server": { en: "The itinerary couldn’t load. Please try again in a minute.", id: "Jadwal belum bisa dimuat. Coba lagi sebentar lagi." },
  "today.retry": { en: "Try again", id: "Coba lagi" },
  "today.day": { en: "Day {n}", id: "Hari {n}" },
  "today.teamNote": { en: "Team note", id: "Catatan tim" },
  "today.estCost": { en: "Est. cost", id: "Perkiraan biaya" },
  "today.toFilm": { en: "Watch the film", id: "Tonton filmnya" },
} as const satisfies Record<string, { en: string; id: string }>;

export type StringKey = keyof typeof STRINGS;
