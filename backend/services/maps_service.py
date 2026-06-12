from config import supabase
from models import (
    City, CityCreate, CityUpdate,
    District, DistrictCreate, DistrictUpdate,
    Street, StreetCreate, StreetUpdate,
    Position, PositionCreate, PositionUpdate,
)
from typing import List, Optional
import unicodedata


def _next_id(table: str, id_col: str = "id") -> int:
    """Get max(id) + 1 from a table to avoid identity sequence conflicts."""
    result = supabase.table(table).select(id_col).order(id_col, desc=True).limit(1).execute()
    max_id = result.data[0][id_col] if result.data else 0
    return max_id + 1


class MapsService:
    @staticmethod
    def _db_pos_to_model(item: dict) -> dict:
        if not item:
            return {}
        return {
            'id': item.get('id'),
            'x': item.get('long'),
            'y': item.get('lat'),
            'ban': item.get('ban'),
            'speed': item.get('speed'),
            'park': item.get('park'),
            'lane': item.get('lane'),
            'tool': item.get('tool'),
            'flooding': item.get('flooding'),
            'streets': item.get('streets'),
            'created_at': item.get('created_at')
        }
    @staticmethod
    async def get_all_cities() -> List[City]:
        try:
            result = supabase.table("Cities").select("id, name").order("name").execute()
            return [City(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Failed to fetch cities: {str(e)}")

    @staticmethod
    async def create_city(data: CityCreate) -> City:
        try:
            next_id = _next_id("Cities")
            result = supabase.table("Cities").insert({"id": next_id, "name": data.name}).execute()
            return City(**result.data[0])
        except Exception as e:
            raise Exception(f"Failed to create city: {str(e)}")

    @staticmethod
    async def get_city_by_id(city_id: int) -> Optional[City]:
        try:
            result = supabase.table("Cities").select("id, name").eq("id", city_id).execute()
            return City(**result.data[0]) if result.data else None
        except Exception as e:
            raise Exception(f"Failed to fetch city: {str(e)}")

    @staticmethod
    async def update_city(city_id: int, data: CityUpdate) -> City:
        try:
            payload = {k: v for k, v in data.model_dump().items() if v is not None}
            result = supabase.table("Cities").update(payload).eq("id", city_id).execute()
            return City(**result.data[0])
        except Exception as e:
            raise Exception(f"Failed to update city: {str(e)}")

    @staticmethod
    async def delete_city(city_id: int) -> bool:
        try:
            supabase.table("Cities").delete().eq("id", city_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete city: {str(e)}")

    @staticmethod
    async def get_districts(city_id: Optional[int] = None) -> List[District]:
        try:
            query = supabase.table("Districts").select("id, name, lname, city").order("name")
            if city_id is not None:
                query = query.eq("city", city_id)
            result = query.execute()
            return [District(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Failed to fetch districts: {str(e)}")

    @staticmethod
    async def create_district(data: DistrictCreate) -> District:
        try:
            next_id = _next_id("Districts")
            payload = {"id": next_id, "name": data.name, "city": data.city}
            if data.lname:
                payload["lname"] = data.lname
            result = supabase.table("Districts").insert(payload).execute()
            return District(**result.data[0])
        except Exception as e:
            raise Exception(f"Failed to create district: {str(e)}")

    @staticmethod
    async def get_district_by_id(district_id: int) -> Optional[District]:
        try:
            result = supabase.table("Districts").select("id, name, lname, city").eq("id", district_id).execute()
            return District(**result.data[0]) if result.data else None
        except Exception as e:
            raise Exception(f"Failed to fetch district: {str(e)}")

    @staticmethod
    async def update_district(district_id: int, data: DistrictUpdate) -> District:
        try:
            payload = {k: v for k, v in data.model_dump().items() if v is not None}
            result = supabase.table("Districts").update(payload).eq("id", district_id).execute()
            return District(**result.data[0])
        except Exception as e:
            raise Exception(f"Failed to update district: {str(e)}")

    @staticmethod
    async def delete_district(district_id: int) -> bool:
        try:
            supabase.table("Districts").delete().eq("id", district_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete district: {str(e)}")

    @staticmethod
    async def get_streets(district_id: Optional[int] = None, city_id: Optional[int] = None) -> List[Street]:
        try:
            query = supabase.table("Streets").select("id, name, type, district_id, city_id").order("name")
            if district_id is not None:
                query = query.eq("district_id", district_id)
            elif city_id is not None:
                query = query.eq("city_id", city_id)
            result = query.execute()
            return [Street(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Failed to fetch streets: {str(e)}")

    @staticmethod
    async def create_street(data: StreetCreate) -> Street:
        try:
            # Normalize helper (remove diacritics, lower, collapse whitespace)
            import re

            def _normalize(s: str) -> str:
                if not s:
                    return ''
                s = str(s).strip().lower()
                # NFKD to decompose accents, then remove combining marks
                s = unicodedata.normalize('NFKD', s)
                s = ''.join(ch for ch in s if not unicodedata.combining(ch))
                # remove punctuation, keep letters/numbers and spaces
                s = re.sub(r'[^0-9a-z\s]', ' ', s)
                s = ' '.join(s.split())
                return s

            def _levenshtein(a: str, b: str) -> int:
                # simple iterative DP
                if a == b:
                    return 0
                if len(a) == 0:
                    return len(b)
                if len(b) == 0:
                    return len(a)
                prev = list(range(len(b) + 1))
                for i, ca in enumerate(a, start=1):
                    curr = [i]
                    for j, cb in enumerate(b, start=1):
                        insert_cost = curr[j-1] + 1
                        delete_cost = prev[j] + 1
                        replace_cost = prev[j-1] + (0 if ca == cb else 1)
                        curr.append(min(insert_cost, delete_cost, replace_cost))
                    prev = curr
                return prev[-1]

            name_norm = _normalize(data.name)
            city_id = data.city_id
            district_id = data.district_id

            # Fetch candidate existing streets in same district or city
            query = supabase.table("Streets").select("id, name, district_id, city_id").order("name")
            if district_id is not None:
                query = query.eq("district_id", district_id)
            elif city_id is not None:
                query = query.eq("city_id", city_id)
            existing_res = query.execute()
            existing_list = existing_res.data or []
            for item in existing_list:
                existing_name = item.get('name') or ''
                en_norm = _normalize(existing_name)
                # exact or containment
                if en_norm == name_norm or (name_norm and en_norm and (name_norm in en_norm or en_norm in name_norm)):
                    raise Exception(f"Similar street exists: {existing_name} (id={item.get('id')})")
                # small edit distance -> likely duplicate; threshold scales with length
                max_dist = max(2, int(max(len(en_norm), len(name_norm)) * 0.2))
                dist = _levenshtein(en_norm, name_norm)
                # debug log
                try:
                    import logging
                    logging.getLogger(__name__).info(f"create_street: compare '{name_norm}' vs '{en_norm}' -> dist={dist} threshold={max_dist}")
                except Exception:
                    pass
                if dist <= max_dist:
                    raise Exception(f"DUPLICATE_STREET:{item.get('id')}:{existing_name}")

            # Also perform a global fuzzy search to catch similar names in other districts/cities
            try:
                global_results = await MapsService.search_streets_by_text(data.name, district_id=None, city_id=None, limit=10)
                # Accept if any match has a low score (<= 0.15)
                for r in (global_results or []):
                    if float(r.get('score', 1.0)) <= 0.15:
                        raise Exception(f"DUPLICATE_STREET:{r.get('id')}:{r.get('name')}")
            except Exception as e:
                # If search_streets_by_text raised an exception because of DB, re-raise as generic
                if str(e).startswith('Failed to create street'):
                    raise
                # If we raised above due to similarity, pass it up
                if 'Similar street exists' in str(e) or 'Similar street exists elsewhere' in str(e):
                    raise
                # otherwise ignore search errors and proceed with insert
                pass

            # No similar found -> proceed to insert
            next_id = _next_id("Streets")
            payload = {"id": next_id, "name": data.name, "district_id": data.district_id, "city_id": data.city_id}
            if data.type:
                payload["type"] = data.type
            result = supabase.table("Streets").insert(payload).execute()
            return Street(**result.data[0])
        except Exception as e:
            raise Exception(f"Failed to create street: {str(e)}")

    @staticmethod
    async def get_street_by_id(street_id: int) -> Optional[Street]:
        try:
            result = supabase.table("Streets").select("id, name, type, district_id, city_id").eq("id", street_id).execute()
            return Street(**result.data[0]) if result.data else None
        except Exception as e:
            raise Exception(f"Failed to fetch street: {str(e)}")

    @staticmethod
    async def update_street(street_id: int, data: StreetUpdate) -> Street:
        try:
            payload = {k: v for k, v in data.model_dump().items() if v is not None}
            result = supabase.table("Streets").update(payload).eq("id", street_id).execute()
            return Street(**result.data[0])
        except Exception as e:
            raise Exception(f"Failed to update street: {str(e)}")

    @staticmethod
    async def delete_street(street_id: int) -> bool:
        try:
            supabase.table("Streets").delete().eq("id", street_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete street: {str(e)}")

    @staticmethod
    async def search_streets_by_text(text: str, district_id: Optional[int] = None, city_id: Optional[int] = None, limit: int = 10) -> list:
        """Search streets by text with normalization and fuzzy matching.
        Returns list of dicts: {id, name, type, district_id, city_id, score}
        Lower score == better match.
        """
        try:
            if not text or not str(text).strip():
                return []
            import re
            def _normalize(s: str) -> str:
                s = str(s or '').strip().lower()
                s = unicodedata.normalize('NFKD', s)
                s = ''.join(ch for ch in s if not unicodedata.combining(ch))
                s = re.sub(r'[^0-9a-z\s]', ' ', s)
                s = ' '.join(s.split())
                return s

            def _lev(a: str, b: str) -> int:
                if a == b:
                    return 0
                if len(a) == 0:
                    return len(b)
                if len(b) == 0:
                    return len(a)
                prev = list(range(len(b) + 1))
                for i, ca in enumerate(a, start=1):
                    curr = [i]
                    for j, cb in enumerate(b, start=1):
                        insert_cost = curr[j-1] + 1
                        delete_cost = prev[j] + 1
                        replace_cost = prev[j-1] + (0 if ca == cb else 1)
                        curr.append(min(insert_cost, delete_cost, replace_cost))
                    prev = curr
                return prev[-1]

            q = _normalize(text)
            # Fetch candidate streets filtered by district or city
            query = supabase.table("Streets").select("id, name, type, district_id, city_id").order("name")
            if district_id is not None:
                query = query.eq("district_id", district_id)
            elif city_id is not None:
                query = query.eq("city_id", city_id)
            res = query.execute()
            candidates = res.data or []

            scored = []
            for item in candidates:
                name = item.get('name') or ''
                norm = _normalize(name)
                score = None
                if norm == q:
                    score = 0.0
                elif q in norm or norm in q:
                    score = 0.1
                else:
                    dist = _lev(q, norm)
                    max_len = max(len(q), len(norm), 1)
                    # normalized distance
                    score = dist / max_len
                scored.append({
                    'id': item.get('id'),
                    'name': name,
                    'type': item.get('type'),
                    'district_id': item.get('district_id'),
                    'city_id': item.get('city_id'),
                    'score': round(float(score), 3)
                })

            # sort by score asc, then by name
            scored.sort(key=lambda x: (x['score'], x['name']))
            return scored[:limit]
        except Exception as e:
            raise Exception(f"Failed to search streets: {str(e)}")

    # ==================== POSITIONS ====================

    @staticmethod
    async def get_positions(street_id: Optional[int] = None) -> List[Position]:
        try:
            if street_id is not None:
                # Filter directly on Positions.streets JSON array
                result = supabase.table("Positions").select("*").contains("streets", [street_id]).order("id").execute()
            else:
                result = supabase.table("Positions").select("*").order("id").execute()
            return [Position(**MapsService._db_pos_to_model(item)) for item in (result.data or [])]
        except Exception as e:
            raise Exception(f"Failed to fetch positions: {str(e)}")

    @staticmethod
    async def get_position_by_id(position_id: int) -> Optional[Position]:
        try:
            result = supabase.table("Positions").select("*").eq("id", position_id).execute()
            if result.data:
                return Position(**MapsService._db_pos_to_model(result.data[0]))
            return None
        except Exception as e:
            raise Exception(f"Failed to fetch position: {str(e)}")

    @staticmethod
    async def create_position(data: PositionCreate) -> Position:
        try:
            next_id = _next_id("Positions")
            # Map internal x/y to DB columns long/lat
            payload = {"id": next_id, "long": data.x, "lat": data.y}
            # include streets JSON if provided on model
            if getattr(data, 'street_id', None):
                payload['streets'] = [data.street_id]
            for field in ("ban", "speed", "park", "lane", "tool", "flooding"):
                val = getattr(data, field)
                if val is not None:
                    payload[field] = val
            result = supabase.table("Positions").insert(payload).execute()
            if not result.data:
                raise Exception("Failed to insert position")
            pos = result.data[0]
            # append to Streets.positions JSON column if street_id provided
            if getattr(data, 'street_id', None):
                try:
                    street_row = supabase.table("Streets").select("positions").eq("id", data.street_id).limit(1).execute()
                    existing = []
                    if street_row.data and 'positions' in street_row.data[0] and street_row.data[0]['positions']:
                        existing = list(street_row.data[0]['positions'])
                    existing.append(pos['id'])
                    supabase.table("Streets").update({"positions": existing}).eq("id", data.street_id).execute()
                except Exception:
                    pass
            return Position(**MapsService._db_pos_to_model(pos))
        except Exception as e:
            raise Exception(f"Failed to create position: {str(e)}")

    @staticmethod
    async def update_position(position_id: int, data: PositionUpdate) -> Position:
        try:
            payload = {k: v for k, v in data.model_dump().items() if v is not None}
            result = supabase.table("Positions").update(payload).eq("id", position_id).execute()
            return Position(**result.data[0])
        except Exception as e:
            raise Exception(f"Failed to update position: {str(e)}")

    @staticmethod
    async def delete_position(position_id: int) -> bool:
        try:
            supabase.table("Positions").delete().eq("id", position_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete position: {str(e)}")

    @staticmethod
    async def create_positions_bulk(positions_payload: list) -> list:
        """positions_payload: [{lat, lon, streets: [street_id, ...], pos_id?}, ...]
        Each item is ONE unique position carrying its complete streets array.
        pos_id present → UPDATE existing Positions row and sync Streets.positions arrays.
        pos_id absent  → INSERT new row, then add its id to all relevant Streets.positions arrays.
        Returns list of affected position records.
        """
        created = []
        try:
            for pt in positions_payload:
                lat     = float(pt.get('lat'))
                lon     = float(pt.get('lon'))
                streets = [int(s) for s in (pt.get('streets') or [])]
                pos_id  = pt.get('pos_id')

                if pos_id:
                    # ── UPDATE existing position ──────────────────────────────────
                    pos_id = int(pos_id)
                    # Fetch old streets so we can diff
                    existing_pos = supabase.table("Positions").select("streets").eq("id", pos_id).limit(1).execute()
                    old_streets = list((existing_pos.data[0].get('streets') or []) if existing_pos.data else [])

                    result = supabase.table("Positions").update({"long": lon, "lat": lat, "streets": streets}).eq("id", pos_id).execute()
                    if result.data:
                        created.append(result.data[0])

                    # Remove pos_id from Streets that are no longer associated
                    for sid in old_streets:
                        if sid not in streets:
                            try:
                                sr = supabase.table("Streets").select("positions").eq("id", sid).limit(1).execute()
                                if sr.data:
                                    existing = [i for i in (sr.data[0].get('positions') or []) if i != pos_id]
                                    supabase.table("Streets").update({"positions": existing}).eq("id", sid).execute()
                            except Exception:
                                pass
                    # Add pos_id to Streets newly associated
                    for sid in streets:
                        if sid not in old_streets:
                            try:
                                sr = supabase.table("Streets").select("positions").eq("id", sid).limit(1).execute()
                                if sr.data:
                                    existing = list(sr.data[0].get('positions') or [])
                                    if pos_id not in existing:
                                        existing.append(pos_id)
                                        supabase.table("Streets").update({"positions": existing}).eq("id", sid).execute()
                            except Exception:
                                pass
                else:
                    # ── INSERT new position ───────────────────────────────────────
                    next_id = _next_id("Positions")
                    payload = {"id": next_id, "long": lon, "lat": lat, "streets": streets}
                    result = supabase.table("Positions").insert(payload).execute()
                    if not result.data:
                        raise Exception("Failed to insert position")
                    pos = result.data[0]
                    created.append(pos)
                    # Append new position id to every associated Street.positions array
                    for sid in streets:
                        try:
                            sr = supabase.table("Streets").select("positions").eq("id", sid).limit(1).execute()
                            if sr.data:
                                existing = list(sr.data[0].get('positions') or [])
                                if pos['id'] not in existing:
                                    existing.append(pos['id'])
                                    supabase.table("Streets").update({"positions": existing}).eq("id", sid).execute()
                        except Exception:
                            pass

            return created
        except Exception as e:
            raise Exception(f"Failed to create/update positions bulk: {str(e)}")

    @staticmethod
    async def search_nearest(points: list) -> dict:
        """
        1 query point  → return nearest DB position.
        2 query points → find nearest DB node to each, then run Dijkstra on the
                         street-adjacency graph to return the shortest path array.
        Graph: positions are nodes; two positions are adjacent iff they share ≥1 street.
        Edge weight = Haversine distance (metres).
        Returns `tts` field: natural Vietnamese navigation text with street names,
        turn directions, and congestion warnings (speed.normal < 20 km/h).
        """
        import math
        import heapq

        def haversine_m(lat1, lon1, lat2, lon2):
            R = 6_371_000
            phi1, phi2 = math.radians(lat1), math.radians(lat2)
            dphi = math.radians(lat2 - lat1)
            dlam = math.radians(lon2 - lon1)
            a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
            return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

        def bearing_deg(lat1, lon1, lat2, lon2):
            phi1 = math.radians(lat1)
            phi2 = math.radians(lat2)
            dl   = math.radians(lon2 - lon1)
            x = math.sin(dl) * math.cos(phi2)
            y = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dl)
            return (math.degrees(math.atan2(x, y)) + 360) % 360

        def turn_vi(b_in, b_out):
            diff = (b_out - b_in + 360) % 360
            if diff <= 30 or diff >= 330:
                return "đi thẳng"
            elif diff < 150:
                return "rẽ phải"
            elif diff < 210:
                return "quay đầu"
            else:
                return "rẽ trái"

        def is_congested(pos_row):
            speed = pos_row.get("speed")
            if isinstance(speed, dict):
                normal = speed.get("normal")
                try:
                    return normal is not None and float(normal) < 20
                except (ValueError, TypeError):
                    pass
            return False

        def build_tts(path_pts, pos_by_id_map, s_map, total_m):
            if not path_pts:
                return ""
            if len(path_pts) == 1:
                snames = path_pts[0]["street_names"]
                loc = snames[0] if snames else "vị trí không xác định"
                return f"Vị trí gần nhất nằm trên {loc}."

            # Street shared between each consecutive pair of path nodes
            segment_streets = []
            for i in range(len(path_pts) - 1):
                shared = set(path_pts[i]["streets"]) & set(path_pts[i + 1]["streets"])
                segment_streets.append(list(shared)[0] if shared else None)

            instructions = []
            current_sid = segment_streets[0]
            start_name = s_map.get(current_sid, "đường không xác định")
            instructions.append(f"Xuất phát từ {start_name}")

            for i in range(1, len(path_pts)):
                pt      = path_pts[i]
                pos_row = pos_by_id_map.get(pt["id"], {})

                # Congestion warning
                if is_congested(pos_row):
                    loc = " - ".join(pt["street_names"]) if pt["street_names"] else "điểm này"
                    instructions.append(f"Lưu ý kẹt xe tại {loc}")

                # Detect street change at this node
                new_sid = segment_streets[i] if i < len(segment_streets) else None
                if new_sid is not None and new_sid != current_sid:
                    # Bearings: incoming (i-1 → i) and outgoing (i → i+1)
                    p_prev = path_pts[i - 1]
                    p_curr = pt
                    p_next = path_pts[i + 1]   # always valid: i < len(segment_streets) ensures i+1 exists
                    b_in  = bearing_deg(float(p_prev["lat"]), float(p_prev["lon"]),
                                        float(p_curr["lat"]), float(p_curr["lon"]))
                    b_out = bearing_deg(float(p_curr["lat"]), float(p_curr["lon"]),
                                        float(p_next["lat"]), float(p_next["lon"]))
                    turn     = turn_vi(b_in, b_out)
                    new_name = s_map.get(new_sid, "đường không xác định")
                    inter    = " - ".join(pt["street_names"]) if len(pt["street_names"]) > 1 else ""
                    if inter:
                        instructions.append(f"Tại ngã tư {inter}, {turn} vào {new_name}")
                    else:
                        instructions.append(f"{turn.capitalize()} vào {new_name}")
                    current_sid = new_sid

            dist_text = (
                f"khoảng {total_m} mét" if total_m < 1000
                else f"khoảng {round(total_m / 1000, 1)} kilômét"
            )
            instructions.append(f"Đã đến nơi. Tổng quãng đường {dist_text}")
            return ". ".join(instructions) + "."

        try:
            result = supabase.table("Positions").select("*").execute()
            all_positions = result.data or []
            if not all_positions:
                return {"data": [], "label": "Không có điểm nào trong CSDL", "tts": "", "warning": "", "message": ""}

            streets_result = supabase.table("Streets").select("id, name").execute()
            street_map = {s["id"]: s["name"] for s in (streets_result.data or [])}

            pos_by_id = {}
            for p in all_positions:
                if p.get("lat") is not None and p.get("long") is not None:
                    pos_by_id[p["id"]] = p

            def find_nearest_id(qlat, qlon):
                best_id, best_d = None, float("inf")
                for pid, pos in pos_by_id.items():
                    d = haversine_m(qlat, qlon, float(pos["lat"]), float(pos["long"]))
                    if d < best_d:
                        best_d, best_id = d, pid
                return best_id, best_d

            def make_result_point(pos):
                street_ids = pos.get("streets") or []
                return {
                    "id": pos["id"],
                    "lat": pos["lat"],
                    "lon": pos["long"],
                    "streets": street_ids,
                    "street_names": [street_map.get(sid, str(sid)) for sid in street_ids],
                }

            def dist_label(m):
                return f"~{m}m" if m < 1000 else f"~{round(m / 1000, 1)}km"

            # ── Single-point mode: return nearest ────────────────────────────
            if len(points) < 2:
                qlat, qlon = float(points[0]["lat"]), float(points[0]["lon"])
                nid, dist_m = find_nearest_id(qlat, qlon)
                if nid is None:
                    return {"data": [], "label": "Không tìm thấy", "tts": "", "warning": "", "message": ""}
                pt    = make_result_point(pos_by_id[nid])
                sname = pt["street_names"][0] if pt["street_names"] else "vị trí không xác định"
                return {
                    "data": [pt],
                    "label": f"Điểm gần nhất: {sname} ({dist_label(round(dist_m))})",
                    "tts": f"Vị trí gần nhất nằm trên {sname}, cách bạn khoảng {round(dist_m)} mét.",
                    "warning": "",
                    "message": f"Khoảng cách: ~{round(dist_m)}m",
                }

            # ── Two-point mode: shortest path via Dijkstra ───────────────────
            q1, q2 = points[0], points[1]
            start_id, d_start = find_nearest_id(float(q1["lat"]), float(q1["lon"]))
            end_id,   d_end   = find_nearest_id(float(q2["lat"]), float(q2["lon"]))

            if start_id is None or end_id is None:
                return {"data": [], "label": "Không tìm thấy", "tts": "", "warning": "Không có điểm nào gần query", "message": ""}

            if start_id == end_id:
                pt    = make_result_point(pos_by_id[start_id])
                sname = pt["street_names"][0] if pt["street_names"] else "vị trí này"
                return {
                    "data": [pt],
                    "label": f"Điểm xuất phát và đích trùng nhau tại {sname}",
                    "tts": f"Điểm xuất phát và điểm đích đều nằm tại {sname}.",
                    "warning": "",
                    "message": "",
                }

            # Build adjacency: positions adjacent if they share a street
            street_to_pids: dict = {}
            for pid, pos in pos_by_id.items():
                for sid in (pos.get("streets") or []):
                    street_to_pids.setdefault(sid, set()).add(pid)

            adjacency: dict = {pid: {} for pid in pos_by_id}
            for sid, pids in street_to_pids.items():
                pid_list = list(pids)
                for i, pid1 in enumerate(pid_list):
                    p1 = pos_by_id[pid1]
                    for pid2 in pid_list[i + 1:]:
                        p2 = pos_by_id[pid2]
                        d = haversine_m(float(p1["lat"]), float(p1["long"]),
                                        float(p2["lat"]), float(p2["long"]))
                        if pid2 not in adjacency[pid1] or adjacency[pid1][pid2] > d:
                            adjacency[pid1][pid2] = d
                            adjacency[pid2][pid1] = d

            # Dijkstra
            dist  = {pid: float("inf") for pid in pos_by_id}
            prev  = {pid: None         for pid in pos_by_id}
            dist[start_id] = 0
            heap = [(0.0, start_id)]

            while heap:
                d, u = heapq.heappop(heap)
                if d > dist[u]:
                    continue
                if u == end_id:
                    break
                for v, w in adjacency[u].items():
                    nd = dist[u] + w
                    if nd < dist[v]:
                        dist[v] = nd
                        prev[v] = u
                        heapq.heappush(heap, (nd, v))

            if dist[end_id] == float("inf"):
                return {
                    "data": [],
                    "label": "Không tìm được đường",
                    "tts": "Không tìm được đường đi giữa hai điểm này.",
                    "warning": "Hai điểm không có đường nối trong đồ thị",
                    "message": "",
                }

            # Reconstruct path
            path_ids = []
            cur = end_id
            while cur is not None:
                path_ids.append(cur)
                cur = prev[cur]
            path_ids.reverse()

            total_m = round(dist[end_id])
            data    = [make_result_point(pos_by_id[pid]) for pid in path_ids]

            start_name = data[0]["street_names"][0]  if data[0]["street_names"]  else "?"
            end_name   = data[-1]["street_names"][0] if data[-1]["street_names"] else "?"
            label = f"Từ {start_name} đến {end_name}, {dist_label(total_m)}"
            tts   = build_tts(data, pos_by_id, street_map, total_m)

            return {
                "data": data,
                "label": label,
                "tts": tts,
                "tts_url": "",
                "warning": "",
                "message": f"Tổng: {dist_label(total_m)}  |  Snap start: ~{round(d_start)}m  |  Snap end: ~{round(d_end)}m",
            }

        except Exception as e:
            raise Exception(f"Search nearest failed: {str(e)}")

    @staticmethod
    async def delete_position_cascade(position_id: int) -> bool:
        """Delete a position and remove its id from any Streets.positions arrays listed in position.streets"""
        try:
            # fetch position to know related streets
            pos = None
            result = supabase.table("Positions").select("*").eq("id", position_id).limit(1).execute()
            if result.data:
                pos = result.data[0]
            # remove this position from Streets.positions JSON arrays if present
            if pos and 'streets' in pos and pos['streets']:
                for sid in pos['streets']:
                    try:
                        street_row = supabase.table("Streets").select("positions").eq("id", sid).limit(1).execute()
                        if street_row.data:
                            existing = list(street_row.data[0].get('positions') or [])
                            if position_id in existing:
                                existing = [i for i in existing if i != position_id]
                                supabase.table("Streets").update({"positions": existing}).eq("id", sid).execute()
                    except Exception:
                        pass
            # delete the position
            supabase.table("Positions").delete().eq("id", position_id).execute()

            return True
        except Exception as e:
            raise Exception(f"Failed to delete position cascade: {str(e)}")
