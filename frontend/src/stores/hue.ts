import { defineStore } from 'pinia';

interface HueState {
    bridgeIp: string | null;
    username: string | null;
    rooms: HueRoom[];
    isConnected: boolean;
    isLoading: boolean;
}

interface RoomStateUpdate {
    on?: boolean;
    bri?: number;
    hue?: number;
    sat?: number;
    xy?: [number, number];
    ct?: number;
    colormode?: 'ct' | 'xy' | 'hs';
}

export interface HueRoom {
    id: string;
    name: string;
    type: string;
    class: string;
    state: {
        all_on: boolean;
        any_on: boolean;
    };
    action: {
        on?: boolean;
        bri?: number;
        ct?: number;
        xy?: [number, number];
        color?: string;
        colormode?: 'ct' | 'xy';
        hue?: number;
        sat?: number;
    };
    lights: string[];
}

export const useHueStore = defineStore('hue', {
    state: (): HueState => ({
        bridgeIp: null,
        username: null,
        rooms: [],
        isConnected: false,
        isLoading: false,
    }),

    actions: {
        async init() {
            this.isLoading = true;
            try {
                const response = await fetch('/api/hue/status');
                const status = await response.json();
                this.bridgeIp = status.bridgeIp;
                this.username = status.username;
                this.isConnected = status.isConfigured;
            } catch (error) {
                console.error('Failed to get bridge status:', error);
            } finally {
                this.isLoading = false;
            }
        },

        async discoverBridge() {
            this.isLoading = true;
            try {
                const response = await fetch('/api/hue/discover');
                const bridges = await response.json();
                if (bridges.length > 0) {
                    this.bridgeIp = bridges[0].ipaddress;
                }
                return bridges;
            } catch (error) {
                console.error('Failed to discover bridge:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async registerUser() {
            if (!this.bridgeIp) throw new Error('No bridge IP found');

            this.isLoading = true;
            try {
                const response = await fetch('/api/hue/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await response.json();
                this.username = data.username;
                this.isConnected = true;
                return data;
            } catch (error) {
                console.error('Failed to register user:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async fetchRooms() {
            if (!this.bridgeIp || !this.username) throw new Error('Not connected to bridge');

            this.isLoading = true;
            try {
                const response = await fetch('/api/hue/rooms');
                const roomsData = await response.json();
                // Store the rooms directly since they're already processed by the backend
                this.rooms = roomsData;
                return this.rooms;
            } catch (error) {
                console.error('Failed to fetch rooms:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async updateRoomState(roomId: string | number, state: RoomStateUpdate) {
            if (!this.bridgeIp || !this.username) throw new Error('Not connected to bridge');

            this.isLoading = true;
            try {
                // Ensure roomId is a number
                const numericRoomId = typeof roomId === 'string' ? parseInt(roomId, 10) : roomId;
                if (isNaN(numericRoomId)) {
                    throw new Error('Invalid room ID');
                }

                await fetch(`/api/hue/rooms/${numericRoomId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ state }),
                });
                await this.fetchRooms(); // Refresh rooms after update
            } catch (error) {
                console.error('Failed to update room state:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        },

        async clearConfig() {
            this.isLoading = true;
            try {
                await fetch('/api/hue/clear-config', { method: 'POST' });
                this.bridgeIp = null;
                this.username = null;
                this.isConnected = false;
                this.rooms = [];
            } catch (error) {
                console.error('Failed to clear config:', error);
                throw error;
            } finally {
                this.isLoading = false;
            }
        }
    },
}); 