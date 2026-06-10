import logging

from decouple import config
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

log = logging.getLogger(__name__)

DATABASE_URL = config(
    'DATABASE_URL',
    default='postgresql://cleanrun_user:cleanrun_pass@localhost:5432/cleanrun_db',
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # test connections before use (drops stale sockets)
    pool_size=5,             # resident connections kept open
    max_overflow=10,         # burst connections beyond pool_size
    pool_timeout=30,         # seconds to wait for a free connection
    pool_recycle=1800,       # recycle connections every 30 min (avoids server-side timeouts)
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
