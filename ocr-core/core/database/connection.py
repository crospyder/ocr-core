from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL_MAIN = "mysql+pymysql://npausic:Spineict%402025!@localhost/SpineICT_OCR"

engine_main = create_engine(
    DATABASE_URL_MAIN,
    pool_pre_ping=True,
    echo=False
)

SessionMain = sessionmaker(bind=engine_main)

def get_db():
    db = SessionMain()
    try:
        yield db
    finally:
        db.close()
