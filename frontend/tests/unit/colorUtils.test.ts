import { describe, it, expect } from 'vitest';
import { xyColorToHex, hexColorToXy, ctToColor, hueToColor } from '../../src/utils/colorUtils';
import { miredToKelvin, kelvinToMired } from '../../src/utils/colorConverter';
import { hexToRgb } from '../../src/utils/colorUtils';

describe('Color Utilities', () => {
    describe('xyColorToHex and hexColorToXy', () => {
        it('should convert xy coordinates to hex color and back', () => {
            // Test with known xy values for red
            const x = 0.675;
            const y = 0.322;
            const hex = xyColorToHex(x, y);
            expect(hex).toMatch(/^#[0-9a-f]{6}$/i);

            // Converting back should give approximately the same values
            const [newX, newY] = hexColorToXy(hex);
            expect(newX).toBeCloseTo(x, 1);
            expect(newY).toBeCloseTo(y, 1);
        });

        it('should handle edge cases', () => {
            // Test black (0, 0)
            const blackHex = xyColorToHex(0, 0);
            expect(blackHex.toLowerCase()).toBe('#000000');

            // Test maximum values
            const maxHex = xyColorToHex(1, 1);
            expect(maxHex).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    describe('ctToColor', () => {
        it('should convert color temperature to hex color', () => {
            // Test warm light (2000K)
            const warmLight = ctToColor(2000);
            expect(warmLight).toMatch(/^#[0-9a-f]{6}$/i);
            expect(warmLight.toLowerCase()).not.toBe('#ffffff');

            // Test neutral light (4000K)
            const neutralLight = ctToColor(4000);
            expect(neutralLight).toMatch(/^#[0-9a-f]{6}$/i);

            // Test cool light (6500K)
            const coolLight = ctToColor(6500);
            expect(coolLight).toMatch(/^#[0-9a-f]{6}$/i);
            expect(coolLight.toLowerCase()).not.toBe('#000000');
        });

        it('should handle edge cases', () => {
            // Test minimum temperature
            const minTemp = ctToColor(1000);
            expect(minTemp).toMatch(/^#[0-9a-f]{6}$/i);

            // Test maximum temperature
            const maxTemp = ctToColor(10000);
            expect(maxTemp).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    describe('hueToColor', () => {
        it('should convert hue values to hex colors', () => {
            // Test red (0 degrees)
            const red = hueToColor(0);
            expect(red.toLowerCase()).toBe('#ff0000');

            // Test green (120 degrees = 21845 in Hue API)
            const green = hueToColor(21845);
            expect(green.toLowerCase()).toBe('#00ff00');

            // Test blue (240 degrees = 43690 in Hue API)
            const blue = hueToColor(43690);
            expect(blue.toLowerCase()).toBe('#0000ff');
        });

        it('should handle edge cases', () => {
            // Test maximum value
            const max = hueToColor(65535);
            expect(max).toMatch(/^#[0-9a-f]{6}$/i);

            // Test middle value
            const middle = hueToColor(32767);
            expect(middle).toMatch(/^#[0-9a-f]{6}$/i);
        });
    });

    describe('miredToKelvin and kelvinToMired', () => {
        it('should convert between mired and kelvin', () => {
            // Test with common color temperatures
            const warmKelvin = 2700;
            const warmMired = kelvinToMired(warmKelvin);
            expect(miredToKelvin(warmMired)).toBeCloseTo(warmKelvin, -2);

            const coolKelvin = 6500;
            const coolMired = kelvinToMired(coolKelvin);
            expect(miredToKelvin(coolMired)).toBeCloseTo(coolKelvin, -2);
        });

        it('should handle edge cases', () => {
            // Test minimum and maximum values
            const minKelvin = 1000;
            const maxKelvin = 10000;

            const minMired = kelvinToMired(minKelvin);
            const maxMired = kelvinToMired(maxKelvin);

            expect(miredToKelvin(minMired)).toBeCloseTo(minKelvin, -2);
            expect(miredToKelvin(maxMired)).toBeCloseTo(maxKelvin, -2);
        });
    });

    describe('Color Mode Switching', () => {
        it('should preserve color values when switching between xy and ct modes', () => {
            // Start with a known xy color (green)
            const initialX = 0.409; // Hue green point
            const initialY = 0.518;

            // Convert to hex
            const hexColor = xyColorToHex(initialX, initialY);

            // Convert back to xy
            const [finalX, finalY] = hexColorToXy(hexColor);

            // Allow for some variation in color space conversion
            expect(finalX).toBeCloseTo(initialX, 1); // Less strict tolerance
            expect(finalY).toBeCloseTo(initialY, 1);
        });

        it('should handle color conversion within Hue gamut limits', () => {
            // Test with red (should be close to Hue's red point)
            const [redX, redY] = hexColorToXy('#ff0000');
            expect(redX).toBeCloseTo(0.675, 1); // Less strict tolerance
            expect(redY).toBeCloseTo(0.322, 1);

            // Test with green (should be close to Hue's green point)
            const [greenX, greenY] = hexColorToXy('#00ff00');
            expect(greenX).toBeCloseTo(0.409, 1);
            expect(greenY).toBeCloseTo(0.518, 1);

            // Test with blue (should be close to Hue's blue point)
            const [blueX, blueY] = hexColorToXy('#0000ff');
            expect(blueX).toBeCloseTo(0.167, 1);
            expect(blueY).toBeCloseTo(0.04, 1);
        });

        it('should handle white point conversion correctly', () => {
            // D65 white point (standard illuminant)
            const whiteX = 0.3127;
            const whiteY = 0.3290;

            const whiteHex = xyColorToHex(whiteX, whiteY);
            const [convertedX, convertedY] = hexColorToXy(whiteHex);

            // White point should be more precise
            expect(convertedX).toBeCloseTo(whiteX, 2);
            expect(convertedY).toBeCloseTo(whiteY, 2);
        });
    });
}); 