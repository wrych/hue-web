import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createVuetify } from 'vuetify';
import 'vuetify/styles';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';

import App from './App.vue';
import router from './router';

const app = createApp(App);
const pinia = createPinia();
const vuetify = createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'light',
        themes: {
            light: {
                colors: {
                    primary: '#1976D2',
                    secondary: '#424242',
                },
            },
            dark: {
                colors: {
                    primary: '#2196F3',
                    secondary: '#424242',
                },
            },
        },
        variations: {
            colors: ['primary', 'secondary'],
            lighten: 1,
            darken: 2,
        },
    },
});

// Enable automatic dark mode based on system preference
if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    vuetify.theme.global.name.value = 'dark';
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    vuetify.theme.global.name.value = e.matches ? 'dark' : 'light';
});

app.use(pinia);
app.use(router);
app.use(vuetify);

app.mount('#app'); 