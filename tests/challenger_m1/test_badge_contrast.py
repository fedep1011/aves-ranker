#!/usr/bin/env python3
"""
CHALLENGER STRESS TEST 3: No. 025 Badge Contrast Math
Empirically computes WCAG 2.2 luminance and contrast ratios for the retro Dex badge
across Light and Dark themes, testing pure canvas, alpha-blended canvas/90 over surface,
and surface backgrounds.
"""

import sys

def parse_hex(h):
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

def rgb_to_hex(rgb):
    return f"#{int(round(rgb[0])):02x}{int(round(rgb[1])):02x}{int(round(rgb[2])):02x}"

def linearize(val):
    val = val / 255.0
    return val / 12.92 if val <= 0.03928 else ((val + 0.055) / 1.055) ** 2.4

def relative_luminance(rgb):
    r, g, b = (linearize(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def contrast_ratio(hex1, hex2):
    l1 = relative_luminance(parse_hex(hex1))
    l2 = relative_luminance(parse_hex(hex2))
    hi = max(l1, l2)
    lo = min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)

def blend(fg_hex, bg_hex, alpha):
    fg = parse_hex(fg_hex)
    bg = parse_hex(bg_hex)
    blended = tuple(fg[i] * alpha + bg[i] * (1.0 - alpha) for i in range(3))
    return rgb_to_hex(blended)

# Token definitions extracted directly from src/styles/tailwind.css
TOKENS = {
    "light": {
        "canvas": "#F6F4EF",
        "surface": "#FAF9F6",
        "ink": "#161816",
        "muted": "#696B65",
        "line": "#E4E0D6",
        "rose500_old": "#F43F5E",
    },
    "dark": {
        "canvas": "#121513",
        "surface": "#1B211E",
        "ink": "#EEF3EE",
        "muted": "#9BA39D",
        "line": "#29342B",
        "rose500_old": "#F43F5E",
    }
}

print("====================================================")
print("CHALLENGER STRESS TEST 3: No. 025 Badge Contrast Math")
print("====================================================\n")

all_passed = True

for mode, t in TOKENS.items():
    print(f"--- Theme: {mode.upper()} ---")
    canvas = t["canvas"]
    surface = t["surface"]
    ink = t["ink"]
    line = t["line"]
    
    # 1. Composite background for bg-canvas/90 over surface
    blended_bg = blend(canvas, surface, 0.90)
    print(f"  Canvas: {canvas}, Surface: {surface}, Ink: {ink}")
    print(f"  Blended bg-canvas/90 over surface: {blended_bg}")
    
    # Ratio: Ink on blended bg-canvas/90
    ratio_blended = contrast_ratio(ink, blended_bg)
    print(f"  Contrast (text-ink vs bg-canvas/90): {ratio_blended:.2f}:1")
    
    # Ratio: Ink on pure canvas
    ratio_canvas = contrast_ratio(ink, canvas)
    print(f"  Contrast (text-ink vs pure canvas):  {ratio_canvas:.2f}:1")
    
    # Ratio: Ink on pure surface
    ratio_surface = contrast_ratio(ink, surface)
    print(f"  Contrast (text-ink vs pure surface): {ratio_surface:.2f}:1")
    
    # Comparison with old rose-500 badge
    ratio_old = contrast_ratio(t["rose500_old"], surface)
    print(f"  [Reference] Old text-rose-500 on surface: {ratio_old:.2f}:1")
    
    # Assertions
    # WCAG 2.2 AA requires >= 4.5:1, AAA requires >= 7:1
    # Project spec / Worker M1 claimed >= 15:1
    if ratio_blended < 4.5:
        print(f"  FAIL: Contrast {ratio_blended:.2f}:1 fails WCAG AA (4.5:1)")
        all_passed = False
    elif ratio_blended < 7.0:
        print(f"  WARN: Contrast {ratio_blended:.2f}:1 passes AA but fails AAA (7.0:1)")
    elif ratio_blended < 15.0:
        print(f"  WARN: Contrast {ratio_blended:.2f}:1 passes AAA but falls short of 15:1 claim")
        all_passed = False
    else:
        print(f"  [PASS]: Exceeds 15:1 threshold ({ratio_blended:.2f}:1 >= 15.0:1)")

    print()

print("====================================================")
if all_passed:
    print("ALL BADGE CONTRAST RATIOS PASS WCAG AAA & > 15:1")
    print("====================================================")
    sys.exit(0)
else:
    print("BADGE CONTRAST VERIFICATION FAILED")
    print("====================================================")
    sys.exit(1)
