from pydantic import BaseModel
from typing import Optional, List, Union


class CategoryBase(BaseModel):
    label: str


class Category(CategoryBase):
    id: Optional[int] = None
    embedding: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    label: Optional[str] = None
    embedding: Optional[str] = None


class IntentBase(BaseModel):
    name: str
    priority: Union[int, str]
    category_id: int


class Intent(IntentBase):
    id: Optional[int] = None
    embedding: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class IntentCreate(IntentBase):
    pass


class IntentUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[Union[int, str]] = None
    category_id: Optional[int] = None
    embedding: Optional[str] = None


class IntentWithCategory(Intent):
    category_label: Optional[str] = None


# ==================== MAPS MODELS ====================

class City(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class CityCreate(BaseModel):
    name: str


class District(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    lname: Optional[str] = None
    city: Optional[int] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class DistrictCreate(BaseModel):
    name: str
    lname: Optional[str] = None
    city: int


class Street(BaseModel):
    id: Optional[int] = None
    name: Optional[str] = None
    type: Optional[str] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None
    positions: Optional[list] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class StreetCreate(BaseModel):
    name: str
    type: Optional[str] = None
    district_id: int
    city_id: int


class CityUpdate(BaseModel):
    name: Optional[str] = None


class DistrictUpdate(BaseModel):
    name: Optional[str] = None
    lname: Optional[str] = None
    city: Optional[int] = None


class StreetUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    district_id: Optional[int] = None
    city_id: Optional[int] = None


# ==================== POSITIONS MODEL ====================

class Position(BaseModel):
    id: Optional[int] = None
    street_id: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    streets: Optional[list] = None
    ban: Optional[list] = None
    speed: Optional[dict] = None
    park: Optional[bool] = None
    lane: Optional[int] = None
    tool: Optional[int] = None
    flooding: Optional[bool] = None
    created_at: Optional[str] = None

    class Config:
        from_attributes = True


class PositionCreate(BaseModel):
    street_id: int
    x: float
    y: float
    ban: Optional[list] = None
    speed: Optional[dict] = None
    park: Optional[bool] = None
    lane: Optional[int] = None
    tool: Optional[int] = None
    flooding: Optional[bool] = None


class PositionUpdate(BaseModel):
    street_id: Optional[int] = None
    x: Optional[float] = None
    y: Optional[float] = None
    ban: Optional[list] = None
    speed: Optional[dict] = None
    park: Optional[bool] = None
    lane: Optional[int] = None
    tool: Optional[int] = None
    flooding: Optional[bool] = None
