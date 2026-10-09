import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../stylesheets/campusmap.css";

// Hand-placed campus map. Coordinates are SVG units on a 1084 x 711 canvas.
//
//   cx, cy     centre of the box
//   w, h       size of the box
//   rot        rotation in degrees around the centre (0 = straight).
//              The label is centred inside the box and rotated by the same amount.
//   text       the label
//   name       full name, used for the hover tooltip and screen readers
//   path       where clicking goes: /building/:id opens the CurrentBuilding page
const CONTENT_W = 1084;
const CONTENT_H = 711;
const PAD = 40; // empty space around the map when fully zoomed out
const MAP_W = CONTENT_W + PAD * 2;
const MAP_H = CONTENT_H + PAD * 2;
const PHONE_START_ZOOM = 2; // starting zoom on portrait phones (1 = whole map fits the width)
const PHONE_MIN_ZOOM = 1.5; // how far portrait phones can zoom out (must be <= PHONE_START_ZOOM)

const isPhone = (width, height) => width < 768 && height > width;

// The starting / reset view. Phones in portrait start zoomed in, centred on the map.
function homeView(width, height) {
    if (!isPhone(width, height)) return { x: PAD, y: PAD, k: 1 };
    const k = PHONE_START_ZOOM;
    // Put the middle of the map (CONTENT_W / 2, CONTENT_H / 2) at the middle of the screen (MAP_W / 2, MAP_H / 2).
    return { k, x: MAP_W / 2 - (k * CONTENT_W) / 2, y: MAP_H / 2 - (k * CONTENT_H) / 2 };
}

const BUILDINGS = [
    { id: "lb",     text: "LB",     name: "Fr. Lawrence Bunzel Building",   cx: 102, cy: 110, w: 75,  h: 99,  rot: 0 },
    { id: "af",     text: "AF",     name: "Safad Building",                 cx: 438, cy: 94,  w: 202, h: 69,  rot: 0 },
    { id: "mr",     text: "MR",     name: "Michael Richartz Center",        cx: 663, cy: 130, w: 99,  h: 99,  rot: 20 },
    { id: "church", text: "Church", name: "St. Arnold Janssen and St. Joseph Freinademetz Church", cx: 348, cy: 268, w: 98, h: 98, rot: -25 },
    { id: "jb",     text: "JB",     name: "Joseph Baumgartner Learning Resource Center", cx: 891, cy: 293, w: 96, h: 151, rot: -15 },
    { id: "es",     text: "ES",     name: "Enrique Shoenig",                cx: 250, cy: 482, w: 85,  h: 46,  rot: 0 },
    { id: "fo",     text: "FO",     name: "Franz Oster",                    cx: 342, cy: 482, w: 85,  h: 46,  rot: 0 },
    { id: "eo",     text: "EO",     name: "Edgar Oehler",                   cx: 433, cy: 482, w: 85,  h: 46,  rot: 0 },
    { id: "sm",     text: "SM",     name: "SMED Building",                  cx: 525, cy: 482, w: 85,  h: 46,  rot: 0 },
    { id: "pe",     text: "PE",     name: "Philip Van Engelen Building",    cx: 668, cy: 550, w: 70,  h: 153, rot: 0 },
    { id: "rh",     text: "RH",     name: "Robert Hoeppener Building",      cx: 856, cy: 634, w: 148, h: 68,  rot: -10 },
].map((b) => ({ ...b, path: `/building/${b.id}` }));

// The roads. Each one is a list of points joined by straight lines.
const ROADS = [
    [[38, 52], [141, 52], [286, 167], [260, 208], [38, 204], [38, 52]],
    [[160, 67], [160, 204]],
    [[286, 167], [545, 167], [744, 296]],
    [[422, 167], [485, 300], [628, 339], [573, 625]],
    [[160, 204], [160, 578], [532, 578], [573, 625], [620, 686], [716, 677], [754, 581], [744, 296]],
    [[744, 296], [850, 166], [953, 164], [1008, 416]],
    [[666, 246], [743, 170], [850, 166]],
    [[754, 581], [935, 551], [1004, 613]],
];

// Drawn in this order so junctions merge cleanly: edge, then asphalt.
const ROAD_LAYERS = ["campus-road-edge", "campus-road-surface"];

// Zoom limits (1 = the whole map fits the screen)
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 4;
const BUTTON_STEP = 1.4;

// Labels never drop below this size on screen, so they stay readable on small phones.
const LABEL_MIN_PX = 12;
const LABEL_MIN_UNITS = 20; // the normal label size, in map units

// How far a finger must move before a tap turns into a drag.
const DRAG_THRESHOLD = { touch: 10, pen: 8, mouse: 5 };
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Smallest zoom allowed on this screen. `rect` is the svg's bounding box.
const minZoomFor = (rect) => (isPhone(rect.width, rect.height) ? PHONE_MIN_ZOOM : MIN_ZOOM);

// Panning limit: at least this fraction of the map (width and height) must stay on screen.
const KEEP_VISIBLE = 0.6;

// Keeps the map from being dragged off screen. `rect` is the svg's bounding box.
function clampView(v, rect) {
    const s = Math.min(rect.width / MAP_W, rect.height / MAP_H);
    // The part of the map coordinate space that is actually on screen
    const left = -(rect.width - MAP_W * s) / 2 / s;
    const top = -(rect.height - MAP_H * s) / 2 / s;
    const right = left + rect.width / s;
    const bottom = top + rect.height / s;

    // A quarter of the map's current size, but never more than the screen can show
    const keepX = Math.min(KEEP_VISIBLE * CONTENT_W * v.k, right - left);
    const keepY = Math.min(KEEP_VISIBLE * CONTENT_H * v.k, bottom - top);

    return {
        k: v.k,
        x: clamp(v.x, left + keepX - (PAD + CONTENT_W) * v.k, right - keepX - PAD * v.k),
        y: clamp(v.y, top + keepY - (PAD + CONTENT_H) * v.k, bottom - keepY - PAD * v.k),
    };
}

// Biggest label size (map units) that still fits inside a box: caps `size` by the box's width and height.
// Bold caps are roughly 0.7em wide per character and 0.9em tall including breathing room.
function fitLabel(size, text, w, h) {
    const byWidth = (w - 12) / (text.length * 0.7);
    const byHeight = (h - 10) / 0.9;
    return Math.max(6, Math.min(size, byWidth, byHeight));
}

function Box({ className, cx, cy, w, h, rot = 0 }) {
    return (
        <rect
            className={className}
            x={cx - w / 2}
            y={cy - h / 2}
            width={w}
            height={h}
            rx={3}
            transform={`rotate(${rot} ${cx} ${cy})`}
        />
    );
}

function CampusMap({ buildings = BUILDINGS }) {
    const svgRef = useRef(null);
    const [view, setView] = useState(() =>
        typeof window === "undefined" ? { x: PAD, y: PAD, k: 1 } : homeView(window.innerWidth, window.innerHeight)
    ); // pan (x, y) and zoom (k)
    const [fit, setFit] = useState(1); // screen pixels per map unit when k = 1

    // Keep `fit` up to date when the screen resizes or rotates.
    useEffect(() => {
        const el = svgRef.current;
        const update = () => {
            const r = el.getBoundingClientRect();
            setFit(Math.min(r.width / MAP_W, r.height / MAP_H) || 1);
        };
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Label size in map units: normal on desktop, larger on small screens.
    const labelSize = Math.max(LABEL_MIN_UNITS, LABEL_MIN_PX / (fit * view.k));

    const pointers = useRef(new Map()); // active fingers / mouse: id -> {x, y} in screen px
    const gesture = useRef({ startX: 0, startY: 0, dragging: false });
    const suppressClick = useRef(false);

    // Screen pixels -> map units. The map is centred and fitted inside the screen.
    const toMap = useCallback((clientX, clientY) => {
        const r = svgRef.current.getBoundingClientRect();
        const s = Math.min(r.width / MAP_W, r.height / MAP_H);
        return {
            x: (clientX - r.left - (r.width - MAP_W * s) / 2) / s,
            y: (clientY - r.top - (r.height - MAP_H * s) / 2) / s,
        };
    }, []);

    // Zoom by factor `f`, keeping the map point under (px, py) where it is.
    const zoomAt = useCallback((f, px, py) => {
        const rect = svgRef.current.getBoundingClientRect();
        setView((v) => {
            const k = clamp(v.k * f, minZoomFor(rect), MAX_ZOOM);
            const r = k / v.k;
            return clampView({ k, x: px - (px - v.x) * r, y: py - (py - v.y) * r }, rect);
        });
    }, []);

    // Mouse wheel / trackpad pinch. Needs a non-passive listener to stop the page scrolling.
    useEffect(() => {
        const el = svgRef.current;
        const onWheel = (e) => {
            e.preventDefault();
            const lines = e.deltaMode === 1 ? 16 : 1;
            const speed = e.ctrlKey ? 0.01 : 0.0015; // ctrl = trackpad pinch
            const { x, y } = toMap(e.clientX, e.clientY);
            zoomAt(Math.exp(-e.deltaY * lines * speed), x, y);
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [toMap, zoomAt]);

    // Move the content under `from` to `to`, scaled by f. One finger = pan, two = pan + pinch.
    const applyGesture = (from, to, f) => {
        const a = toMap(from.x, from.y);
        const b = toMap(to.x, to.y);
        const rect = svgRef.current.getBoundingClientRect();
        setView((v) => {
            const k = clamp(v.k * f, minZoomFor(rect), MAX_ZOOM);
            const r = k / v.k;
            return clampView({ k, x: b.x - (a.x - v.x) * r, y: b.y - (a.y - v.y) * r }, rect);
        });
    };

    const onPointerDown = (e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        gesture.current = {
            startX: e.clientX,
            startY: e.clientY,
            dragging: pointers.current.size > 1,
        };
    };

    const onPointerMove = (e) => {
        const prev = pointers.current.get(e.pointerId);
        if (!prev) return;
        const next = { x: e.clientX, y: e.clientY };
        const g = gesture.current;

        if (pointers.current.size === 1) {
            // Only treat it as a drag after a few pixels, so plain clicks still reach the links.
            if (!g.dragging) {
                if (Math.hypot(next.x - g.startX, next.y - g.startY) < (DRAG_THRESHOLD[e.pointerType] ?? 5)) return;
                g.dragging = true;
                e.currentTarget.setPointerCapture(e.pointerId);
            }
            applyGesture(prev, next, 1);
        } else if (pointers.current.size === 2) {
            const before = [...pointers.current.values()];
            const after = [...pointers.current.entries()].map(([id, p]) => (id === e.pointerId ? next : p));
            const dist = (p) => Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
            const mid = (p) => ({ x: (p[0].x + p[1].x) / 2, y: (p[0].y + p[1].y) / 2 });
            const f = dist(before) > 0 ? dist(after) / dist(before) : 1;
            applyGesture(mid(before), mid(after), f);
            g.dragging = true;
        }
        pointers.current.set(e.pointerId, next);
    };

    const onPointerEnd = (e) => {
        if (!pointers.current.has(e.pointerId)) return;
        pointers.current.delete(e.pointerId);
        if (gesture.current.dragging) {
            // The browser fires a click right after a drag ends; ignore that one.
            suppressClick.current = true;
            setTimeout(() => { suppressClick.current = false; }, 0);
        }
        if (pointers.current.size === 0) gesture.current.dragging = false;
    };

    const onClickCapture = (e) => {
        if (suppressClick.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const resetView = () => {
        const r = svgRef.current.getBoundingClientRect();
        setView(homeView(r.width, r.height));
    };

    const zoomFromCentre = (f) => {
        const r = svgRef.current.getBoundingClientRect();
        const { x, y } = toMap(r.left + r.width / 2, r.top + r.height / 2);
        zoomAt(f, x, y);
    };

    return (
        <nav className="campus-map" aria-label="Campus map">
            <svg
                ref={svgRef}
                viewBox={`0 0 ${MAP_W} ${MAP_H}`}
                role="group"
                aria-label="Campus map. Scroll or pinch to zoom, drag to move."
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onClickCapture={onClickCapture}
            >
                <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
                    {/* Roads: edge first, then asphalt, so junctions merge cleanly */}
                    {ROAD_LAYERS.map((cls) => (
                        <g key={cls}>
                            {ROADS.map((points, i) => (
                                <polyline key={i} className={cls} points={points.map((p) => p.join(",")).join(" ")} />
                            ))}
                        </g>
                    ))}

                    {buildings.map((b) => (
                        <Link key={b.id} className="campus-block" to={b.path} aria-label={b.name}>
                            <title>{b.name}</title>
                            <Box className="campus-shape" {...b} />
                            <text
                                className="campus-text"
                                style={{ fontSize: fitLabel(labelSize, b.text, b.w, b.h) }}
                                x={b.cx}
                                y={b.cy}
                                dy="0.35em"
                                textAnchor="middle"
                                transform={b.rot ? `rotate(${b.rot} ${b.cx} ${b.cy})` : undefined}
                            >
                                {b.text}
                            </text>
                        </Link>
                    ))}
                </g>
            </svg>

            <div className="campus-controls">
                <button type="button" aria-label="Zoom in" onClick={() => zoomFromCentre(BUTTON_STEP)}>+</button>
                <button type="button" aria-label="Zoom out" onClick={() => zoomFromCentre(1 / BUTTON_STEP)}>&minus;</button>
                <button type="button" aria-label="Reset view" onClick={resetView}>Reset</button>
            </div>
        </nav>
    );
}

export default CampusMap;