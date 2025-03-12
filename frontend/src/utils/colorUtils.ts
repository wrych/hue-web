// Color gamut for Philips Hue lights
const gamutTriangle = {
    r: { x: 0.675, y: 0.322 },
    g: { x: 0.409, y: 0.518 },
    b: { x: 0.167, y: 0.04 }
};

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

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

export function xyColorToHex(xy: [number, number], brightness = 1.0): string {
    const rgb = xyToRgb(xy[0], xy[1], brightness);
    return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export function hexColorToXy(hex: string): [number, number] {
    const rgb = hexToRgb(hex);
    if (!rgb) return [0.5, 0.5]; // Default white point if conversion fails
    const xy = rgbToXy(rgb.r, rgb.g, rgb.b);
    return [xy.x, xy.y];
}

// Convert color temperature (Kelvin) to hex color
export function ctToColor(kelvin: number): string {
    // Clamp kelvin to valid range
    kelvin = Math.max(2000, Math.min(6500, kelvin));

    let r, g, b;

    // Temperature to RGB conversion based on approximation
    if (kelvin <= 6600) {
        r = 255;
        g = kelvin / 100 - 2;
        g = 99.4708025861 * Math.log(g) - 161.1195681661;
        if (kelvin <= 2000) {
            b = 0;
        } else {
            b = kelvin / 100 - 10;
            b = 138.5177312231 * Math.log(b) - 305.0447927307;
        }
    } else {
        r = kelvin / 100 - 60;
        r = 329.698727446 * Math.pow(r, -0.1332047592);
        g = kelvin / 100 - 60;
        g = 288.1221695283 * Math.pow(g, -0.0755148492);
        b = 255;
    }

    // Clamp values
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));

    // Convert to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
} 