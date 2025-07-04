from sqlalchemy import text
from core.database.connection import engine_main, SessionMain
from core.clients.models import Client, Base
from sqlalchemy.exc import SQLAlchemyError

def create_client_database(client_name: str, oib: str, licenses: int = 1):
    # Formatiraj ime baze
    db_name = "spineict_" + client_name.lower().replace(" ", "_").replace(".", "").replace("-", "_")

    try:
        # Kreiraj bazu ako ne postoji
        with engine_main.connect() as conn:
            conn.execute(text(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"))
            conn.commit()

        # Upisi podatke o klijentu u glavnu bazu
        session = SessionMain()
        client = Client(name=client_name, oib=oib, db_name=db_name, licenses=licenses)
        session.add(client)
        session.commit()
        session.close()

        # Pokreni inicijalizaciju sheme za novu bazu (kreiraj tablice)
        initialize_client_schema(db_name)

        return db_name

    except SQLAlchemyError as e:
        print(f"Greška pri kreiranju baze: {e}")
        return None


def initialize_client_schema(db_name: str):
    """
    Inicijaliziraj shemu (tablice) u klijentskoj bazi.
    Pretpostavimo da već imaš modele za tenant baze.
    Ovdje ih možeš importirati i kreirati tablice.
    """
    from database.models import Base as TenantBase  # import tenant modele

    engine = get_tenant_engine(db_name)
    TenantBase.metadata.create_all(engine)
