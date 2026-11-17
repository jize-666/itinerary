#!/usr/bin/env python3
"""
Unggah pratinjau ke Google Drive host, folder "previews" (aturan host 17 Nov: "sekarang ketika kamu mengirim preview
disini, kamu juga langsung kirim/up ke gdrive ya").

Pemakaian:
  python3 scripts/preview/drive-upload.py <id-folder-previews> <berkas>...

- Video masuk subfolder "video", audio ke "audio", gambar ke "gambar", lainnya (zip dll.) ke "lain"; subfolder dibuat
  bila belum ada. Nama berkas diawali tanggal berkas (YYYY-MM-DD) supaya urut.
- Token akses Google tidak pernah ada di sini: proxy jaringan sesi menyisipkannya ke permintaan ke www.googleapis.com
  (network secret lingkungan "itinerary", diisi host lewat formulir aman). Token OAuth Playground berlaku ±1 jam;
  bila kedaluwarsa (401), minta host token baru.
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


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    root, paths = sys.argv[1], sys.argv[2:]
    subs = {}
    for path in paths:
        kind, mime = kind_of(path)
        if kind not in subs:
            subs[kind] = folder(kind, root)
        name = f"{datetime.datetime.fromtimestamp(os.path.getmtime(path)):%Y-%m-%d} {os.path.basename(path)}"
        meta = json.dumps({"name": name, "parents": [subs[kind]]}).encode()
        loc = call("POST", f"{API}/upload/drive/v3/files?uploadType=resumable", meta, {"Content-Type": "application/json; charset=UTF-8", "X-Upload-Content-Type": mime}).headers["Location"]
        with open(path, "rb") as f:
            data = f.read()
        res = json.load(call("PUT", loc, data, {"Content-Type": mime}))
        print(f"{kind}/{name}  →  https://drive.google.com/file/d/{res['id']}/view")


if __name__ == "__main__":
    main()
