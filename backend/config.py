import os
from pydantic_settings import BaseSettings
from supabase import create_client, Client


class Settings(BaseSettings):
    supabase_url: str
    supabase_key: str

    class Config:
        env_file = "../.env"


settings = Settings()

# Initialize Supabase client
supabase: Client = create_client(settings.supabase_url, settings.supabase_key)
