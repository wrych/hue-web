<template>
  <v-card class="room-card">
    <!-- Header with room name and power switch -->
    <v-card-item class="px-3 py-2">
      <div class="d-flex align-center justify-space-between w-100">
        <div class="d-flex align-center">
          <v-icon :icon="getRoomIcon(room.class)" class="me-2" />
          <div class="text-h6 text-truncate">{{ room.name }}</div>
        </div>
        <v-switch
          v-model="roomState.on"
          color="primary"
          :loading="loading"
          @change="toggleRoom"
          hide-details
          density="compact"
          inset
        ></v-switch>
      </div>
    </v-card-item>

    <!-- Controls section -->
    <v-card-text v-if="roomState.on" class="pa-0 pb-8 position-relative">
      <!-- Controls container -->
      <v-sheet class="px-3 py-2">
        <!-- Brightness control -->
        <div class="control-group" v-if="hasBrightnessCapability">
          <div class="text-subtitle-2 mb-1">Brightness</div>
          <gradient-slider
            v-model="roomState.brightness"
            :loading="loading"
            type="brightness"
            :base-color="getBrightnessSliderColor"
            :min="1"
            :max="254"
            show-value
            :value-formatter="(value) => `${Math.max(1, Math.round((value - 1) / 253 * 100))}%`"
            @update:modelValue="updateBrightness"
          />
        </div>

        <!-- Color mode controls -->
        <div class="control-group mt-4" v-if="hasCtCapability || hasColorCapability">
          <v-expand-transition>
            <div v-show="roomState.showColorControls">
              <div class="d-flex align-center mb-2">
                <v-tabs
                  v-model="roomState.colormode"
                  density="comfortable"
                  color="primary"
                  class="color-mode-tabs"
                  grow
                >
                  <v-tab
                    v-if="hasCtCapability"
                    value="ct"
                    @click="switchColorMode('ct')"
                  >
                    <v-icon start size="20">mdi-thermometer</v-icon>
                    White
                  </v-tab>
                  <v-tab
                    v-if="hasColorCapability"
                    value="xy"
                    @click="switchColorMode('xy')"
                  >
                    <v-icon start size="20">mdi-palette</v-icon>
                    Color
                  </v-tab>
                </v-tabs>
              </div>

              <!-- Color temperature control -->
              <template v-if="isInCtMode && hasCtCapability">
                <gradient-slider
                  v-model="roomState.ct"
                  :loading="loading"
                  type="temperature"
                  :min="2000"
                  :max="6500"
                  show-value
                  :value-formatter="(value) => `${value}K`"
                  @update:modelValue="updateColorTemp"
                />
              </template>

              <!-- Color control -->
              <template v-if="isInColorMode && hasColorCapability">
                <div class="color-controls">
                  <gradient-slider
                    v-model="roomState.hue"
                    :loading="loading"
                    type="hue"
                    :min="0"
                    :max="65535"
                    @update:modelValue="updateHue"
                  />
                  <gradient-slider
                    v-model="roomState.saturation"
                    :loading="loading"
                    type="saturation"
                    :base-color="hueToColor(roomState.hue)"
                    :min="0"
                    :max="254"
                    @update:modelValue="updateSaturation"
                  />
                </div>
              </template>
            </div>
          </v-expand-transition>
        </div>
      </v-sheet>
      
      <!-- Slim toggle bar -->
      <template v-if="hasCtCapability || hasColorCapability">
        <v-btn
          variant="text"
          class="toggle-button"
          @click="roomState.showColorControls = !roomState.showColorControls"
        >
          <v-icon :icon="roomState.showColorControls ? 'mdi-chevron-up' : 'mdi-chevron-down'" size="20" />
        </v-btn>
      </template>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import type { HueRoom } from '../stores/hue';
import { useHueStore } from '../stores/hue';
import { xyColorToHex, hexColorToXy, ctToColor, hueToColor } from '../utils/colorUtils';
import { miredToKelvin, kelvinToMired } from '../utils/colorConverter';
import GradientSlider from './GradientSlider.vue';

const props = defineProps<{
  room: HueRoom;
  loading: boolean;
}>();

const hueStore = useHueStore();

// Room state management
const roomState = reactive({
  on: props.room.state?.any_on || false,
  brightness: Math.max(1, props.room.action?.bri || 1),
  ct: props.room.action?.ct ? miredToKelvin(props.room.action.ct) : 2700,
  hue: 0,
  saturation: 0,
  color: '#ffffff',
  colormode: props.room.action?.colormode || 'ct',
  showColorControls: false
});

// Initialize hue and saturation if available
if (props.room.action?.xy && Array.isArray(props.room.action.xy) && props.room.action.xy.length === 2 && props.room.action.colormode === 'xy') {
  const [x, y] = props.room.action.xy;
  const hsValues = xyToHueSaturation(x, y);
  roomState.hue = hsValues.hue;
  roomState.saturation = hsValues.saturation;
} else if (props.room.action?.hue !== undefined && props.room.action?.sat !== undefined) {
  roomState.hue = props.room.action.hue;
  roomState.saturation = props.room.action.sat;
}

// Computed properties
const isInColorMode = computed(() => roomState.colormode === 'xy');
const isInCtMode = computed(() => roomState.colormode === 'ct');
const hasColorCapability = computed(() => props.room.action?.xy !== undefined || props.room.action?.hue !== undefined);
const hasCtCapability = computed(() => props.room.action?.ct !== undefined);
const hasBrightnessCapability = computed(() => props.room.action?.bri !== undefined);
const getBrightnessSliderColor = computed(() => {
  if (roomState.colormode === 'ct') {
    return ctToColor(roomState.ct);
  } else if (roomState.colormode === 'xy' || roomState.colormode === 'hs') {
    return hueToColor(roomState.hue);
  }
  return '#ffffff';
});

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

// Room control functions
async function toggleRoom() {
  try {
    await hueStore.updateRoomState(props.room.id, {
      on: roomState.on,
    });
  } catch (error) {
    console.error('Failed to toggle room:', error);
    roomState.on = !roomState.on;
  }
}

const debouncedUpdateBrightness = debounce(async () => {
  try {
    await hueStore.updateRoomState(props.room.id, {
      bri: roomState.brightness,
      colormode: roomState.colormode
    });
  } catch (error) {
    console.error('Failed to update brightness:', error);
  }
}, 100);

const debouncedUpdateColorTemp = debounce(async () => {
  try {
    await hueStore.updateRoomState(props.room.id, {
      ct: kelvinToMired(roomState.ct),
      colormode: 'ct'
    });
  } catch (error) {
    console.error('Failed to update color temperature:', error);
  }
}, 100);

const debouncedUpdateHue = debounce(async () => {
  try {
    const xy = hueAndSaturationToXy(roomState.hue, roomState.saturation);
    roomState.color = hueToColor(roomState.hue);
    await hueStore.updateRoomState(props.room.id, {
      xy: xy as [number, number],
      colormode: 'xy'
    });
  } catch (error) {
    console.error('Failed to update hue:', error);
  }
}, 100);

const debouncedUpdateSaturation = debounce(async () => {
  try {
    const xy = hueAndSaturationToXy(roomState.hue, roomState.saturation);
    roomState.color = hueToColor(roomState.hue);
    await hueStore.updateRoomState(props.room.id, {
      xy: xy as [number, number],
      colormode: 'xy'
    });
  } catch (error) {
    console.error('Failed to update saturation:', error);
  }
}, 100);

// Update functions
function updateBrightness() {
  debouncedUpdateBrightness();
}

function updateColorTemp() {
  debouncedUpdateColorTemp();
}

function updateHue() {
  debouncedUpdateHue();
}

function updateSaturation() {
  debouncedUpdateSaturation();
}

// Color mode switching
async function switchColorMode(mode: 'ct' | 'xy') {
  try {
    const state: any = {
      colormode: mode
    };
    
    if (mode === 'ct') {
      state.ct = kelvinToMired(roomState.ct);
      roomState.color = ctToColor(roomState.ct);
    } else {
      if (roomState.hue === undefined || roomState.hue === 0) {
        roomState.hue = 8000;
        roomState.saturation = 254;
      }
      const xy = hueAndSaturationToXy(roomState.hue, roomState.saturation);
      state.xy = xy;
      state.hue = roomState.hue;
      state.sat = roomState.saturation;
      roomState.color = hueToColor(roomState.hue);
    }
    
    await hueStore.updateRoomState(props.room.id, state);
  } catch (error) {
    console.error('Failed to switch color mode:', error);
  }
}

// Helper functions
function getRoomIcon(roomClass: string | undefined): string {
  if (!roomClass) return 'mdi-lightbulb';
  
  const iconMap: Record<string, string> = {
    'Living room': 'mdi-sofa',
    'Bedroom': 'mdi-bed',
    'Kitchen': 'mdi-stove',
    'Dining': 'mdi-silverware-variant',
    'Bathroom': 'mdi-shower',
    'Office': 'mdi-desk',
    'Hallway': 'mdi-door',
    'Toilet': 'mdi-toilet',
    'Staircase': 'mdi-stairs',
    'Kids bedroom': 'mdi-baby',
    'Gym': 'mdi-dumbbell',
    'Garage': 'mdi-garage',
    'Nursery': 'mdi-baby-carriage',
    'Recreation': 'mdi-gamepad-variant',
    'Garden': 'mdi-flower',
    'Laundry room': 'mdi-washing-machine',
    'Storage': 'mdi-package-variant-closed',
    'Other': 'mdi-lightbulb'
  };

  return iconMap[roomClass] || 'mdi-lightbulb';
}

function xyToHueSaturation(x: number, y: number): { hue: number; saturation: number } {
  const Y = 1.0;
  const X = (Y / y) * x;
  const Z = (Y / y) * (1 - x - y);

  const r = X * 3.2406 - Y * 1.5372 - Z * 0.4986;
  const g = -X * 0.9689 + Y * 1.8758 + Z * 0.0415;
  const b = X * 0.0557 - Y * 0.2040 + Z * 1.0570;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

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

  const s = max === 0 ? 0 : Math.min(1, delta / max);

  const hue = Math.round((h / 360) * 65535);
  const saturation = Math.round(s * 254);

  return { hue, saturation };
}

function hueAndSaturationToXy(hue: number, saturation: number): [number, number] {
  const h = (hue / 65535) * 360;
  const s = Math.min(254, Math.max(0, saturation)) / 254;
  
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

  const X = r * 0.664511 + g * 0.154324 + b * 0.162028;
  const Y = r * 0.283881 + g * 0.668433 + b * 0.047685;
  const Z = r * 0.000088 + g * 0.072310 + b * 0.986039;

  const sum = X + Y + Z;
  if (sum === 0) {
    return [0.5, 0.5];
  }

  return [X / sum, Y / sum];
}

// Watch for external room state changes
watch(() => props.room.state?.any_on, (newValue) => {
  if (newValue !== undefined) {
    roomState.on = newValue;
  }
});

watch(() => props.room.action, (newAction) => {
  if (newAction) {
    if (newAction.bri !== undefined) {
      roomState.brightness = Math.max(1, newAction.bri);
    }
    if (newAction.ct !== undefined) {
      roomState.ct = miredToKelvin(newAction.ct);
    }
    if (newAction.colormode) {
      roomState.colormode = newAction.colormode;
    }
    if (newAction.xy && Array.isArray(newAction.xy) && newAction.xy.length === 2) {
      const hsValues = xyToHueSaturation(newAction.xy[0], newAction.xy[1]);
      roomState.hue = hsValues.hue;
      roomState.saturation = hsValues.saturation;
      roomState.color = hueToColor(hsValues.hue);
    }
  }
}, { deep: true });
</script>

<style scoped>
.control-group {
  width: 100%;
  margin-bottom: 0;
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

.toggle-button {
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  min-width: 80px;
  height: 20px !important;
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
  margin-top: -2px;
}

/* Adjust card text padding */
.v-card-text {
  padding-bottom: 20px !important;
}

/* Adjust control group spacing */
.control-group + .control-group {
  margin-top: 12px !important;
}

.room-card {
  width: 100%;
  height: fit-content;
  min-width: 0; /* Prevents cards from overflowing on small screens */
}
</style> 