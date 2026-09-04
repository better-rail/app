#!/usr/bin/env python3
"""
download_feed.py — fetch and extract the Israel MOT GTFS archives.

The National Authority for Public Transport regenerates the feed every night at
https://gtfs.mot.gov.il/gtfsfiles/ and it is valid for ~10 days. This script
downloads the five archives and unzips the GTFS ones into a target directory.

Stdlib only (urllib + zipfile), so it runs anywhere. Note: gtfs.mot.gov.il is a
public Israeli endpoint and is typically reachable from the open internet; some
sandboxed environments block it — run this where outbound HTTPS to that host is
allowed.

Usage:
    python download_feed.py [--out DIR] [--only NAME ...] [--no-extract]

Examples:
    python download_feed.py --out ./gtfs_data
    python download_feed.py --only israel-public-transportation RouteNetworksByDate
"""
from __future__ import annotations

import argparse
import sys
import urllib.request
import zipfile
from pathlib import Path

BASE_URL = "https://gtfs.mot.gov.il/gtfsfiles/"

# name -> remote filename. (Note the historical misspelling "tarrif_2022".)
ARCHIVES = {
    "israel-public-transportation": "israel-public-transportation.zip",
    "RouteNetworksByDate": "RouteNetworksByDate.zip",
    "tariff_2022": "tarrif_2022.zip",
    "zones_2022": "zones_2022.zip",
    "ChargingRavKav": "ChargingRavKav.zip",
}


def download(name: str, filename: str, out_dir: Path) -> Path:
    url = BASE_URL + filename
    dest = out_dir / filename
    print(f"  downloading {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "israel-gtfs-skill/1.0"})
    with urllib.request.urlopen(req, timeout=120) as resp, open(dest, "wb") as fh:
        while chunk := resp.read(1 << 16):
            fh.write(chunk)
    print(f"    saved {dest} ({dest.stat().st_size:,} bytes)")
    return dest


def extract(zip_path: Path, out_dir: Path) -> None:
    target = out_dir / zip_path.stem
    target.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        zf.extractall(target)
    print(f"    extracted -> {target}/")


def main() -> int:
    ap = argparse.ArgumentParser(description="Download the Israel MOT GTFS feed.")
    ap.add_argument("--out", default="gtfs_data", help="output directory (default: gtfs_data)")
    ap.add_argument("--only", nargs="+", choices=list(ARCHIVES), help="download only these archives")
    ap.add_argument("--no-extract", action="store_true", help="download zips but do not unzip")
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    names = args.only or list(ARCHIVES)

    print(f"Output directory: {out_dir.resolve()}")
    failures = []
    for name in names:
        filename = ARCHIVES[name]
        print(f"[{name}]")
        try:
            zip_path = download(name, filename, out_dir)
            if not args.no_extract:
                extract(zip_path, out_dir)
        except Exception as exc:  # noqa: BLE001 - report and continue
            print(f"    FAILED: {exc}", file=sys.stderr)
            failures.append(name)

    if failures:
        print(f"\nDone with errors. Failed: {', '.join(failures)}", file=sys.stderr)
        return 1
    print("\nDone. Remember: every file is UTF-8 *with BOM* — read with encoding='utf-8-sig'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
