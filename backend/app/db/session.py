from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from typing import Generator

# Database URL for WSL2 to Windows Bridge
SQLALCHEMY_DATABASE_URL = "postgresql://postgres:admin@172.27.0.1:5432/food_db"

# engine with pool_pre_ping ensures stale connections are refreshed
# across the WSL2 network bridge
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, 
    pool_pre_ping=True
)

# SessionLocal class for creating database sessions
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# New SQLAlchemy 2.0 style Declarative Base
class Base(DeclarativeBase):
    pass

def get_db() -> Generator:
    """
    Dependency that creates a new SQLAlchemy session for each request
    and ensures it is closed after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
