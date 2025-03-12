<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Hue Controller</v-app-bar-title>
      <template v-slot:append>
        <v-btn
          v-if="hueStore.isConnected && !isLoading"
          color="error"
          variant="elevated"
          class="turn-off-btn"
          :loading="hueStore.isLoading"
          @click="turnAllOff"
          prepend-icon="mdi-lightbulb-off"
        >
          Turn All Off
        </v-btn>
      </template>
    </v-app-bar>

    <v-main>
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useHueStore } from './stores/hue';

const hueStore = useHueStore();
const isLoading = ref(false);

async function turnAllOff() {
  try {
    // Turn off all rooms
    for (const room of hueStore.rooms) {
      await hueStore.updateRoomState(room.id, {
        on: false
      });
    }
    // Emit a custom event that can be listened to by other components
    window.dispatchEvent(new CustomEvent('rooms-all-off'));
  } catch (error) {
    console.error('Failed to turn off all rooms:', error);
  }
}
</script>

<style>
/* Global styles */
html {
  overflow-y: auto;
}

.turn-off-btn {
  background-color: rgb(var(--v-theme-error)) !important;
  color: rgb(var(--v-theme-on-error)) !important;
  opacity: 0.95;
}

.turn-off-btn:hover {
  opacity: 1;
}
</style> 