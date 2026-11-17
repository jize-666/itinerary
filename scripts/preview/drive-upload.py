#!/usr/bin/env python3
"""
Pratinjau untuk Google Drive host, folder "previews". Aturan host 17 Nov: "yauda gini saja, tandai yang sudah dikirim
dan yang belum dikirim, ingatkan aku jika sudah menyentuh 1gb" (mengganti "langsung up ke gdrive").

  python3 scripts/preview/drive-upload.py catat <berkas>...        tandai pratinjau yang dikirim ke chat (belum di Drive)
  python3 scripts/preview/drive-upload.py status                   yang belum di Drive: jumlah dan ukuran; >= 1 GB = ingatkan host
  python3 scripts/preview/drive-upload.py unggah <id-folder>       unggah semua yang belum, lalu tandai sudah

- Buku catatan: docs/previews-ledger.json (nama, letak, ukuran, tanggal kirim ke chat, tanggal dan ID Drive bila sudah).
  Berkasnya sendiri di scratchpad sesi; yang hilang sebelum diunggah ditandai "hilang".
- Video masuk subfolder "video", audio "audio", gambar "gambar", lainnya "lain"; nama diawali tanggal berkas.
- Token akses Google tidak pernah ada di sini: proxy jaringan sesi menyisipkannya ke permintaan ke www.googleapis.com
  (network secret lingkungan "itinerary", diisi host lewat formulir aman). Token OAuth Playground berlaku ±1 jam;
  401 = minta host token baru.
- Tanpa pustaka luar; urllib memakai proxy dari HTTPS_PROXY dan sertifikat proxy (/root/.ccr/ca-bundle.crt bila ada).
"""
import datetime
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://www.googleapis.com"
CA = "/root/.ccr/ca-bundle.crt"
CTX = ssl.create_default_context(cafile=CA) if os.path.exists(CA) else ssl.create_default_context()
KINDS = {
    "video": ((".mp4", ".mov", ".webm"), {".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm"}),
    "audio": ((".mp3", ".m4a", ".wav", ".flac", ".ogg"), {".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".flac": "audio/flac", ".ogg": "audio/ogg"}),
    "gambar": ((".png", ".jpg", ".jpeg", ".webp", ".gif"), {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif"}),
}


def call(method, url, data=None, headers=None):
    req = urllib.request.Request(url, data=data, method=method, headers=headers or {})
    for attempt in range(5):
        try:
            return urllib.request.urlopen(req, context=CTX, timeout=600)
        except urllib.error.HTTPError as e:
            if e.code == 401:
                sys.exit("401: token Google kedaluwarsa atau salah. Minta host token baru (OAuth Playground, Drive API v3).")
            if e.code in (429, 500, 502, 503, 504) and attempt < 4:
                time.sleep(2**attempt)
                continue
            raise


def folder(name, parent):
    q = f"name = '{name}' and '{parent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    found = json.load(call("GET", f"{API}/drive/v3/files?q={urllib.parse.quote(q)}&fields=files(id)"))["files"]
    if found:
        return found[0]["id"]
    body = json.dumps({"name": name, "mimeType": "application/vnd.google-apps.folder", "parents": [parent]}).encode()
    return json.load(call("POST", f"{API}/drive/v3/files?fields=id", body, {"Content-Type": "application/json"}))["id"]


def kind_of(path):
    ext = os.path.splitext(path)[1].lower()
    for kind, (exts, mimes) in KINDS.items():
        if ext in exts:
            return kind, mimes[ext]
    return "lain", "application/zip" if ext == ".zip" else "application/octet-stream"


LEDGER = os.path.join(os.path.dirname(__file__), "..", "..", "docs", "previews-ledger.json")
LIMIT = 1024**3  # 1 GB: batas pengingat host


def load():
    with open(LEDGER) as f:
        return json.load(f)


def save(book):
    with open(LEDGER, "w") as f:
        json.dump(book, f, indent=2, ensure_ascii=False)
        f.write("\n")


def pending(book):
    return [it for it in book["items"] if not it.get("drive") and not it.get("hilang")]


def upload_one(root, subs, path):
    kind, mime = kind_of(path)
    if kind not in subs:
        subs[kind] = folder(kind, root)
    name = f"{datetime.datetime.fromtimestamp(os.path.getmtime(path)):%Y-%m-%d} {os.path.basename(path)}"
    meta = json.dumps({"name": name, "parents": [subs[kind]]}).encode()
    loc = call("POST", f"{API}/upload/drive/v3/files?uploadType=resumable", meta, {"Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": mime}).headers["Location"]
    with open(path, "rb") as f:
        data = f.read()
    return json.load(call("PUT", loc, data, {"Content-Type": mime}))["id"], f"{kind}/{name}"


def status(book):
    left = pending(book)
    size = sum(it["size"] for it in left)
    print(f"belum di Drive: {len(left)} berkas, {size / 1024**2:.1f} MB dari batas {LIMIT / 1024**3:.0f} GB")
    for it in left:
        print(f"  - {it['sent']}  {it['name']}  ({it['size'] / 1024**2:.1f} MB)")
    if size >= LIMIT:
        print("INGATKAN HOST: pratinjau yang belum di Drive sudah mencapai 1 GB; minta token Google baru, lalu `unggah`.")


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ("catat", "status", "unggah"):
        sys.exit(__doc__)
    cmd, args = sys.argv[1], sys.argv[2:]
    book = load()
    today = f"{datetime.date.today():%Y-%m-%d}"
    if cmd == "catat":
        known = {it["path"] for it in book["items"]}
        for path in args:
            path = os.path.abspath(path)
            if path in known:
                continue
            book["items"].append({"name": os.path.basename(path), "path": path, "size": os.path.getsize(path), "sent": today, "drive": None, "driveId": None})
        save(book)
        status(book)
    elif cmd == "status":
        status(book)
    else:
        if not args:
            sys.exit("unggah butuh id folder previews")
        subs = {}
        for it in pending(book):
            if not os.path.exists(it["path"]):
                it["hilang"] = today
                print(f"hilang (scratchpad sudah dibersihkan): {it['name']}")
                continue
            it["driveId"], where = upload_one(args[0], subs, it["path"])
            it["drive"] = today
            save(book)
            print(f"{where}  →  https://drive.google.com/file/d/{it['driveId']}/view")
        save(book)
        status(book)


if __name__ == "__main__":
    main()
