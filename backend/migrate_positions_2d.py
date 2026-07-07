"""One-off migration: Streets.positions từ 1-D → 2-D.

Trước:  positions = [id1, id2, id3]           (mảng phẳng)
Sau:    positions = [[id1, id2, id3]]         (mảng 2-D: mỗi phần tử = 1 cạnh)

Chỉ chuyển các row mà positions[0] CHƯA phải là list (tức còn là 1-D cũ).
Row đã ở dạng 2-D hoặc rỗng sẽ được bỏ qua → an toàn khi chạy lại nhiều lần.

Chạy:  python -m backend.migrate_positions_2d          (từ thư mục gốc repo)
   hoặc:  cd backend && python migrate_positions_2d.py
Thêm --dry-run để chỉ in ra, không ghi DB.
"""
import sys

try:
    from config import supabase          # khi chạy trong thư mục backend/
except ImportError:
    from backend.config import supabase  # khi chạy từ gốc repo


def migrate(dry_run: bool = False) -> None:
    res = supabase.table("Streets").select("id, positions").execute()
    rows = res.data or []
    total = len(rows)
    converted = 0
    skipped = 0

    for row in rows:
        sid = row.get("id")
        positions = row.get("positions")

        if not positions:
            skipped += 1
            continue
        if isinstance(positions[0], list):
            # đã là 2-D
            skipped += 1
            continue

        new_positions = [list(positions)]  # bọc mảng phẳng thành 1 cạnh
        print(f"Street #{sid}: {positions} -> {new_positions}")
        converted += 1
        if not dry_run:
            supabase.table("Streets").update({"positions": new_positions}).eq("id", sid).execute()

    mode = "DRY-RUN (không ghi DB)" if dry_run else "ĐÃ GHI DB"
    print(f"\n[{mode}] Tổng {total} street | chuyển {converted} | bỏ qua {skipped}")


if __name__ == "__main__":
    migrate(dry_run="--dry-run" in sys.argv)
