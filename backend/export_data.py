import csv
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from config import supabase


def export_streets(output_path="export_streets.csv"):
    all_data = []
    page_size = 1000
    offset = 0
    while True:
        result = (
            supabase.table("Streets")
            .select("id, name")
            .order("id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = result.data or []
        all_data.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "name"])
        writer.writeheader()
        writer.writerows(all_data)
    print(f"Exported {len(all_data)} streets → {output_path}")


def export_positions(output_path="export_positions.csv"):
    all_data = []
    page_size = 1000
    offset = 0
    while True:
        result = (
            supabase.table("Positions")
            .select("id, long, lat, streets")
            .order("id")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        rows = result.data or []
        all_data.extend(rows)
        if len(rows) < page_size:
            break
        offset += page_size
    with open(output_path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["id", "long", "lat", "streets"])
        writer.writeheader()
        writer.writerows(all_data)
    print(f"Exported {len(all_data)} positions → {output_path}")


if __name__ == "__main__":
    export_streets()
    export_positions()
