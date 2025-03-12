// Color gamut for Philips Hue lights
const gamutTriangle = {
    r: { x: 0.675, y: 0.322 },
    g: { x: 0.409, y: 0.518 },
    b: { x: 0.167, y: 0.04 }
};

// Center point of the gamut triangle (used for out-of-gamut correction)
const centerPoint = {
    x: (gamutTriangle.r.x + gamutTriangle.g.x + gamutTriangle.b.x) / 3,
    y: (gamutTriangle.r.y + gamutTriangle.g.y + gamutTriangle.b.y) / 3
};

// Consistent conversion matrices
const MATRIX = {
    XYZtoRGB: [
        [3.2404542, -1.5371385, -0.4985314],
        [-0.9692660, 1.8760108, 0.0415560],
        [0.0556434, -0.2040259, 1.0572252]
    ],
    RGBtoXYZ: [
        [0.4124564, 0.3575761, 0.1804375],
        [0.2126729, 0.7151522, 0.0721750],
        [0.0193339, 0.1191920, 0.9503041]
    ]
};

function crossProduct(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    return p1.x * p2.y - p1.y * p2.x;
}

function getClosestPointToLine(point: { x: number; y: number }, lineStart: { x: number; y: number }, lineEnd: { x: number; y: number }): [number, number] {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
    const clampedT = Math.max(0, Math.min(1, t));

    return [
        lineStart.x + clampedT * dx,
        lineStart.y + clampedT * dy
    ];
}

function isPointInGamutTriangle(x: number, y: number): boolean {
    const point = { x, y };
    const v1 = { x: gamutTriangle.g.x - gamutTriangle.r.x, y: gamutTriangle.g.y - gamutTriangle.r.y };
    const v2 = { x: gamutTriangle.b.x - gamutTriangle.r.x, y: gamutTriangle.b.y - gamutTriangle.r.y };
    const q = { x: point.x - gamutTriangle.r.x, y: point.y - gamutTriangle.r.y };

    const s = crossProduct(q, v2) / crossProduct(v1, v2);
    const t = crossProduct(v1, q) / crossProduct(v1, v2);

    return s >= 0.0 && t >= 0.0 && s + t <= 1.0;
}

function closestPointOnGamut(x: number, y: number): [number, number] {
    if (isPointInGamutTriangle(x, y)) {
        return [x, y];
    }

    // If point is outside gamut, find the closest point on the gamut triangle
    const lines = [
        [gamutTriangle.r, gamutTriangle.g],
        [gamutTriangle.g, gamutTriangle.b],
        [gamutTriangle.b, gamutTriangle.r]
    ];

    let closestPoint: [number, number] = [x, y];
    let minDistance = Infinity;

    // Find the closest point on each edge of the triangle
    lines.forEach(([start, end]) => {
        const [px, py] = getClosestPointToLine({ x, y }, start, end);
        const distance = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));

        if (distance < minDistance) {
            minDistance = distance;
            closestPoint = [px, py];
        }
    });

    // If the point is very far from the gamut, move it towards the center point
    const distanceToCenter = Math.sqrt(
        Math.pow(x - centerPoint.x, 2) + Math.pow(y - centerPoint.y, 2)
    );

    if (distanceToCenter > 0.5) { // If point is far from center
        const t = 0.5 / distanceToCenter;
        return [
            x * t + centerPoint.x * (1 - t),
            y * t + centerPoint.y * (1 - t)
        ];
    }

    return closestPoint;
}

function xyToRgb(x: number, y: number, brightness = 1.0): { r: number; g: number; b: number } {
    // Calculate XYZ values
    const Y = brightness;
    const X = (Y / y) * x;
    const Z = (Y / y) * (1 - x - y);

    // Convert to RGB using Wide RGB D65 conversion
    let r = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
    let g = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
    let b = X * 0.051713 - Y * 0.121364 + Z * 1.011530;

    // Apply reverse gamma correction
    r = r <= 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, (1.0 / 2.4)) - 0.055;
    g = g <= 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, (1.0 / 2.4)) - 0.055;
    b = b <= 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, (1.0 / 2.4)) - 0.055;

    // Convert to 0-255 range
    return {
        r: Math.max(0, Math.min(255, Math.round(r * 255))),
        g: Math.max(0, Math.min(255, Math.round(g * 255))),
        b: Math.max(0, Math.min(255, Math.round(b * 255)))
    };
}

function rgbToXy(r: number, g: number, b: number): { x: number; y: number } {
    // Convert RGB to normalized values
    r = r / 255;
    g = g / 255;
    b = b / 255;

    // Apply gamma correction
    r = r > 0.04045 ? Math.pow((r + 0.055) / (1.0 + 0.055), 2.4) : (r / 12.92);
    g = g > 0.04045 ? Math.pow((g + 0.055) / (1.0 + 0.055), 2.4) : (g / 12.92);
    b = b > 0.04045 ? Math.pow((b + 0.055) / (1.0 + 0.055), 2.4) : (b / 12.92);

    // Convert to XYZ using Wide RGB D65 conversion
    const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
    const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
    const Z = r * 0.000088 + g * 0.072310 + b * 0.986039;

    // Calculate xy values
    const sum = X + Y + Z;
    if (sum === 0) {
        return { x: 0, y: 0 };
    }

    const x = X / sum;
    const y = Y / sum;

    return { x, y };
}

function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
        const hex = Math.max(0, Math.min(255, Math.round(n))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function xyColorToHex(x: number, y: number, brightness: number = 1): string {
    // Handle edge case of black (0, 0)
    if (x === 0 && y === 0) {
        return '#000000';
    }

    // Handle invalid y values to prevent division by zero
    if (y === 0) {
        y = 0.00001;
    }

    // Apply gamut correction
    [x, y] = closestPointOnGamut(x, y);

    // Convert xy to XYZ
    const z = 1.0 - x - y;
    const Y = brightness;
    const X = (Y / y) * x;
    const Z = (Y / y) * z;

    // Convert XYZ to RGB using consistent matrix
    let r = X * MATRIX.XYZtoRGB[0][0] + Y * MATRIX.XYZtoRGB[0][1] + Z * MATRIX.XYZtoRGB[0][2];
    let g = X * MATRIX.XYZtoRGB[1][0] + Y * MATRIX.XYZtoRGB[1][1] + Z * MATRIX.XYZtoRGB[1][2];
    let b = X * MATRIX.XYZtoRGB[2][0] + Y * MATRIX.XYZtoRGB[2][1] + Z * MATRIX.XYZtoRGB[2][2];

    // Apply gamma correction
    r = r <= 0.0031308 ? 12.92 * r : (1.0 + 0.055) * Math.pow(r, (1.0 / 2.4)) - 0.055;
    g = g <= 0.0031308 ? 12.92 * g : (1.0 + 0.055) * Math.pow(g, (1.0 / 2.4)) - 0.055;
    b = b <= 0.0031308 ? 12.92 * b : (1.0 + 0.055) * Math.pow(b, (1.0 / 2.4)) - 0.055;

    // Convert to hex
    const red = Math.max(0, Math.min(255, Math.round(r * 255)));
    const green = Math.max(0, Math.min(255, Math.round(g * 255)));
    const blue = Math.max(0, Math.min(255, Math.round(b * 255)));

    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

export function hexColorToXy(hex: string): [number, number] {
    // Convert hex to RGB
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    // Convert RGB to linear space
    const rr = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
    const gg = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
    const bb = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

    // Convert to XYZ using consistent matrix
    const X = rr * MATRIX.RGBtoXYZ[0][0] + gg * MATRIX.RGBtoXYZ[0][1] + bb * MATRIX.RGBtoXYZ[0][2];
    const Y = rr * MATRIX.RGBtoXYZ[1][0] + gg * MATRIX.RGBtoXYZ[1][1] + bb * MATRIX.RGBtoXYZ[1][2];
    const Z = rr * MATRIX.RGBtoXYZ[2][0] + gg * MATRIX.RGBtoXYZ[2][1] + bb * MATRIX.RGBtoXYZ[2][2];

    // Convert XYZ to xy
    const sum = X + Y + Z;
    if (sum === 0) {
        return [0, 0];
    }

    let x = X / sum;
    let y = Y / sum;

    // Apply gamut correction
    [x, y] = closestPointOnGamut(x, y);

    return [x, y];
}

// Convert color temperature (Kelvin) to hex color
export function ctToColor(kelvin: number): string {
    // Convert color temperature to RGB
    const temp = kelvin / 100;
    let red, green, blue;

    if (temp <= 66) {
        red = 255;
        green = temp;
        green = 99.4708025861 * Math.log(green) - 161.1195681661;
        if (temp <= 19) {
            blue = 0;
        } else {
            blue = temp - 10;
            blue = 138.5177312231 * Math.log(blue) - 305.0447927307;
        }
    } else {
        red = temp - 60;
        red = 329.698727446 * Math.pow(red, -0.1332047592);
        green = temp - 60;
        green = 288.1221695283 * Math.pow(green, -0.0755148492);
        blue = 255;
    }

    // Clamp values
    red = Math.min(255, Math.max(0, Math.round(red)));
    green = Math.min(255, Math.max(0, Math.round(green)));
    blue = Math.min(255, Math.max(0, Math.round(blue)));

    // Convert to hex
    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
}

export function hueToColor(hue: number): string {
    const h = (hue / 65535) * 360;
    const s = 1;
    const v = 1;

    const c = v * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;
    if (h >= 0 && h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (h >= 60 && h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (h >= 120 && h < 180) {
        [r, g, b] = [0, c, x];
    } else if (h >= 180 && h < 240) {
        [r, g, b] = [0, x, c];
    } else if (h >= 240 && h < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    const red = Math.round((r + m) * 255);
    const green = Math.round((g + m) * 255);
    const blue = Math.round((b + m) * 255);

    return `#${red.toString(16).padStart(2, '0')}${green.toString(16).padStart(2, '0')}${blue.toString(16).padStart(2, '0')}`;
} 