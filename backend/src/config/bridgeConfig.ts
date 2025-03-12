import fs from 'fs';
import path from 'path';

interface BridgeConfig {
    bridgeIp: string | null;
    username: string | null;
}

class BridgeConfigManager {
    private configPath: string;
    private config: BridgeConfig;

    constructor() {
        this.configPath = path.join(__dirname, 'bridge.json');
        this.config = this.loadConfig();
    }

    private loadConfig(): BridgeConfig {
        try {
            if (fs.existsSync(this.configPath)) {
                const configData = fs.readFileSync(this.configPath, 'utf-8');
                return JSON.parse(configData);
            }
        } catch (error) {
            console.error('Error loading bridge config:', error);
        }
        return { bridgeIp: null, username: null };
    }

    private saveConfig(): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4));
        } catch (error) {
            console.error('Error saving bridge config:', error);
        }
    }

    getBridgeIp(): string | null {
        return this.config.bridgeIp;
    }

    getUsername(): string | null {
        return this.config.username;
    }

    setBridgeIp(ip: string): void {
        this.config.bridgeIp = ip;
        this.saveConfig();
    }

    setUsername(username: string): void {
        this.config.username = username;
        this.saveConfig();
    }

    isConfigured(): boolean {
        return !!(this.config.bridgeIp && this.config.username);
    }

    clearConfig(): void {
        this.config = { bridgeIp: null, username: null };
        this.saveConfig();
    }
}

export const bridgeConfig = new BridgeConfigManager(); 