<template>
  <div>
    <v-progress-circular
      v-if="isLoading"
      indeterminate
      color="primary"
      size="64"
      class="ma-4"
    ></v-progress-circular>
    <v-row v-else-if="hueStore.rooms.length > 0">
      <v-col
        v-for="room in hueStore.rooms"
        :key="room.id"
        cols="12"
        sm="6"
        md="4"
      >
        <v-card>
          <!-- Header with room name and power switch -->
          <v-card-item class="px-3 py-2">
            <div class="d-flex align-center justify-space-between w-100">
              <div class="text-h6 text-truncate me-2">{{ room.name }}</div>
              <v-switch
                v-model="roomState[room.id].on"
                color="primary"
                :loading="hueStore.isLoading"
                @change="toggleRoom(room)"
                hide-details
                density="compact"
                inset
              ></v-switch>
            </div>
          </v-card-item>

          <!-- Controls section -->
          <v-card-text v-if="roomState[room.id].on" class="pa-0 pb-8 position-relative">
            <!-- Controls container -->
            <v-sheet class="px-3 py-2">
              <!-- Brightness control -->
              <div class="control-group">
                <div class="text-subtitle-2 mb-1">Brightness</div>
                <gradient-slider
                  v-model="roomState[room.id].brightness"
                  :loading="hueStore.isLoading"
                  type="brightness"
                  :base-color="isInCtMode(room) ? ctToColor(roomState[room.id].ct) : roomState[room.id].color"
                  :min="1"
                  :max="254"
                  show-value
                  :value-formatter="(value) => `${Math.max(1, Math.round((value - 1) / 253 * 100))}%`"
                  @update:modelValue="updateBrightness(room)"
                />
              </div>

              <!-- Color mode controls -->
              <div class="control-group mt-4" v-if="hasCtCapability(room) || hasColorCapability(room)">
                <v-expand-transition>
                  <div v-show="roomState[room.id].showColorControls">
                    <div class="d-flex align-center mb-2">
                      <v-tabs
                        v-model="roomState[room.id].colormode"
                        density="comfortable"
                        color="primary"
                        class="color-mode-tabs"
                        grow
                      >
                        <v-tab
                          v-if="hasCtCapability(room)"
                          value="ct"
                          @click="switchColorMode(room, 'ct')"
                        >
                          <v-icon start size="20">mdi-thermometer</v-icon>
                          White
                        </v-tab>
                        <v-tab
                          v-if="hasColorCapability(room)"
                          value="xy"
                          @click="switchColorMode(room, 'xy')"
                        >
                          <v-icon start size="20">mdi-palette</v-icon>
                          Color
                        </v-tab>
                      </v-tabs>
                    </div>

                    <!-- Color temperature control -->
                    <template v-if="isInCtMode(room) && hasCtCapability(room)">
                      <gradient-slider
                        v-model="roomState[room.id].ct"
                        :loading="hueStore.isLoading"
                        type="temperature"
                        :min="2000"
                        :max="6500"
                        show-value
                        :value-formatter="(value) => `${value}K`"
                        @update:modelValue="updateColorTemp(room)"
                      />
                    </template>

                    <!-- Color control -->
                    <template v-if="isInColorMode(room) && hasColorCapability(room)">
                      <div class="color-controls">
                        <gradient-slider
                          v-model="roomState[room.id].hue"
                          :loading="hueStore.isLoading"
                          type="hue"
                          :min="0"
                          :max="65535"
                          @update:modelValue="updateHue(room)"
                        />
                        <gradient-slider
                          v-model="roomState[room.id].saturation"
                          :loading="hueStore.isLoading"
                          type="saturation"
                          :base-color="hueToColor(roomState[room.id].hue)"
                          :min="0"
                          :max="254"
                          @update:modelValue="updateSaturation(room)"
                        />
                      </div>
                    </template>
                  </div>
                </v-expand-transition>
              </div>
            </v-sheet>
            
            <!-- Slim toggle bar -->
            <v-btn
              variant="text"
              class="toggle-button"
              @click="roomState[room.id].showColorControls = !roomState[room.id].showColorControls"
            >
              <v-icon :icon="roomState[room.id].showColorControls ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" />
            </v-btn>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-alert
      v-else
      type="info"
      text="No rooms found. Make sure your Hue Bridge is properly connected."
    ></v-alert>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive } from 'vue';
import { useHueStore } from '../stores/hue';
import { useRouter } from 'vue-router';
import { xyColorToHex, hexColorToXy, ctToColor } from '../utils/colorUtils';
import { miredToKelvin, kelvinToMired } from '../utils/colorConverter';
import GradientSlider from '../components/GradientSlider.vue';

const router = useRouter();
const hueStore = useHueStore();
const isLoading = ref(true);
const roomState = reactive<Record<string, any>>({});

// Debounce function
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Debounced update functions
const debouncedUpdateBrightness = debounce(async (room: any) => {
  try {
    await hueStore.updateRoomState(room.id, {
      bri: roomState[room.id].brightness,
      colormode: roomState[room.id].colormode
    });
  } catch (error) {
    console.error('Failed to update brightness:', error);
  }
}, 100);

const debouncedUpdateColorTemp = debounce(async (room: any) => {
  try {
    await hueStore.updateRoomState(room.id, {
      ct: kelvinToMired(roomState[room.id].ct),
      colormode: 'ct'
    });
  } catch (error) {
    console.error('Failed to update color temperature:', error);
  }
}, 100);

const debouncedUpdateColor = debounce(async (room: any) => {
  try {
    const xy = hexColorToXy(roomState[room.id].color);
    await hueStore.updateRoomState(room.id, {
      xy: xy,
      colormode: 'xy'
    });
  } catch (error) {
    console.error('Failed to update color:', error);
  }
}, 100);

// Helper function to convert xy coordinates to HSV
function xyToHueSaturation(x: number, y: number): { hue: number; saturation: number } {
  // Convert xy to XYZ
  const Y = 1.0;
  const X = (Y / y) * x;
  const Z = (Y / y) * (1 - x - y);

  // Convert XYZ to RGB
  const r = X * 3.2406 - Y * 1.5372 - Z * 0.4986;
  const g = -X * 0.9689 + Y * 1.8758 + Z * 0.0415;
  const b = X * 0.0557 - Y * 0.2040 + Z * 1.0570;

  // Convert RGB to HSV
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  // Calculate hue
  let h = 0;
  if (delta === 0) {
    h = 0;
  } else if (max === r) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }

  if (h < 0) h += 360;

  // Calculate saturation and clamp it to valid range
  const s = max === 0 ? 0 : Math.min(1, delta / max);

  // Convert to Hue API ranges
  const hue = Math.round((h / 360) * 65535);
  const saturation = Math.round(s * 254);

  return { hue, saturation };
}

onMounted(async () => {
  if (!hueStore.bridgeIp || !hueStore.username) {
    router.push('/');
    return;
  }
  
  try {
    await hueStore.fetchRooms();
    // Initialize room states
    hueStore.rooms.forEach(room => {
      let hue = 0;
      let saturation = 0;
      
      // If the light is in xy mode, convert xy to hue/saturation
      if (room.action?.xy && room.action.colormode === 'xy') {
        const hsValues = xyToHueSaturation(room.action.xy[0], room.action.xy[1]);
        hue = hsValues.hue;
        saturation = hsValues.saturation;
      } else if (room.action?.hue !== undefined && room.action?.sat !== undefined) {
        hue = room.action.hue;
        saturation = room.action.sat;
      }

      roomState[room.id] = {
        on: room.state?.any_on || false,
        brightness: Math.max(1, room.action?.bri || 1),
        ct: room.action?.ct ? miredToKelvin(room.action.ct) : 2700,
        hue: hue,
        saturation: saturation,
        color: room.action?.xy ? xyColorToHex(room.action.xy as [number, number], room.action.bri ? room.action.bri / 254 : 1.0) : '#ffffff',
        colormode: room.action?.colormode || 'ct',
        showColorControls: false
      };
    });
  } catch (error) {
    console.error('Failed to fetch rooms:', error);
  } finally {
    isLoading.value = false;
  }
});

function isInColorMode(room: any): boolean {
  return roomState[room.id]?.colormode === 'hs' || roomState[room.id]?.colormode === 'xy';
}

function isInCtMode(room: any): boolean {
  return roomState[room.id]?.colormode === 'ct';
}

function hasColorCapability(room: any): boolean {
  return room.action?.xy !== undefined;
}

function hasCtCapability(room: any): boolean {
  return room.action?.ct !== undefined;
}

async function toggleRoom(room: any) {
  try {
    await hueStore.updateRoomState(room.id, {
      on: roomState[room.id].on,
    });
  } catch (error) {
    console.error('Failed to toggle room:', error);
    roomState[room.id].on = !roomState[room.id].on;
  }
}

async function updateBrightness(room: any) {
  debouncedUpdateBrightness(room);
}

async function updateColorTemp(room: any) {
  debouncedUpdateColorTemp(room);
}

async function updateColor(room: any) {
  debouncedUpdateColor(room);
}

// Function to switch between color modes
async function switchColorMode(room: any, mode: 'ct' | 'xy') {
  try {
    // First, update the color mode
    await hueStore.updateRoomState(room.id, {
      colormode: mode,
      ...(mode === 'ct' 
        ? { ct: kelvinToMired(roomState[room.id].ct) } 
        : { xy: hueAndSaturationToXy(roomState[room.id].hue, roomState[room.id].saturation) }
      )
    });

    // Then fetch the updated rooms to get the current state
    await hueStore.fetchRooms();
    
    // Find the updated room
    const updatedRoom = hueStore.rooms.find(r => r.id === room.id);
    if (updatedRoom?.action) {
      const action = updatedRoom.action;
      
      // Update local state based on the current mode
      if (mode === 'xy' && action.xy) {
        const hsValues = xyToHueSaturation(action.xy[0], action.xy[1]);
        roomState[room.id].hue = hsValues.hue;
        roomState[room.id].saturation = hsValues.saturation;
        roomState[room.id].color = xyColorToHex(action.xy, action.bri ? action.bri / 254 : 1.0);
      } else if (mode === 'ct' && action.ct) {
        roomState[room.id].ct = miredToKelvin(action.ct);
      }
      
      // Update common properties
      roomState[room.id].brightness = action.bri || roomState[room.id].brightness;
      roomState[room.id].colormode = action.colormode || mode;
    }
  } catch (error) {
    console.error('Failed to switch color mode:', error);
  }
}

// Helper function to convert hue and saturation to RGB color
function hueToColor(hue: number): string {
  const h = (hue / 65535) * 360;
  return `hsl(${h}, 100%, 50%)`;
}

// Split color updates into hue and saturation
async function updateHue(room: any) {
  try {
    const xy = hueAndSaturationToXy(roomState[room.id].hue, roomState[room.id].saturation);
    // Update the color in the room state
    roomState[room.id].color = hueToColor(roomState[room.id].hue);
    await hueStore.updateRoomState(room.id, {
      xy: xy,
      colormode: 'xy'
    });
  } catch (error) {
    console.error('Failed to update hue:', error);
  }
}

async function updateSaturation(room: any) {
  try {
    const xy = hueAndSaturationToXy(roomState[room.id].hue, roomState[room.id].saturation);
    // Update the color in the room state
    roomState[room.id].color = hueToColor(roomState[room.id].hue);
    await hueStore.updateRoomState(room.id, {
      xy: xy,
      colormode: 'xy'
    });
  } catch (error) {
    console.error('Failed to update saturation:', error);
  }
}

// Helper function to convert hue and saturation to xy coordinates
function hueAndSaturationToXy(hue: number, saturation: number): [number, number] {
  const h = (hue / 65535) * 360;
  // Ensure saturation is within valid range (0-254) before normalizing
  const s = Math.min(254, Math.max(0, saturation)) / 254;
  
  // Convert HSV to RGB (assuming V=1)
  let c = s;
  let tempX = c * (1 - Math.abs(((h / 60) % 2) - 1));
  let m = 1 - c;

  let r, g, b;
  if (h < 60) { r = c; g = tempX; b = 0; }
  else if (h < 120) { r = tempX; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = tempX; }
  else if (h < 240) { r = 0; g = tempX; b = c; }
  else if (h < 300) { r = tempX; g = 0; b = c; }
  else { r = c; g = 0; b = tempX; }

  r = r + m;
  g = g + m;
  b = b + m;

  // Convert RGB to XY (simplified conversion)
  const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
  const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
  const Z = r * 0.000088 + g * 0.072310 + b * 0.986039;

  const xCoord = X / (X + Y + Z);
  const yCoord = Y / (X + Y + Z);

  return [xCoord, yCoord];
}
</script>

<style scoped>
.control-group {
  width: 100%;
}

.color-mode-tabs {
  margin-left: -12px;
  margin-right: -12px;
  width: calc(100% + 24px);
}

:deep(.v-tabs) {
  min-height: 36px;
}

:deep(.v-tab) {
  min-height: 36px;
  text-transform: none;
  flex-grow: 1;
  width: 50%;
  padding: 0 8px;
}

:deep(.v-tab .v-icon) {
  margin-right: 4px;
}

:deep(.v-switch) {
  margin-top: 0;
  margin-bottom: 0;
}

:deep(.v-card-item) {
  row-gap: 0;
}

.color-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Enhanced slider styles */
:deep(.slider-track) {
  height: 20px !important;
  border-radius: 10px !important;
  background: rgba(var(--v-theme-on-surface), 0.12) !important;
}

:deep(.slider-thumb) {
  width: 32px !important;
  height: 32px !important;
  background: rgb(var(--v-theme-primary)) !important;
  border: 2px solid rgb(var(--v-theme-surface)) !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  cursor: pointer !important;
  transition: transform 0.2s, box-shadow 0.2s !important;
  border-radius: 50% !important;
  touch-action: none !important;
}

:deep(.slider-thumb:hover),
:deep(.slider-thumb:active) {
  transform: scale(1.1) !important;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3) !important;
}

/* Add a subtle outline to make the handle visible on any background */
:deep(.slider-thumb::after) {
  content: '';
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  border-radius: 50%;
  border: 2px solid rgba(var(--v-theme-on-surface), 0.1);
  pointer-events: none;
}

/* Increase the hit area for touch devices */
@media (max-width: 768px) {
  :deep(.slider-thumb) {
    width: 36px !important;
    height: 36px !important;
  }
  
  :deep(.slider-track) {
    height: 24px !important;
  }
}

/* Color controls expand/collapse transition */
:deep(.v-expand-transition-enter-active),
:deep(.v-expand-transition-leave-active) {
  transition: all 0.3s ease-in-out;
}

:deep(.v-expand-transition-enter-from),
:deep(.v-expand-transition-leave-to) {
  opacity: 0;
  transform: translateY(-8px);
}

.toggle-button {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  min-width: 80px;
  height: 24px !important;
  border-radius: 8px 8px 0 0;
  background-color: rgba(var(--v-theme-primary), 0.08);
  padding: 0;
  margin: 0;
}

.toggle-button:hover {
  background-color: rgba(var(--v-theme-primary), 0.12);
}

:deep(.toggle-button .v-btn__content) {
  opacity: 0.8;
}

/* Adjust card text padding */
.v-card-text {
  padding-bottom: 24px !important;
}
</style> 