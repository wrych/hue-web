import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/',
            name: 'setup',
            component: () => import('../views/SetupView.vue'),
        },
        {
            path: '/rooms',
            name: 'rooms',
            component: () => import('../views/RoomsView.vue'),
        },
    ],
});

export default router; 