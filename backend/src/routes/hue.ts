import { Express, Request, Response } from 'express';
import { v3 } from 'node-hue-api';
import { discovery } from 'node-hue-api';
import { bridgeConfig } from '../config/bridgeConfig';
import { logger } from '../utils/logger';
import { miredToKelvin, kelvinToMired, rgbToXy, xyToRgb, parseRgbHex, rgbToHex } from '../utils/colorConverter';

interface HueRoomAction {
    on?: boolean;
    bri?: number;
    ct?: number;
    xy?: [number, number];
    color?: string;
    colormode?: 'ct' | 'xy';
}

interface HueRoom {
    id: string;
    name: string;
    type: string;
    state: {
        all_on: boolean;
        any_on: boolean;
    };
    action: HueRoomAction;
    class: string;
    lights: string[];
}

// Constants for Hue bridge limits
const HUE_LIMITS = {
    CT_MIN: 153,    // 6500K (cool daylight)
    CT_MAX: 500,    // 2000K (warm candlelight)
    BRI_MIN: 1,     // Minimum brightness
    BRI_MAX: 254,   // Maximum brightness
    KELVIN_MIN: 2000,
    KELVIN_MAX: 6500
};

// Helper function to ensure Kelvin value is within valid range
function clampKelvin(kelvin: number): number {
    return Math.max(HUE_LIMITS.KELVIN_MIN, Math.min(HUE_LIMITS.KELVIN_MAX, kelvin));
}

// Helper function to ensure brightness value is within valid range
function clampBrightness(bri: number): number {
    return Math.max(HUE_LIMITS.BRI_MIN, Math.min(HUE_LIMITS.BRI_MAX, bri));
}

export const setupHueRoutes = (app: Express) => {
    // Get bridge connection status
    app.get('/api/hue/status', (req: Request, res: Response) => {
        res.json({
            isConfigured: bridgeConfig.isConfigured(),
            bridgeIp: bridgeConfig.getBridgeIp(),
            username: bridgeConfig.getUsername()
        });
    });

    // Discover Hue bridges
    app.get('/api/hue/discover', async (req: Request, res: Response) => {
        try {
            const bridges = await discovery.nupnpSearch();
            if (bridges.length > 0) {
                bridgeConfig.setBridgeIp(bridges[0].ipaddress);
            }
            res.json(bridges);
        } catch (error) {
            logger.error('Failed to discover bridges:', error);
            res.status(500).json({ error: 'Failed to discover Hue bridges' });
        }
    });

    // Create user on bridge
    app.post('/api/hue/register', async (req: Request, res: Response) => {
        const bridgeIp = bridgeConfig.getBridgeIp();
        if (!bridgeIp) {
            res.status(400).json({ error: 'No bridge IP configured' });
            return;
        }

        try {
            const unauthenticatedApi = await v3.api.createLocal(bridgeIp).connect();
            const user = await unauthenticatedApi.users.createUser('Hue Web Controller');
            bridgeConfig.setUsername(user.username);
            res.json(user);
        } catch (error) {
            logger.error('Failed to register user:', error);
            res.status(500).json({ error: 'Failed to register user on bridge' });
        }
    });

    // Get all rooms
    app.get('/api/hue/rooms', async (req: Request, res: Response) => {
        const bridgeIp = bridgeConfig.getBridgeIp();
        const username = bridgeConfig.getUsername();

        if (!bridgeIp || !username) {
            res.status(400).json({ error: 'Bridge not configured' });
            return;
        }

        try {
            const hueApi = await v3.api.createLocal(bridgeIp).connect(username);
            const rooms = await hueApi.groups.getAll();
            const processedRooms = rooms
                .filter(group => group.type === 'Room')
                .map(room => {
                    const processedRoom = { ...room } as HueRoom;
                    if (processedRoom.action) {
                        // Convert color temperature from mired to kelvin
                        if (processedRoom.action.ct !== undefined) {
                            const mired = Math.max(HUE_LIMITS.CT_MIN, Math.min(HUE_LIMITS.CT_MAX, processedRoom.action.ct));
                            const kelvin = miredToKelvin(mired);
                            processedRoom.action.ct = clampKelvin(kelvin);
                        }
                        // Convert xy color to RGB hex
                        if (processedRoom.action.xy) {
                            const rgb = xyToRgb(
                                processedRoom.action.xy[0],
                                processedRoom.action.xy[1],
                                processedRoom.action.bri ? processedRoom.action.bri / HUE_LIMITS.BRI_MAX : 1.0
                            );
                            processedRoom.action.color = rgbToHex(rgb.r, rgb.g, rgb.b);
                        }
                    }
                    return processedRoom;
                });
            res.json(processedRooms);
        } catch (error) {
            logger.error('Failed to fetch rooms:', error);
            res.status(500).json({ error: 'Failed to fetch rooms' });
        }
    });

    // Control room
    app.put('/api/hue/rooms/:roomId', async (req: Request, res: Response) => {
        const bridgeIp = bridgeConfig.getBridgeIp();
        const username = bridgeConfig.getUsername();
        const roomId = parseInt(req.params.roomId, 10);
        const state = req.body.state as HueRoomAction;

        logger.debug('🔧 Attempting to update room:', {
            roomId,
            state,
            timestamp: new Date().toISOString()
        });

        if (!bridgeIp || !username) {
            logger.debug('❌ Failed: Bridge not configured');
            res.status(400).json({ error: 'Bridge not configured' });
            return;
        }

        if (isNaN(roomId)) {
            logger.debug('❌ Failed: Invalid room ID:', roomId);
            res.status(400).json({ error: 'Invalid room ID' });
            return;
        }

        try {
            const hueApi = await v3.api.createLocal(bridgeIp).connect(username);

            // Get current state before update
            const beforeState = await hueApi.groups.getGroup(roomId);
            logger.debug('📝 Current room state:', {
                roomId,
                name: beforeState.name,
                state: beforeState.state,
                action: beforeState.action
            });

            // Convert incoming state values
            const hueState = {
                on: state.on,
            } as any;

            // Only include brightness if:
            // 1. It's explicitly provided in the request, or
            // 2. We're turning the lights ON (in which case use previous or default brightness)
            if (state.bri !== undefined || (state.on === true && !(beforeState.state as { any_on: boolean }).any_on)) {
                const currentBri = (beforeState.action as HueRoomAction).bri ?? HUE_LIMITS.BRI_MAX;
                hueState.bri = clampBrightness(state.bri ?? currentBri);
            }

            // Get current color mode if not explicitly changing it
            const currentMode = (beforeState.action as HueRoomAction).colormode ?? 'ct';

            // Set color mode if explicitly changing it
            if (state.colormode) {
                hueState.colormode = state.colormode;
            }

            // Handle color temperature (already in Mired from frontend)
            if (state.ct !== undefined) {
                hueState.ct = Math.max(HUE_LIMITS.CT_MIN, Math.min(HUE_LIMITS.CT_MAX, state.ct));
                if (!state.colormode) {
                    hueState.colormode = 'ct';
                }
            }

            // Convert hex color to xy coordinates
            if (state.color !== undefined) {
                const rgb = parseRgbHex(state.color);
                if (rgb) {
                    hueState.xy = rgbToXy(rgb.r, rgb.g, rgb.b);
                    if (!state.colormode) {
                        hueState.colormode = 'xy';
                    }
                }
            } else if (state.xy !== undefined) {
                hueState.xy = state.xy;
                if (!state.colormode) {
                    hueState.colormode = 'xy';
                }
            }

            // If updating brightness or turning on without changing color mode,
            // include the current color values to maintain state
            if ((state.bri !== undefined || state.on === true) && !state.colormode) {
                if (currentMode === 'ct' && (beforeState.action as HueRoomAction).ct !== undefined) {
                    hueState.ct = (beforeState.action as HueRoomAction).ct;
                } else if (currentMode === 'xy' && (beforeState.action as HueRoomAction).xy !== undefined) {
                    hueState.xy = (beforeState.action as HueRoomAction).xy;
                }
                hueState.colormode = currentMode;
            }

            // Update state
            const group = await hueApi.groups.getGroup(roomId);
            await hueApi.groups.setGroupState(group, hueState);

            // Get state after update to confirm changes
            const afterState = await hueApi.groups.getGroup(roomId);
            const action = afterState.action as any;

            // Convert values back for logging
            const logState: HueRoomAction = {
                on: action.on,
                bri: action.bri,
                colormode: action.colormode
            };

            if (action.ct !== undefined) {
                const kelvin = miredToKelvin(action.ct);
                logState.ct = clampKelvin(kelvin);
            }
            if (action.xy) {
                const rgb = xyToRgb(action.xy[0], action.xy[1], action.bri ? action.bri / HUE_LIMITS.BRI_MAX : 1.0);
                logState.color = rgbToHex(rgb.r, rgb.g, rgb.b);
            }

            logger.debug('✅ Room state updated successfully:', {
                roomId,
                name: afterState.name,
                requestedChanges: state,
                newState: afterState.state,
                newAction: logState
            });

            res.json({ success: true });
        } catch (error) {
            logger.error('❌ Failed to control room:', {
                roomId,
                state,
                error
            });
            res.status(500).json({ error: 'Failed to control room' });
        }
    });

    // Get room state
    app.get('/api/hue/rooms/:roomId', async (req: Request, res: Response) => {
        const { bridgeIp, username } = req.query;
        const { roomId } = req.params;

        try {
            const hueApi = await v3.api.createLocal(bridgeIp as string).connect(username as string);
            const room = await hueApi.groups.getGroup(parseInt(roomId, 10));
            res.json(room);
        } catch (error) {
            console.error('Failed to fetch room state:', error);
            res.status(500).json({ error: 'Failed to fetch room state' });
        }
    });

    // Clear bridge configuration
    app.post('/api/hue/clear-config', (req: Request, res: Response) => {
        bridgeConfig.clearConfig();
        res.json({ success: true });
    });
}; 