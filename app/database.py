from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from decouple import config

DATABASE_URL = config(
    'DATABASE_URL',
    default='postgresql://cleanrun_user:cleanrun_pass@localhost:5432/cleanrun_db',
)

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
