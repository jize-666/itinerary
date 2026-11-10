/**
 * Ikon garis (24 px, garis 1,6, ujung bulat): satu gaya untuk semua tombol. Dekoratif; nama tombol datang dari teksnya.
 */
type P = { size?: number };
const base = (size: number) => ({
  viewBox: "0 0 24 24",
  width: size,
  height: size,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  focusable: false,
});

/** Gelembung obrolan dengan gagang telepon (WhatsApp). */
export const IconChat = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M12 3.4a8.6 8.6 0 0 0-7.45 12.9L3.4 20.6l4.42-1.13A8.6 8.6 0 1 0 12 3.4Z" />
    <path
      d="M9.1 8.15c.23 0 .46.12.56.35l.72 1.7c.1.23.05.49-.12.67l-.53.56a6 6 0 0 0 2.76 2.76l.56-.53c.18-.17.44-.22.67-.12l1.7.72c.23.1.36.33.35.56-.05 1-.88 1.79-1.88 1.73-3.2-.2-5.77-2.76-5.97-5.97-.06-1 .73-1.83 1.73-1.88Z"
      fill="currentColor"
      stroke="none"
    />
  </svg>
);

export const IconPhone = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M8.3 3.7 6.4 4c-1.3.2-2.25 1.4-2.08 2.7.88 6.83 6.15 12.1 12.98 12.98 1.3.17 2.5-.78 2.7-2.08l.3-1.9a1.5 1.5 0 0 0-1-1.65l-2.4-.83a1.5 1.5 0 0 0-1.62.43l-.78.92a11.3 11.3 0 0 1-5.17-5.17l.92-.78c.46-.39.63-1.04.43-1.62l-.83-2.4a1.5 1.5 0 0 0-1.65-1Z" />
  </svg>
);

/** Lampu sirene: darurat. */
export const IconSiren = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <path d="M6.6 18.6v-5a5.4 5.4 0 0 1 10.8 0v5" />
    <path d="M4.4 18.6h15.2v1.9H4.4z" />
    <path d="M12 2.8v1.7M4.6 5.8l1.2 1.2M19.4 5.8l-1.2 1.2" />
    <path d="M9.7 13.6a2.3 2.3 0 0 1 2.3-2.3" />
  </svg>
);

export const IconPin = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M12 20.8s-6.4-5.5-6.4-10.8a6.4 6.4 0 0 1 12.8 0c0 5.3-6.4 10.8-6.4 10.8Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const IconCopy = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <rect x="8.6" y="8.6" width="11" height="11" rx="2.4" />
    <path d="M15.4 8.6V6.4a2 2 0 0 0-2-2H6.4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h2.2" />
  </svg>
);

export const IconCheck = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M5 12.5l4.2 4.2L19 7" />
  </svg>
);

export const IconClose = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </svg>
);

/** Gong ageng tergantung (pencu di tengah): mulai dengan gamelan. */
export const IconGong = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M8.4 5.2 12 2.6l3.6 2.6" />
    <circle cx="12" cy="13.2" r="7.6" />
    <circle cx="12" cy="13.2" r="4.4" strokeOpacity="0.55" />
    <circle cx="12" cy="13.2" r="1.7" fill="currentColor" stroke="none" />
  </svg>
);

/** Pengeras suara tanpa bunyi: mulai tanpa suara. */
export const IconQuiet = ({ size = 22 }: P) => (
  <svg {...base(size)}>
    <path d="M4 9.4h3.2L12 5.5v13l-4.8-3.9H4z" />
    <path d="M16 9.6l4.6 4.8M20.6 9.6 16 14.4" />
  </svg>
);

/** Kunci: pakai kode lain. */
export const IconKey = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <circle cx="8" cy="15.5" r="4" />
    <path d="M10.9 12.6 19.5 4M16.4 7.1l2.4 2.4M14.2 9.3l1.8 1.8" />
  </svg>
);

/** Kalender dengan satu hari ditandai: Today. */
export const IconToday = ({ size = 20 }: P) => (
  <svg {...base(size)}>
    <rect x="3.6" y="5" width="16.8" height="15.4" rx="3" />
    <path d="M3.6 9.6h16.8M8 3v3.6M16 3v3.6" />
    <circle cx="12" cy="15" r="1.9" fill="currentColor" stroke="none" />
  </svg>
);

/** Segitiga putar: tonton filmnya. */
export const IconPlay = ({ size = 16 }: P) => (
  <svg {...base(size)}>
    <path d="M8 5.6v12.8a.8.8 0 0 0 1.22.68l10.2-6.4a.8.8 0 0 0 0-1.36L9.22 4.92A.8.8 0 0 0 8 5.6Z" fill="currentColor" fillOpacity="0.2" />
  </svg>
);

export const IconRefresh = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" />
    <path d="M19.6 4.4v4.3h-4.3" />
  </svg>
);

export const IconBack = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </svg>
);

/** Payung: rencana hujan. */
export const IconUmbrella = ({ size = 18 }: P) => (
  <svg {...base(size)}>
    <path d="M3.4 12a8.6 8.6 0 0 1 17.2 0z" fill="currentColor" fillOpacity="0.16" />
    <path d="M12 12v6.4a2 2 0 0 1-4 0M12 2.8v.6" />
  </svg>
);
