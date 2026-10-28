#!/bin/sh
# Render the promo tiles with headless Chrome, then flatten to 24-bit RGB PNG (no alpha).
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
render() { # name width height
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --allow-file-access-from-files --window-size="$2,$3" \
    --screenshot="$PWD/$1.raw.png" "file://$PWD/$1.html" 2>/dev/null
  python3 -c "
from PIL import Image
im = Image.open('$1.raw.png').convert('RGB').crop((0, 0, $2, $3))
assert im.size == ($2, $3), im.size
im.save('$1.png', optimize=True)
"
  rm "$1.raw.png"
}
render small-tile 440 280
render marquee-tile 1400 560
