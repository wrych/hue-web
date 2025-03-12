/**
 * Convert Mired color temperature to Kelvin
 * @param mired - Color temperature in Mired (micro reciprocal degrees)
 * @returns Color temperature in Kelvin
 */
export function miredToKelvin(mired: number): number {
    return Math.round(1000000 / mired);
}

/**
 * Convert Kelvin color temperature to Mired
 * @param kelvin - Color temperature in Kelvin
 * @returns Color temperature in Mired (micro reciprocal degrees)
 */
export function kelvinToMired(kelvin: number): number {
    return Math.round(1000000 / kelvin);
} 