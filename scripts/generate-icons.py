"""Export exact embedded ICO sizes for the extension. Requires Pillow."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
with Image.open(root / "icons" / "clean-url.ico") as icon:
    for size in (16, 32, 48, 128):
        if (size, size) not in icon.ico.sizes():
            raise ValueError(f"Missing embedded icon size: {size}")
        icon.ico.getimage((size, size)).convert("RGBA").save(
            root / "icons" / f"icon-{size}.png"
        )
