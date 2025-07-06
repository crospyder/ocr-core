from fastapi import FastAPI
import importlib
import os
from core.routes import client_info

def load_module_routers(app: FastAPI):
    modules_dir = os.path.join(os.path.dirname(__file__), '../modules')
    for module_name in os.listdir(modules_dir):
        router_path = f"modules.{module_name}.routes"
        try:
            mod = importlib.import_module(router_path)
            if hasattr(mod, "router"):
                app.include_router(mod.router, prefix=f"/api/{module_name}")
        except ModuleNotFoundError:
            continue

def create_app() -> FastAPI:
    app = FastAPI()
    app.include_router(client_info.router, prefix="/api")
    load_module_routers(app)
    return app
