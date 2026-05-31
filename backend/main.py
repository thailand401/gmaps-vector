import sys
import os

# Add backend directory to path to import modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List
import logging

from config import supabase, settings
from models import (
    Category, CategoryCreate, CategoryUpdate,
    Intent, IntentCreate, IntentUpdate, IntentWithCategory,
    City, CityCreate, District, DistrictCreate, Street, StreetCreate
)
from services.category_service import CategoryService
from services.intent_service import IntentService
from services.maps_service import MapsService

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Admin Dashboard API",
    description="CRUD API for managing categories and intents",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check
@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test Supabase connection by fetching one record
        result = supabase.table("Categories").select("id").limit(1).execute()
        return {"status": "ok", "database": "connected"}
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Database connection failed")


# ==================== CATEGORIES ENDPOINTS ====================

@app.get("/api/categories", response_model=List[Category])
async def list_categories(search: Optional[str] = Query(None)):
    """Get all categories with optional search"""
    try:
        categories = await CategoryService.get_all_categories(search)
        return categories
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/categories/{category_id}", response_model=Category)
async def get_category(category_id: int):
    """Get a single category by id"""
    try:
        category = await CategoryService.get_category_by_id(category_id)
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/categories", response_model=Category)
async def create_category(category: CategoryCreate):
    """Create a new category"""
    try:
        new_category = await CategoryService.create_category(category)
        return new_category
    except Exception as e:
        logger.error(f"Error creating category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/categories/{category_id}", response_model=Category)
async def update_category(category_id: int, category: CategoryUpdate):
    """Update an existing category"""
    try:
        updated = await CategoryService.update_category(category_id, category)
        return updated
    except Exception as e:
        logger.error(f"Error updating category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: int):
    """Delete a category"""
    try:
        await CategoryService.delete_category(category_id)
        return {"message": "Category deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== INTENTS ENDPOINTS ====================

@app.get("/api/intents", response_model=List[IntentWithCategory])
async def list_intents(
    search: Optional[str] = Query(None),
    category_id: Optional[int] = Query(None),
    priority: Optional[str] = Query(None)
):
    """Get all intents with optional filters"""
    try:
        intents = await IntentService.get_all_intents(search, category_id, priority)
        return intents
    except Exception as e:
        logger.error(f"Error fetching intents: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/intents/{intent_id}", response_model=IntentWithCategory)
async def get_intent(intent_id: int):
    """Get a single intent by ID"""
    try:
        intent = await IntentService.get_intent_by_id(intent_id)
        if not intent:
            raise HTTPException(status_code=404, detail="Intent not found")
        return intent
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/categories/{category_id}/intents", response_model=List[IntentWithCategory])
async def get_intents_by_category(category_id: int):
    """Get all intents for a specific category"""
    try:
        intents = await IntentService.get_intents_by_category(category_id)
        return intents
    except Exception as e:
        logger.error(f"Error fetching intents for category: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/intents", response_model=IntentWithCategory)
async def create_intent(intent: IntentCreate):
    """Create a new intent"""
    try:
        new_intent = await IntentService.create_intent(intent)
        return new_intent
    except Exception as e:
        logger.error(f"Error creating intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/api/intents/{intent_id}", response_model=IntentWithCategory)
async def update_intent(intent_id: int, intent: IntentUpdate):
    """Update an existing intent"""
    try:
        updated = await IntentService.update_intent(intent_id, intent)
        return updated
    except Exception as e:
        logger.error(f"Error updating intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/intents/{intent_id}")
async def delete_intent(intent_id: int):
    """Delete an intent"""
    try:
        await IntentService.delete_intent(intent_id)
        return {"message": "Intent deleted successfully"}
    except Exception as e:
        logger.error(f"Error deleting intent: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== MAPS ENDPOINTS ====================

@app.get("/api/cities", response_model=List[City])
async def list_cities():
    """Get all cities"""
    try:
        return await MapsService.get_all_cities()
    except Exception as e:
        logger.error(f"Error fetching cities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/cities", response_model=City)
async def create_city(city: CityCreate):
    """Create a new city"""
    try:
        return await MapsService.create_city(city)
    except Exception as e:
        logger.error(f"Error creating city: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/districts", response_model=List[District])
async def list_districts(city_id: Optional[int] = Query(None)):
    """Get districts, optionally filtered by city_id"""
    try:
        return await MapsService.get_districts(city_id)
    except Exception as e:
        logger.error(f"Error fetching districts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/districts", response_model=District)
async def create_district(district: DistrictCreate):
    """Create a new district"""
    try:
        return await MapsService.create_district(district)
    except Exception as e:
        logger.error(f"Error creating district: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/streets", response_model=List[Street])
async def list_streets(
    district_id: Optional[int] = Query(None),
    city_id: Optional[int] = Query(None)
):
    """Get streets, optionally filtered by district_id or city_id"""
    try:
        return await MapsService.get_streets(district_id, city_id)
    except Exception as e:
        logger.error(f"Error fetching streets: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/streets", response_model=Street)
async def create_street(street: StreetCreate):
    """Create a new street"""
    try:
        return await MapsService.create_street(street)
    except Exception as e:
        logger.error(f"Error creating street: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=4000, log_level="info")
