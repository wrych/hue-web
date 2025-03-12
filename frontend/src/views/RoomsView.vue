<template>
  <div>
    <v-progress-circular
      v-if="isLoading"
      indeterminate
      color="primary"
      size="64"
      class="ma-4"
    ></v-progress-circular>
    <div v-else-if="hueStore.rooms.length > 0" class="rooms-container">
      <room-card
        v-for="room in hueStore.rooms"
        :key="room.id"
        :room="room"
        :loading="hueStore.isLoading"
      />
    </div>
    <v-alert
      v-else
      type="info"
      text="No rooms found. Make sure your Hue Bridge is properly connected."
    ></v-alert>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted } from 'vue';
import { useHueStore } from '../stores/hue';
import { useRouter } from 'vue-router';
import RoomCard from '../components/RoomCard.vue';

const router = useRouter();
const hueStore = useHueStore();
const isLoading = ref(true);

onMounted(async () => {
  if (!hueStore.bridgeIp || !hueStore.username) {
    router.push('/');
    return;
  }
  
  try {
    await hueStore.fetchRooms();
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
  } finally {
    isLoading.value = false;
  }

  // Listen for the rooms-all-off event
  window.addEventListener('rooms-all-off', handleRoomsAllOff);
});

// Clean up event listener when component is unmounted
onUnmounted(() => {
  window.removeEventListener('rooms-all-off', handleRoomsAllOff);
});

// Handler for when all rooms are turned off
function handleRoomsAllOff() {
  // The room states will be handled by each RoomCard component
  // through their watchers on room state changes
}
</script>

<style scoped>
.rooms-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
}

@media (max-width: 599px) {
  .rooms-container {
    grid-template-columns: 1fr; /* Single column on very small screens */
    padding: 8px;
    gap: 8px;
  }
}
</style> 