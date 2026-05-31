from config import supabase
from models import Intent, IntentCreate, IntentUpdate, IntentWithCategory
from typing import List, Optional


class IntentService:
    @staticmethod
    async def get_all_intents(
        search: Optional[str] = None,
        category_id: Optional[int] = None,
        priority: Optional[str] = None
    ) -> List[IntentWithCategory]:
        """Get all intents with optional filters"""
        try:
            query = supabase.table("Intents").select("*, Categories(label)")

            if search:
                query = query.ilike("name", f"%{search}%")

            if category_id:
                query = query.eq("category_id", category_id)

            if priority:
                query = query.eq("priority", priority)

            result = query.execute()
            intents = []
            for item in result.data:
                # Flatten nested category data
                if "Categories" in item and item["Categories"]:
                    item["category_label"] = item["Categories"].get("label")
                else:
                    item["category_label"] = None
                
                # Remove nested Categories key before creating model
                item.pop("Categories", None)
                
                intent = IntentWithCategory(**item)
                intents.append(intent)
            return intents
        except Exception as e:
            raise Exception(f"Failed to fetch intents: {str(e)}")

    @staticmethod
    async def get_intent_by_id(intent_id: int) -> Optional[IntentWithCategory]:
        """Get a single intent by ID"""
        try:
            result = supabase.table("Intents").select("*, Categories(label)").eq("id", intent_id).execute()
            if result.data:
                item = result.data[0]
                
                # Flatten nested category data
                if "Categories" in item and item["Categories"]:
                    item["category_label"] = item["Categories"].get("label")
                else:
                    item["category_label"] = None
                
                # Remove nested Categories key before creating model
                item.pop("Categories", None)
                
                intent = IntentWithCategory(**item)
                return intent
            return None
        except Exception as e:
            raise Exception(f"Failed to fetch intent: {str(e)}")

    @staticmethod
    async def get_intents_by_category(category_id: int) -> List[IntentWithCategory]:
        """Get all intents for a specific category"""
        try:
            result = supabase.table("Intents").select("*, Categories(label)").eq("category_id", category_id).execute()
            intents = []
            for item in result.data:
                # Flatten nested category data
                if "Categories" in item and item["Categories"]:
                    item["category_label"] = item["Categories"].get("label")
                else:
                    item["category_label"] = None
                
                # Remove nested Categories key before creating model
                item.pop("Categories", None)
                
                intent = IntentWithCategory(**item)
                intents.append(intent)
            return intents
        except Exception as e:
            raise Exception(f"Failed to fetch intents for category: {str(e)}")

    @staticmethod
    async def create_intent(intent: IntentCreate) -> IntentWithCategory:
        """Create a new intent"""
        try:
            result = supabase.table("Intents").insert(intent.dict()).execute()
            if result.data:
                item = result.data[0]
                return IntentWithCategory(**item)
            raise Exception("Failed to create intent")
        except Exception as e:
            raise Exception(f"Failed to create intent: {str(e)}")

    @staticmethod
    async def update_intent(intent_id: int, intent: IntentUpdate) -> IntentWithCategory:
        """Update an existing intent"""
        try:
            update_data = intent.dict(exclude_unset=True)
            result = supabase.table("Intents").update(update_data).eq("id", intent_id).execute()
            if result.data:
                item = result.data[0]
                return IntentWithCategory(**item)
            raise Exception("Intent not found")
        except Exception as e:
            raise Exception(f"Failed to update intent: {str(e)}")

    @staticmethod
    async def delete_intent(intent_id: int) -> bool:
        """Delete an intent"""
        try:
            result = supabase.table("Intents").delete().eq("id", intent_id).execute()
            return True
        except Exception as e:
            raise Exception(f"Failed to delete intent: {str(e)}")
