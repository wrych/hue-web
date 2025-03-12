import { inspect } from 'util';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = {
    debug: (message: string, data?: any) => {
        if (!isDevelopment) return;

        if (data) {
            console.log(message, inspect(data, { depth: null, colors: true }));
        } else {
            console.log(message);
        }
    },

    error: (message: string, error: any) => {
        if (!isDevelopment) return;

        console.error(message, {
            error: error instanceof Error ? error.message : error,
            stack: error instanceof Error ? error.stack : undefined
        });
    }
}; 