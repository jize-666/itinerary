import { useEffect, useState } from "react";
import { useI18n } from "@/engine/i18n/useI18n";
import { clothUrl } from "@/lib/keepsake";

/**
 * Kain yang dibatik tamu sendiri di `/canting/`, tergantung di gawangan bambu di epilog film (Tugas 11.4). Hanya dari
 * penyimpanan perangkat (`lib/keepsake.ts`), tanpa server; tanpa kain, epilog tetap seperti semula.
 *
 * Gerak kamera (aturan host 13 Nov), sama di panggung 3D dan film 2,5D: kain bergeser lebih jauh daripada teks saat
 * kursor atau HP bergerak (parallax), sungguh miring dengan bayangan yang tertinggal (perspective shift), dan ikut
 * kedalaman slide selama geseran. Masuk dengan ayunan, lalu bergoyang pelan; Calm diam.
 */
export function GuestCloth() {
  const { t } = useI18n();
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void clothUrl().then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, []);
  if (!url) return null;
  return (
    <figure className="fs-cloth" data-cloth="">
      <div className="fs-cloth-hang">
        <div className="fs-cloth-swing">
          <span className="fs-cloth-shadow" aria-hidden="true" />
          <svg className="fs-cloth-cords" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
            <path d="M50 0L3 24M50 0L97 24" vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="fs-cloth-rod" aria-hidden="true" />
          <div className="fs-cloth-sheet">
            {/* eslint-disable-next-line @next/next/no-img-element -- URL objek dari perangkat, bukan aset situs */}
            <img src={url} alt={t("film.cloth.alt")} width={1280} height={800} decoding="async" draggable={false} />
            <i className="fs-cloth-fold" aria-hidden="true" />
            <i className="fs-cloth-sheen" aria-hidden="true" />
          </div>
        </div>
      </div>
      <figcaption className="fs-cloth-cap">{t("film.cloth.caption")}</figcaption>
    </figure>
  );
}
