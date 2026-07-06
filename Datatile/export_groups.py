"""
Export streets-positions mapping per group to JSON files.

Output: group_{id}.json  (one file per group)
Format:
{
    "<street_id>": [pos_id, pos_id, ...],
    ...
}

Usage:
    python export_groups.py

Requires .env in the project root (or set SUPABASE_URL / SUPABASE_KEY env vars).
"""

import json
import os
import sys

from dotenv import load_dotenv
from supabase import create_client, Client

# ── Load env ──────────────────────────────────────────────────────────────────
# Look for .env two levels up (project root)
_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(_ROOT, ".env"))

SUPABASE_URL = os.environ.get("SUPABASE_URL") or os.environ.get("supabase_url")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY") or os.environ.get("supabase_key")

if not SUPABASE_URL or not SUPABASE_KEY:
    sys.exit("ERROR: SUPABASE_URL and SUPABASE_KEY must be set in .env or environment.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ── Output directory (same folder as this script) ─────────────────────────────
OUT_DIR = os.path.dirname(os.path.abspath(__file__))


def fetch_all(table: str, select: str) -> list:
    """Fetch every row from a table (handles Supabase default 1 000-row limit)."""
    PAGE = 1000
    rows = []
    offset = 0
    while True:
        res = (
            supabase.table(table)
            .select(select)
            .range(offset, offset + PAGE - 1)
            .execute()
        )
        chunk = res.data or []
        rows.extend(chunk)
        if len(chunk) < PAGE:
            break
        offset += PAGE
    return rows


def main():
    print("Fetching groups …")
    groups = fetch_all("Groups", "id, streets")
    print(f"  {len(groups)} groups found.")

    if not groups:
        print("No groups — nothing to export.")
        return

    # Collect all street IDs referenced by any group
    all_street_ids = sorted({int(s) for g in groups for s in (g.get("streets") or [])})
    print(f"Fetching {len(all_street_ids)} streets …")

    # Fetch positions column for those streets
    # Supabase IN filter works in chunks to stay under URL length limits
    CHUNK = 200
    street_positions: dict[int, list] = {}  # street_id → [pos_id, ...]

    for i in range(0, len(all_street_ids), CHUNK):
        chunk_ids = all_street_ids[i : i + CHUNK]
        res = (
            supabase.table("Streets")
            .select("id, positions")
            .in_("id", chunk_ids)
            .execute()
        )
        for row in (res.data or []):
            sid = int(row["id"])
            positions = [int(p) for p in (row.get("positions") or [])]
            street_positions[sid] = positions

    print(f"  {len(street_positions)} streets loaded.")

    # ── Export one file per group ─────────────────────────────────────────────
    exported = 0
    for group in groups:
        gid = group["id"]
        street_ids = [int(s) for s in (group.get("streets") or [])]

        payload: dict[str, list] = {}
        for sid in street_ids:
            payload[str(sid)] = street_positions.get(sid, [])

        out_path = os.path.join(OUT_DIR, f"group_{gid}.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)

        print(f"  Wrote {out_path}  ({len(street_ids)} streets)")
        exported += 1

    print(f"\nDone. {exported} group file(s) exported to {OUT_DIR}")


if __name__ == "__main__":
    main()
