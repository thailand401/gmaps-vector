from config import supabase
from models import Category, CategoryCreate, CategoryUpdate
from typing import List, Optional


class CategoryService:
    @staticmethod
    async def get_all_categories(search: Optional[str] = None) -> List[Category]:
        """Get all categories, optionally filtered by search term"""
        try:
            query = supabase.table("Categories").select("*")

            if search:
                query = query.ilike("label", f"%{search}%")

            result = query.execute()
            return [Category(**item) for item in result.data]
        except Exception as e:
            raise Exception(f"Failed to fetch categories: {str(e)}")

    @staticmethod
    async def get_category_by_id(category_id: int) -> Optional[Category]:
        """Get a single category by id"""
        try:
            result = supabase.table("Categories").select("*").eq("id", category_id).execute()
            if result.data:
                return Category(**result.data[0])
            return None
        except Exception as e:
            raise Exception(f"Failed to fetch category: {str(e)}")

    @staticmethod
    async def create_category(category: CategoryCreate) -> Category:
        """Create a new category"""
        try:
            result = supabase.table("Categories").insert(category.dict()).execute()
            if result.data:
                return Category(**result.data[0])
            raise Exception("Failed to create category")
        except Exception as e:
            raise Exception(f"Failed to create category: {str(e)}")

    @staticmethod
    async def update_category(category_id: int, category: CategoryUpdate) -> Category:
        """Update an existing category"""
        try:
            update_data = category.dict(exclude_unset=True)
            result = supabase.table("Categories").update(update_data).eq("id", category_id).execute()
            if result.data:
                return Category(**result.data[0])
            raise Exception("Category not found")
        except Exception as e:
            raise Exception(f"Failed to update category: {str(e)}")

    @staticmethod
    async def delete_category(category_id: int) -> bool:
        """Delete a category"""
        try:
            result = supabase.table("Categories").delete().eq("id", category_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete category: {str(e)}")
