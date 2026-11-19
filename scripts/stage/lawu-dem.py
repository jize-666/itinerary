"""Build the film's little-endian metre grid from the original Skadi/SRTM tile.

Usage: python3 scripts/stage/lawu-dem.py [--source /path/to/S08E111.hgt.gz]
No application/network dependency. Only the explicit offline build accesses S3.
"""
import argparse
import array
import gzip
import hashlib
from pathlib import Path
import struct
import sys
from urllib.request import urlopen

URL = "https://s3.amazonaws.com/elevation-tiles-prod/skadi/S08/S08E111.hgt.gz"
DIGEST = "17856880428fe428c3847cc6892de1bbb0dfbb2b956552a0b5588221db697919"
ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--source", type=Path)
args = parser.parse_args()
data = args.source.read_bytes() if args.source else urlopen(URL, timeout=120).read()
if hashlib.sha256(data).hexdigest() != DIGEST:
    raise SystemExit("Tile checksum changed; review the source before updating the pin.")
values = array.array("h")
values.frombytes(gzip.decompress(data))
if sys.byteorder == "little":
    values.byteswap()
assert len(values) == 3601 ** 2
# Native one arc-second posts from the NW corner (-7, 111). Keep 30 m posts.
r0, r1, c0, c1 = 1944, 2556, 72, 900
rows, cols = r1-r0+1, c1-c0+1
crop = array.array("h")
for r in range(r0, r1+1):
    crop.extend(values[r*3601+c0:r*3601+c1+1])
assert min(crop)>0 and max(crop)>3100
if sys.byteorder != "little":
    crop.byteswap()
header = struct.pack("<4sHHddd", b"LWH1", cols, rows, -7-r0/3600, 111+c0/3600, 1/3600)
path = ROOT / "public/stage/lawu/relief.bin"
path.parent.mkdir(exist_ok=True, parents=True)
path.write_bytes(header + crop.tobytes())
print(f"{cols} × {rows}, {path.stat().st_size} bytes, SHA256 {hashlib.sha256(path.read_bytes()).hexdigest()}")
