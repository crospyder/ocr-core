from core.database.models import AppSetting
from sqlalchemy.orm import Session

def get_setting(db: Session, key: str):
    return db.query(AppSetting).filter(AppSetting.key == key).first()

def set_setting(db: Session, key: str, value):
    setting = get_setting(db, key)
    if setting:
        setting.value = value
    else:
        setting = AppSetting(key=key, value=value)
        db.add(setting)
    db.commit()
    db.refresh(setting)
    return setting

def get_all_settings(db: Session):
    return db.query(AppSetting).all()
