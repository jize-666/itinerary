"""Independent solar and ridge check. Usage: python3 lawu-reference.py S08E111.hgt.gz
Optional offline dependency: ephem 4.2.1. This script is not part of the website.
"""
import argparse
import array
import datetime as dt
import gzip
import math
import sys
from pathlib import Path

import ephem

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("tile", type=Path)
args = parser.parse_args()
raw = array.array("h")
raw.frombytes(gzip.decompress(args.tile.read_bytes()))
if sys.byteorder == "little":
    raw.byteswap()
if len(raw) != 3601 ** 2:
    parser.error("Expected the original 3601 × 3601 S08E111 height tile")

lat, lon = -7.595472, 111.132899
east = 111320 * math.cos(math.radians(7.62))
north = 110585
observer = ephem.Observer()
observer.lat, observer.lon = str(lat), str(lon)
observer.elevation, observer.pressure = 0, 0
midnight = dt.datetime(2027, 4, 8, 17)


def sunlight(minute):
    observer.date = midnight + dt.timedelta(minutes=minute)
    sun = ephem.Sun(observer)
    return math.degrees(sun.alt), math.degrees(sun.az)


def elevation(a, b):
    x, y = (b - 111) * 3600, (-7 - a) * 3600
    i, j = math.floor(x), math.floor(y)
    u, v = x - i, y - j
    k = j * 3601 + i
    return ((1-v) * ((1-u) * raw[k] + u * raw[k+1])
            + v * ((1-u) * raw[k+3601] + u * raw[k+3602]))


def ridge(azimuth):
    bearing = math.radians(azimuth)
    origin = elevation(lat, lon) + 1.65
    highest = -90
    for distance in range(10, 12951, 10):
        a = lat + distance * math.cos(bearing) / north
        b = lon + distance * math.sin(bearing) / east
        delta = elevation(a, b) - origin - distance**2 / (2 * 6371000 * 7/6)
        highest = max(highest, math.degrees(math.atan2(delta, distance)))
    return highest


def upper_rim(minute):
    altitude, azimuth = sunlight(minute)
    t = math.tan(math.radians(altitude))
    refraction = (58.1/t - .07/t**3 + .000086/t**5) / 3600
    return altitude + refraction + .2666 - ridge(azimuth)


def zero(fn, lo, hi):
    initial = fn(lo) < 0
    if (fn(hi) < 0) == initial:
        raise ValueError("The interval does not bracket a crossing")
    for _ in range(32):
        mid = (lo + hi) / 2
        if (fn(mid) < 0) == initial:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# At transit the azimuth crosses true north (360° to 0°).
events = {
    "level sunrise": zero(lambda m: sunlight(m)[0] + .8333, 310, 410),
    "ridge upper limb": zero(upper_rim, 370, 390),
    "solar noon": zero(lambda m: math.sin(math.radians(sunlight(m)[1])), 650, 750),
    "level sunset": zero(lambda m: sunlight(m)[0] + .8333, 1000, 1150),
}
for label, minute in events.items():
    time = dt.datetime(2027, 4, 9) + dt.timedelta(seconds=round(minute * 60))
    altitude, azimuth = sunlight(minute)
    print(f"{label:18} {time:%H:%M:%S} WIB  minute={minute:.4f}  alt={altitude:.4f}  az={azimuth:.4f}")
