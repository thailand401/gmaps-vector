from config import supabase
from models import (
    City, CityCreate, CityUpdate,
    District, DistrictCreate, DistrictUpdate,
    Street, StreetCreate, StreetUpdate,
    Position, PositionCreate, PositionUpdate,
)
from typing import List, Optional


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
        """Given a list of {lat, lon} query points, return the nearest DB position for each.
        Uses Euclidean distance on lat/lon (sufficient for small geographic areas).
        Returns {data, label, warning, message}.
        """
        import math

        def euclidean(lat1, lon1, lat2, lon2):
            dlat = lat1 - lat2
            dlon = (lon1 - lon2) * math.cos(math.radians((lat1 + lat2) / 2))
            return math.sqrt(dlat * dlat + dlon * dlon)

        try:
            # Fetch all positions
            result = supabase.table("Positions").select("*").execute()
            all_positions = result.data or []

            if not all_positions:
                return {"data": [], "label": "Tìm kiếm", "warning": "", "message": "Không có điểm nào trong CSDL."}

            # Fetch street names for label resolution
            streets_result = supabase.table("Streets").select("id, name").execute()
            street_map = {s["id"]: s["name"] for s in (streets_result.data or [])}

            data = []
            for qpt in points:
                qlat = float(qpt.get("lat"))
                qlon = float(qpt.get("lon"))
                best = None
                best_dist = float("inf")
                for pos in all_positions:
                    plat = pos.get("lat")
                    plon = pos.get("long")
                    if plat is None or plon is None:
                        continue
                    d = euclidean(qlat, qlon, float(plat), float(plon))
                    if d < best_dist:
                        best_dist = d
                        best = pos
                if best:
                    street_ids = best.get("streets") or []
                    street_names = [street_map.get(sid, str(sid)) for sid in street_ids]
                    # convert degrees distance to approximate metres (1 deg ≈ 111 km)
                    dist_m = round(best_dist * 111000, 1)
                    data.append({
                        "id": best["id"],
                        "lat": best["lat"],
                        "lon": best["long"],
                        "streets": street_ids,
                        "street_names": street_names,
                        "distance_m": dist_m,
                        "query_lat": qlat,
                        "query_lon": qlon,
                    })

            return {
                "data": data,
                "label": f"{len(data)} điểm gần nhất",
                "warning": "",
                "message": ""
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
