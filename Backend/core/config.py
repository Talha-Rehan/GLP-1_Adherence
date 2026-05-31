from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    mongodb_uri:     str
    mongodb_db_name: str = "glp1_analytics"
    data_dir:        str = "./data"
    cors_origins:    List[str] = ["http://localhost:5173", "http://localhost:4173"]

    class Config:
        env_file = ".env"


settings = Settings()
