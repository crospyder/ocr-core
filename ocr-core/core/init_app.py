import importlib
import os

def load_module_routers(app):
    modules_dir = os.path.join(os.path.dirname(__file__), '../modules')
    for module_name in os.listdir(modules_dir):
        router_path = f"modules.{module_name}.routes"
        try:
            mod = importlib.import_module(router_path)
            if hasattr(mod, "router"):
                app.include_router(mod.router, prefix=f"/api/{module_name}")
        except ModuleNotFoundError:
            continue
