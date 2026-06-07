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
                    # find pos_ids from StreetPosition join table
                    sp = supabase.table("StreetPosition").select("pos_id").eq("street_id", street_id).execute()
                    pos_ids = [r['pos_id'] for r in sp.data] if sp.data else []
                    if not pos_ids:
                        return []
                    # fetch positions by id in pos_ids
                    result = supabase.table("Positions").select("*").in_("id", pos_ids).order("id").execute()
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
            # if street_id provided, insert relation into StreetPosition
            if getattr(data, 'street_id', None):
                supabase.table("StreetPosition").insert({"pos_id": pos['id'], "street_id": data.street_id}).execute()
            # also append to Streets.positions JSON column if exists
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
    async def create_positions_bulk(streets_payload: list) -> list:
        """streets_payload: [{id: street_id, points: [{lat, lon}, ...]}, ...]
        Inserts positions and updates Streets.positions arrays accordingly.
        Returns list of created position records.
        """
        created = []
        try:
            for street in streets_payload:
                street_id = int(street.get('id'))
                points = street.get('points') or []
                for pt in points:
                    lat = float(pt.get('lat'))
                    lon = float(pt.get('lon'))
                    next_id = _next_id("Positions")
                    payload = {"id": next_id, "long": lon, "lat": lat, "streets": [street_id]}
                    result = supabase.table("Positions").insert(payload).execute()
                    if not result.data:
                        raise Exception("Failed to insert position")
                    pos = result.data[0]
                    created.append(pos)
                    # insert into StreetPosition relation
                    supabase.table("StreetPosition").insert({"pos_id": pos['id'], "street_id": street_id}).execute()
                    # append to Streets.positions JSON column if exists
                    try:
                        street_row = supabase.table("Streets").select("positions").eq("id", street_id).limit(1).execute()
                        existing = []
                        if street_row.data and 'positions' in street_row.data[0] and street_row.data[0]['positions']:
                            existing = list(street_row.data[0]['positions'])
                        existing.append(pos['id'])
                        supabase.table("Streets").update({"positions": existing}).eq("id", street_id).execute()
                    except Exception:
                        pass

            return created
        except Exception as e:
            raise Exception(f"Failed to create positions bulk: {str(e)}")

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
            # delete any StreetPosition relations
            supabase.table("StreetPosition").delete().eq("pos_id", position_id).execute()
            # delete the position
            supabase.table("Positions").delete().eq("id", position_id).execute()

            return True
        except Exception as e:
            raise Exception(f"Failed to delete position cascade: {str(e)}")
