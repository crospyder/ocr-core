import sys
import os

# Dodaj folder core/routes u path za import
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "core", "routes")))

from oibvalidator import is_valid_oib

def test_oibs():
    test_oibs = ["49528128847", "66609700583", "12124357891"]
    for oib in test_oibs:
        result = is_valid_oib(oib)
        print(f"OIB {oib} je {'valjan' if result else 'nevaljan'}")
        assert result, f"OIB {oib} treba biti valjan!"

if __name__ == "__main__":
    test_oibs()
