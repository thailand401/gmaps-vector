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
            query = supabase.table("Positions").select("*").order("id")
            if street_id is not None:
                query = query.eq("street_id", street_id)
            result = query.execute()
            return [Position(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Failed to fetch positions: {str(e)}")

    @staticmethod
    async def get_position_by_id(position_id: int) -> Optional[Position]:
        try:
            result = supabase.table("Positions").select("*").eq("id", position_id).execute()
            return Position(**result.data[0]) if result.data else None
        except Exception as e:
            raise Exception(f"Failed to fetch position: {str(e)}")

    @staticmethod
    async def create_position(data: PositionCreate) -> Position:
        try:
            next_id = _next_id("Positions")
            payload = {"id": next_id, "street_id": data.street_id, "x": data.x, "y": data.y}
            for field in ("ban", "speed", "park", "lane", "tool", "flooding"):
                val = getattr(data, field)
                if val is not None:
                    payload[field] = val
            result = supabase.table("Positions").insert(payload).execute()
            return Position(**result.data[0])
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
