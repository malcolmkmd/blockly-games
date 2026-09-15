#!/usr/bin/env python3
# Copyright 2026 Thinka
# SPDX-License-Identifier: Apache-2.0
"""Generate 4x maze sprites that keep the original frame layout.

Character sheets are 21 frames of 49x52 (output 4116x208).
Tile sheets are a 5x4 grid of 50x50 tiles (output 1000x800).
The maze SVG still sizes them to 1029x52 and 250x200, so retina
screens get extra pixels without any clip-path or animation changes.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageDraw


OUT_DIR = Path(__file__).resolve().parent.parent / 'appengine' / 'maze'

# Draw at 8x logical pixels, then downscale 2x → 4x assets.
DRAW = 8
OUT_SCALE = 4

FRAME_W = 49
FRAME_H = 52
TILE = 50
FRAMES = 21

# Centre/North/West/South/East → [col, row] on the tile sheet.
TILE_SHAPES = {
    '10010': (4, 0),
    '10001': (3, 3),
    '11000': (0, 1),
    '10100': (0, 2),
    '11010': (4, 1),
    '10101': (3, 2),
    '10110': (0, 0),
    '10011': (2, 0),
    '11001': (4, 2),
    '11100': (2, 3),
    '11110': (1, 1),
    '10111': (1, 0),
    '11011': (2, 1),
    '11101': (1, 2),
    '11111': (2, 2),
    'null0': (4, 3),
    'null1': (3, 0),
    'null2': (3, 1),
    'null3': (0, 3),
    'null4': (1, 3),
}


def P(*rgb, a=255):
    if len(rgb) == 1 and isinstance(rgb[0], tuple):
        rgb = rgb[0]
    return (int(rgb[0]), int(rgb[1]), int(rgb[2]), a)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)


def px(n):
    return int(round(n * DRAW))


def new_frame():
    return Image.new('RGBA', (FRAME_W * DRAW, FRAME_H * DRAW), (0, 0, 0, 0))


def new_tile():
    return Image.new('RGBA', (TILE * DRAW, TILE * DRAW), (0, 0, 0, 0))


def down(im, logical_w, logical_h):
    return im.resize((logical_w * OUT_SCALE, logical_h * OUT_SCALE),
                     Image.Resampling.LANCZOS)


def ellipse(draw, cx, cy, rx, ry, fill, outline=None, width=1):
    draw.ellipse([px(cx - rx), px(cy - ry), px(cx + rx), px(cy + ry)],
                 fill=fill, outline=outline, width=px(width) if outline else 0)


def circle(draw, cx, cy, r, fill, outline=None, width=1):
    ellipse(draw, cx, cy, r, r, fill, outline, width)


def rect(draw, x0, y0, x1, y1, fill):
    draw.rectangle([px(x0), px(y0), px(x1), px(y1)], fill=fill)


def rrect(draw, x0, y0, x1, y1, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(
        [px(x0), px(y0), px(x1), px(y1)],
        radius=px(radius),
        fill=fill,
        outline=outline,
        width=px(width) if outline else 0,
    )


def line(draw, x0, y0, x1, y1, fill, width):
    draw.line([px(x0), px(y0), px(x1), px(y1)], fill=fill, width=px(width))
    circle(draw, x0, y0, width / 2, fill)
    circle(draw, x1, y1, width / 2, fill)


# ---------------------------------------------------------------------------
# Tiles
# ---------------------------------------------------------------------------

PALETTES = {
    'pegman': {
        'grass': (72, 158, 86),
        'grass2': (56, 132, 70),
        'grass3': (92, 176, 98),
        'path': (255, 214, 72),
        'path_edge': (214, 160, 28),
        'path_inner': (255, 232, 130),
        'line': (255, 255, 255),
        'wall': (228, 214, 186),
        'wall2': (206, 188, 154),
        'wall_edge': (176, 154, 118),
        'tuft': (46, 118, 58),
    },
    'astro': {
        'grass': (38, 78, 92),
        'grass2': (28, 60, 74),
        'grass3': (52, 98, 108),
        'path': (226, 232, 240),
        'path_edge': (148, 164, 184),
        'path_inner': (248, 250, 252),
        'line': (120, 150, 176),
        'wall': (58, 72, 86),
        'wall2': (42, 54, 66),
        'wall_edge': (24, 36, 46),
        'tuft': (70, 120, 132),
        'joint': (168, 180, 196),
        'bolt': (92, 108, 124),
    },
    'panda': {
        'grass': (54, 122, 62),
        'grass2': (40, 98, 50),
        'grass3': (78, 148, 72),
        'path': (214, 186, 108),
        'path_edge': (150, 112, 52),
        'path_inner': (232, 210, 140),
        'line': (120, 86, 40),
        'wall': (62, 96, 48),
        'wall2': (44, 76, 38),
        'wall_edge': (30, 58, 28),
        'tuft': (34, 86, 40),
        'node': (196, 164, 84),
    },
}


def fill_ground(tile, pal, rng, kind):
    d = ImageDraw.Draw(tile)
    base = pal['wall'] if kind == 'wall' else pal['grass']
    shade = pal['wall2'] if kind == 'wall' else pal['grass2']
    lite = pal['wall_edge'] if kind == 'wall' else pal['grass3']
    d.rectangle([0, 0, tile.size[0], tile.size[1]], fill=P(base))
    # Sparse specks so PNG compresses; still enough texture at 4x.
    step = px(2.5)
    for y in range(0, tile.size[1], step):
        for x in range(0, tile.size[0], step):
            n = rng.random()
            if n < 0.12:
                d.point((x, y), fill=P(shade))
            elif n > 0.92:
                d.point((x, y), fill=P(lite))


def grass_tufts(draw, pal, rng, count=7):
    for _ in range(count):
        x = rng.uniform(4, TILE - 4)
        y = rng.uniform(4, TILE - 4)
        h = rng.uniform(2.2, 4.5)
        w = rng.uniform(0.7, 1.4)
        ellipse(draw, x, y, w, h * 0.35, P(pal['tuft']))
        line(draw, x, y, x - 0.6, y - h, P(pal['tuft']), 0.8)
        line(draw, x, y, x + 0.7, y - h * 0.85, P(pal['grass3']), 0.7)


def path_dirs(code):
    if code.startswith('null'):
        return set()
    # Maze encodes Centre, North, x+1 (East), South, x-1 (West).
    # The JS comments say West/East, but the coordinates are swapped.
    return {
        d for d, bit in zip('NESW', code[1:]) if bit == '1'
    }


def draw_path_layer(tile, dirs, pal, skin):
    """Paint a connected path (or pipe / bamboo) into the tile."""
    layer = Image.new('RGBA', tile.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = cy = TILE / 2
    half = 11.5  # path half-width in logical px

    def arm(direction, color, h):
        if direction == 'N':
            rrect(d, cx - h, 0, cx + h, cy + 1, 0, color)
        elif direction == 'S':
            rrect(d, cx - h, cy - 1, cx + h, TILE, 0, color)
        elif direction == 'W':
            rrect(d, 0, cy - h, cx + 1, cy + h, 0, color)
        elif direction == 'E':
            rrect(d, cx - 1, cy - h, TILE, cy + h, 0, color)

    # Edge, fill, inner highlight.
    for color, h in (
            (P(pal['path_edge']), half + 1.6),
            (P(pal['path']), half),
            (P(pal['path_inner']), half - 3.2)):
        circle(d, cx, cy, h, color)
        for direction in dirs:
            arm(direction, color, h)

    # Caps on dead ends so the path doesn't look chopped off.
    if len(dirs) == 1:
        only = next(iter(dirs))
        ox, oy = {'N': (0, 6), 'S': (0, -6), 'W': (6, 0), 'E': (-6, 0)}[only]
        circle(d, cx + ox, cy + oy, half, P(pal['path']))
        circle(d, cx + ox, cy + oy, half - 3.2, P(pal['path_inner']))

    if skin == 'astro':
        # Pipe joint + bolts.
        circle(d, cx, cy, half + 2.4, P(pal['joint']))
        circle(d, cx, cy, half - 1.5, P(pal['path_inner']))
        circle(d, cx, cy, 3.2, P(pal['bolt']))
        for ang in (45, 135, 225, 315):
            rad = math.radians(ang)
            circle(d, cx + math.cos(rad) * 7.5, cy + math.sin(rad) * 7.5,
                   1.15, P(pal['bolt']))
        for direction in dirs:
            end = {
                'N': (cx, 3.5), 'S': (cx, TILE - 3.5),
                'W': (3.5, cy), 'E': (TILE - 3.5, cy),
            }[direction]
            if len(dirs) == 1:
                circle(d, *end, half + 1.2, P(pal['joint']))
                circle(d, *end, half - 2, P(pal['path_inner']))
    elif skin == 'panda':
        # Bamboo nodes along each arm.
        for direction in list(dirs) + ['C']:
            spots = {
                'N': [(cx, 12), (cx, 24)],
                'S': [(cx, 38), (cx, 26)],
                'W': [(12, cy), (24, cy)],
                'E': [(38, cy), (26, cy)],
                'C': [(cx, cy)],
            }[direction]
            for x, y in spots:
                if direction in 'NS' or direction == 'C':
                    rrect(d, x - 12, y - 2.1, x + 12, y + 2.1, 1.2,
                          P(pal['node']))
                if direction in 'WE' or direction == 'C':
                    rrect(d, x - 2.1, y - 12, x + 2.1, y + 12, 1.2,
                          P(pal['node']))
        circle(d, cx, cy, 6.5, P(pal['node']))
        circle(d, cx, cy, 4.2, P(pal['path_inner']))
    else:
        # Dashed centre line.
        dash, gap = 5.5, 4.0

        def dashes(x0, y0, x1, y1):
            length = math.hypot(x1 - x0, y1 - y0)
            if length < 1:
                return
            dx, dy = (x1 - x0) / length, (y1 - y0) / length
            t = 1.5
            on = True
            while t < length - 1.5:
                n = dash if on else gap
                if on:
                    line(d, x0 + dx * t, y0 + dy * t,
                         x0 + dx * min(t + n, length - 1),
                         y0 + dy * min(t + n, length - 1),
                         P(pal['line']), 1.5)
                t += n
                on = not on

        if 'N' in dirs:
            dashes(cx, 0, cx, cy)
        if 'S' in dirs:
            dashes(cx, cy, cx, TILE)
        if 'W' in dirs:
            dashes(0, cy, cx, cy)
        if 'E' in dirs:
            dashes(cx, cy, TILE, cy)

    tile.alpha_composite(layer)


def draw_wall(tile, pal, rng, skin, variant):
    d = ImageDraw.Draw(tile)
    if skin == 'astro':
        rrect(d, 5, 5, 45, 45, 6, P(pal['wall']), P(pal['wall_edge']), 1.4)
        rrect(d, 8, 8, 42, 22, 3, P(pal['wall2']))
        for i in range(3):
            for j in range(2):
                circle(d, 14 + i * 11, 14 + j * 22, 1.3, P(pal['bolt']))
        if variant % 2:
            circle(d, 25, 33, 7, P(pal['grass3']))
    elif skin == 'panda':
        # Leafy hedge block.
        rrect(d, 4, 6, 46, 46, 10, P(pal['wall']))
        for _ in range(12):
            circle(d, rng.uniform(8, 42), rng.uniform(10, 40),
                   rng.uniform(4, 8),
                   P(pal['grass3'] if rng.random() > 0.5 else pal['grass']))
    else:
        # Garden stone.
        inset = 3.5 + (variant % 3)
        rrect(d, inset, inset + 1, TILE - inset, TILE - inset + 1,
              6, P(pal['wall_edge']))
        rrect(d, inset + 1.2, inset - 0.4, TILE - inset - 0.4,
              TILE - inset - 1, 6, P(pal['wall']))
        rrect(d, inset + 3, inset + 1.5, TILE - inset - 8, inset + 8,
              3, lerp(pal['wall'], (255, 255, 255), 0.25))
        if variant in (1, 4):
            ellipse(d, 18, 32, 8, 4, P(pal['tuft']))


def build_tiles(skin):
    pal = PALETTES[skin]
    sheet = Image.new('RGBA', (5 * TILE * DRAW, 4 * TILE * DRAW), (0, 0, 0, 0))
    for code, (col, row) in TILE_SHAPES.items():
        rng = random.Random(f'{skin}-{code}')
        tile = new_tile()
        dirs = path_dirs(code)
        if code.startswith('null'):
            if code == 'null0':
                fill_ground(tile, pal, rng, 'grass')
                grass_tufts(ImageDraw.Draw(tile), pal, rng, 9)
            else:
                fill_ground(tile, pal, rng, 'wall')
                draw_wall(tile, pal, rng, skin, int(code[-1]))
        else:
            fill_ground(tile, pal, rng, 'grass')
            grass_tufts(ImageDraw.Draw(tile), pal, rng, 4)
            draw_path_layer(tile, dirs, pal, skin)
        sheet.paste(tile, (col * TILE * DRAW, row * TILE * DRAW))
    return down(sheet, 5 * TILE, 4 * TILE)


# ---------------------------------------------------------------------------
# Characters
# ---------------------------------------------------------------------------

WALK = [
    # left_leg_x, right_leg_x, left_arm, right_arm, bounce
    (-6.5, 5.5, 7.0, -5.0, 0.0),
    (0.0, 0.0, 2.0, -2.0, 2.2),
    (6.5, -5.5, -5.0, 7.0, 0.0),
    (0.0, 0.0, -2.0, 2.0, 2.0),
]


def shadow(draw, cx, cy, scale=1.0):
    ellipse(draw, cx, cy, 11 * scale, 3.2 * scale, P(0, 0, 0, 64))


def pose_params(phase, pose):
    ll = rr = la = ra = bounce = 0
    if pose == 'walk':
        ll, rr, la, ra, bounce = WALK[phase]
    elif pose == 'dance_a':
        la, ra, bounce = -10, 8, 3.2
        ll, rr = -2.5, 2.5
    elif pose == 'dance_b':
        la, ra, bounce = 8, -10, 1.2
        ll, rr = 2.5, -2.5
    elif pose == 'idle':
        la, ra = 3.5, -3.5
    return ll, rr, la, ra, bounce


def draw_pegman(frame, direction, phase, pose='walk', gray=False):
    d = ImageDraw.Draw(frame)
    cx = FRAME_W / 2
    if pose == 'crash':
        gray = True
    ll, rr, la, ra, bounce = pose_params(phase, pose)

    if gray:
        head, body, dark, limb = (
            P(200, 202, 210), P(150, 152, 162),
            P(108, 110, 120), P(136, 138, 148))
        eye = P(70, 72, 80)
    else:
        head, body, dark, limb = (
            P(255, 200, 36), P(255, 132, 16),
            P(196, 84, 8), P(255, 148, 28))
        eye = P(48, 36, 24)

    shine = lerp(head, (255, 255, 255), 0.35)
    body_hi = lerp(body, (255, 220, 120), 0.28)
    base_y = 46.8 - bounce
    shadow(d, cx, 48.4)

    if pose == 'crash':
        sign = -1 if phase == 0 else 1
        line(d, cx - sign * 6, 41, cx - sign * 16, 45, limb, 3.4)
        ellipse(d, cx + sign * 1, 41, 12, 7, dark)
        ellipse(d, cx + sign * 1, 40, 11.2, 6.2, body)
        circle(d, cx + sign * 13, 33, 8.6, dark)
        circle(d, cx + sign * 13, 32.2, 8.0, head)
        circle(d, cx + sign * 15.4, 31.4, 1.6, eye)
        circle(d, cx + sign * 15.8, 31.0, 0.5, P(255, 255, 255))
        return

    hip_y = base_y - 11
    if direction == 'E':
        line(d, cx - 1.5, hip_y, cx - 4 + ll * 0.35, base_y, dark, 3.8)
        line(d, cx + 1.5, hip_y, cx + 5 + rr * 0.45, base_y, limb, 4.0)
    elif direction == 'W':
        line(d, cx + 1.5, hip_y, cx + 4 + rr * 0.35, base_y, dark, 3.8)
        line(d, cx - 1.5, hip_y, cx - 5 + ll * 0.45, base_y, limb, 4.0)
    else:
        line(d, cx - 3.6, hip_y, cx - 3.6 + ll, base_y, dark, 3.8)
        line(d, cx + 3.6, hip_y, cx + 3.6 + rr, base_y, limb, 3.8)

    top = 18.2 - bounce
    bw = 6.2 if direction in ('E', 'W') else 7.6
    rrect(d, cx - bw, top, cx + bw, base_y - 10.5, 6.2, dark)
    rrect(d, cx - bw + 0.7, top + 0.5, cx + bw - 0.5, base_y - 11.2, 5.6, body)
    rrect(d, cx - bw + 1.6, top + 1.4, cx + bw - 2.4, top + 8, 3.5, body_hi)

    shoulder = top + 5.5
    if pose in ('dance_a', 'dance_b'):
        line(d, cx - 6, shoulder, cx - 12, shoulder - 8, limb, 3.3)
        line(d, cx + 6, shoulder, cx + 12, shoulder - 8, limb, 3.3)
    elif direction == 'N':
        line(d, cx - 6, shoulder, cx - 9 + la * 0.2, shoulder + 10, limb, 3.2)
        line(d, cx + 6, shoulder, cx + 9 + ra * 0.2, shoulder + 10, limb, 3.2)
    elif direction == 'S':
        line(d, cx - 7, shoulder, cx - 10 + la * 0.2, shoulder + 11, limb, 3.3)
        line(d, cx + 7, shoulder, cx + 10 + ra * 0.2, shoulder + 11, limb, 3.3)
    elif direction == 'E':
        line(d, cx + 2, shoulder, cx + 12, shoulder + 8, limb, 3.4)
    else:
        line(d, cx - 2, shoulder, cx - 12, shoulder + 8, limb, 3.4)

    hy = 13.0 - bounce
    circle(d, cx, hy, 8.7, dark)
    circle(d, cx, hy - 0.3, 8.1, head)
    circle(d, cx - 2.4, hy - 2.8, 2.6, shine)

    show_face = direction == 'S' or pose in ('dance_a', 'dance_b', 'idle')
    if show_face:
        circle(d, cx - 2.7, hy - 0.2, 1.55, eye)
        circle(d, cx + 2.7, hy - 0.2, 1.55, eye)
        circle(d, cx - 2.2, hy - 0.7, 0.55, P(255, 255, 255))
        circle(d, cx + 3.2, hy - 0.7, 0.55, P(255, 255, 255))
        d.arc([px(cx - 3.3), px(hy + 0.8), px(cx + 3.3), px(hy + 5.4)],
              25, 160, fill=P(140, 70, 16), width=px(1.2))
    elif direction == 'E':
        circle(d, cx + 3.3, hy, 1.55, eye)
        circle(d, cx + 3.8, hy - 0.5, 0.5, P(255, 255, 255))
    elif direction == 'W':
        circle(d, cx - 3.3, hy, 1.55, eye)
        circle(d, cx - 2.8, hy - 0.5, 0.5, P(255, 255, 255))
    else:
        ellipse(d, cx, hy + 1.8, 5, 2.8, lerp(head, dark, 0.25))


def draw_astro(frame, direction, phase, pose='walk', gray=False):
    d = ImageDraw.Draw(frame)
    cx = FRAME_W / 2
    if pose == 'crash':
        gray = True
    ll, rr, la, ra, bounce = pose_params(phase, pose)

    suit = P(186, 190, 198) if gray else P(244, 247, 252)
    suit_d = P(118, 124, 136) if gray else P(168, 178, 192)
    visor = P(86, 92, 102) if gray else P(20, 168, 214)
    visor_hi = P(160, 170, 180) if gray else P(140, 230, 255)
    stripe = P(132, 134, 142) if gray else P(255, 88, 42)

    base_y = 47 - bounce
    shadow(d, cx, 48.5)

    if pose == 'crash':
        sign = -1 if phase == 0 else 1
        rrect(d, cx - 11, 35, cx + 11, 45, 6, suit_d)
        rrect(d, cx - 10.2, 34.2, cx + 10.2, 43.5, 5.5, suit)
        rrect(d, cx - 8, 38, cx + 8, 41, 0, stripe)
        circle(d, cx + sign * 13, 32.5, 8.8, suit_d)
        circle(d, cx + sign * 13, 31.8, 8.1, suit)
        ellipse(d, cx + sign * 14.2, 32, 5.2, 5, visor)
        return

    hip_y = base_y - 10.5
    line(d, cx - 3.2, hip_y, cx - 3.2 + ll, base_y, suit_d, 4.0)
    line(d, cx + 3.2, hip_y, cx + 3.2 + rr, base_y, suit, 4.0)

    top = 18.8 - bounce
    rrect(d, cx - 8.2, top, cx + 8.2, base_y - 10, 5.2, suit_d)
    rrect(d, cx - 7.5, top + 0.6, cx + 7.5, base_y - 10.8, 4.8, suit)
    rrect(d, cx - 7.5, 26.5 - bounce, cx + 7.5, 30.2 - bounce, 0, stripe)
    if direction == 'N':
        rrect(d, cx - 12, top + 1.5, cx - 6.2, base_y - 13, 3, suit_d)
        rrect(d, cx + 6.2, top + 1.5, cx + 12, base_y - 13, 3, suit_d)

    shoulder = top + 5
    if pose in ('dance_a', 'dance_b'):
        line(d, cx - 6, shoulder, cx - 12, shoulder - 7, suit, 3.4)
        line(d, cx + 6, shoulder, cx + 12, shoulder - 7, suit, 3.4)
    elif direction == 'E':
        line(d, cx + 5, shoulder, cx + 12, shoulder + 8, suit, 3.5)
    elif direction == 'W':
        line(d, cx - 5, shoulder, cx - 12, shoulder + 8, suit, 3.5)
    else:
        line(d, cx - 7.5, shoulder, cx - 11, shoulder + 9, suit, 3.4)
        line(d, cx + 7.5, shoulder, cx + 11, shoulder + 9, suit, 3.4)

    hy = 13.2 - bounce
    circle(d, cx, hy, 9.0, suit_d)
    circle(d, cx, hy - 0.2, 8.3, suit)
    if direction == 'N':
        ellipse(d, cx, hy + 1.2, 5.2, 3.4, suit_d)
    elif direction == 'E':
        ellipse(d, cx + 2.6, hy + 0.4, 4.6, 5.1, visor)
        ellipse(d, cx + 2.2, hy - 1.2, 1.8, 1.4, visor_hi)
    elif direction == 'W':
        ellipse(d, cx - 2.6, hy + 0.4, 4.6, 5.1, visor)
        ellipse(d, cx - 3.0, hy - 1.2, 1.8, 1.4, visor_hi)
    else:
        ellipse(d, cx, hy + 0.6, 6.3, 5.3, visor)
        ellipse(d, cx - 1.8, hy - 1.4, 2.5, 1.7, visor_hi)


def draw_panda(frame, direction, phase, pose='walk', gray=False):
    d = ImageDraw.Draw(frame)
    cx = FRAME_W / 2
    if pose == 'crash':
        gray = True
    ll, rr, la, ra, bounce = pose_params(phase, pose)

    white = P(208, 210, 216) if gray else P(252, 252, 254)
    black = P(64, 72, 80) if gray else P(24, 26, 32)
    patch = P(80, 84, 92) if gray else P(22, 24, 28)
    nose = P(48, 50, 56) if gray else P(32, 32, 36)

    base_y = 47.2 - bounce
    shadow(d, cx, 48.6, 1.08)

    if pose == 'crash':
        sign = -1 if phase == 0 else 1
        ellipse(d, cx, 41, 12.5, 7.5, black)
        ellipse(d, cx, 40.2, 11.5, 6.6, white)
        circle(d, cx + sign * 12, 33, 8.8, black)
        circle(d, cx + sign * 12, 32.3, 8.0, white)
        circle(d, cx + sign * 16, 26.5, 3.4, black)
        ellipse(d, cx + sign * 14.2, 31.5, 3.0, 3.4, patch)
        circle(d, cx + sign * 14.4, 31.5, 1.1, white)
        circle(d, cx + sign * 14.4, 31.5, 0.6, black)
        return

    hip_y = base_y - 10
    line(d, cx - 4.2, hip_y, cx - 4.2 + ll, base_y, black, 4.4)
    line(d, cx + 4.2, hip_y, cx + 4.2 + rr, base_y, black, 4.4)

    top = 20.2 - bounce
    ellipse(d, cx, (top + base_y - 10) / 2 + 0.4, 10, 9.2, black)
    ellipse(d, cx, (top + base_y - 10) / 2, 9.2, 8.4, white)
    rrect(d, cx - 5.5, 28.2 - bounce, cx + 5.5, 32.2 - bounce, 2, black)

    shoulder = top + 4
    if pose in ('dance_a', 'dance_b'):
        line(d, cx - 7, shoulder, cx - 12, shoulder - 7, black, 3.8)
        line(d, cx + 7, shoulder, cx + 12, shoulder - 7, black, 3.8)
    elif direction == 'E':
        line(d, cx + 6, shoulder, cx + 12, shoulder + 7, black, 3.9)
    elif direction == 'W':
        line(d, cx - 6, shoulder, cx - 12, shoulder + 7, black, 3.9)
    else:
        line(d, cx - 8.2, shoulder, cx - 11, shoulder + 8, black, 3.7)
        line(d, cx + 8.2, shoulder, cx + 11, shoulder + 8, black, 3.7)

    hy = 14.0 - bounce
    circle(d, cx - 7.4, hy - 6.4, 3.7, black)
    circle(d, cx + 7.4, hy - 6.4, 3.7, black)
    circle(d, cx - 7.4, hy - 6.4, 1.5, white)
    circle(d, cx + 7.4, hy - 6.4, 1.5, white)
    circle(d, cx, hy, 8.8, black)
    circle(d, cx, hy - 0.2, 8.1, white)

    if direction == 'N':
        ellipse(d, cx, hy + 2.2, 4.2, 2.4, lerp(white, black, 0.12))
    else:
        ox = {'E': 2.3, 'W': -2.3}.get(direction, 0)
        ellipse(d, cx - 3.4 + ox, hy - 0.1, 3.2, 3.7, patch)
        ellipse(d, cx + 3.4 + ox, hy - 0.1, 3.2, 3.7, patch)
        circle(d, cx - 3.2 + ox, hy - 0.1, 1.3, white)
        circle(d, cx + 3.6 + ox, hy - 0.1, 1.3, white)
        circle(d, cx - 3.2 + ox, hy, 0.75, black)
        circle(d, cx + 3.6 + ox, hy, 0.75, black)
        ellipse(d, cx + ox * 0.3, hy + 3.5, 2.0, 1.4, nose)


DRAWERS = {
    'pegman': draw_pegman,
    'astro': draw_astro,
    'panda': draw_panda,
}


def build_character(skin):
    drawer = DRAWERS[skin]
    sheet = Image.new('RGBA', (FRAMES * FRAME_W * DRAW, FRAME_H * DRAW),
                     (0, 0, 0, 0))
    # 0-15 walking: N E S W × 4
    dirs = ['N', 'E', 'S', 'W']
    for i in range(16):
        frame = new_frame()
        drawer(frame, dirs[i // 4], i % 4, 'walk')
        sheet.paste(frame, (i * FRAME_W * DRAW, 0))
    # 16 dance A, 17 crash L, 18 dance B, 19 crash R, 20 idle south
    extras = [
        ('S', 0, 'dance_a'),
        ('S', 0, 'crash'),
        ('S', 0, 'dance_b'),
        ('S', 1, 'crash'),
        ('S', 0, 'idle'),
    ]
    for n, (direction, phase, pose) in enumerate(extras):
        frame = new_frame()
        drawer(frame, direction, phase, pose)
        sheet.paste(frame, ((16 + n) * FRAME_W * DRAW, 0))
    return down(sheet, FRAMES * FRAME_W, FRAME_H)


# ---------------------------------------------------------------------------
# Finish marker
# ---------------------------------------------------------------------------

def build_marker():
    w, h = 20, 34
    im = Image.new('RGBA', (w * DRAW, h * DRAW), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Pole.
    rrect(d, 3.2, 2, 5.4, 32.5, 1, P(90, 96, 108))
    rrect(d, 3.5, 2, 5.0, 32.5, 1, P(140, 148, 168))
    circle(d, 4.3, 2.2, 1.7, P(255, 208, 64))
    circle(d, 3.8, 1.7, 0.7, P(255, 255, 255, a=120))
    # Flag.
    flag = [
        (px(5.4), px(3.2)),
        (px(18.4), px(8.0)),
        (px(5.4), px(13.2)),
    ]
    d.polygon(flag, fill=P(232, 56, 64))
    # Lighter inner fold.
    d.polygon([
        (px(5.4), px(4.4)),
        (px(15.6), px(8.0)),
        (px(5.4), px(12.0)),
    ], fill=P(255, 92, 86))
    # Star.
    star_c = (11.2, 8.0)
    pts = []
    for i in range(10):
        ang = math.radians(-90 + i * 36)
        r = 2.15 if i % 2 == 0 else 0.9
        pts.append((px(star_c[0] + math.cos(ang) * r),
                   px(star_c[1] + math.sin(ang) * r)))
    d.polygon(pts, fill=P(255, 228, 96))
    # Base.
    ellipse(d, 4.3, 32.4, 5.5, 1.8, P(0, 0, 0, a=50))
    return down(im, w, h)


def save(im, name):
    path = OUT_DIR / name
    im.save(path, 'PNG', optimize=True)
    print(f'  wrote {path.name} {im.size[0]}x{im.size[1]}')


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print('Generating maze art…')
    for skin in ('pegman', 'astro', 'panda'):
        save(build_character(skin), f'{skin}.png')
        save(build_tiles(skin), f'tiles_{skin}.png')
    save(build_marker(), 'marker.png')
    print('Done.')


if __name__ == '__main__':
    main()
