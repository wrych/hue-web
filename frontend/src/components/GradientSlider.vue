<template>
  <div class="gradient-slider">
    <v-slider
      v-model="localValue"
      :min="min"
      :max="max"
      :step="1"
      :loading="loading"
      :color="sliderColor"
      :track-color="trackColor"
      :thumb-color="thumbColor"
      :thumb-size="24"
      :track-size="20"
      density="comfortable"
      hide-details
      @update:modelValue="debouncedUpdate"
    >
    </v-slider>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue';
import { hueToColor, ctToColor } from '../utils/colorUtils';

const props = withDefaults(defineProps<{
  modelValue: number;
  min: number;
  max: number;
  type?: 'brightness' | 'temperature' | 'hue' | 'saturation';
  baseColor?: string;
  loading?: boolean;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}>(), {
  type: 'brightness',
  baseColor: '#ffffff',
  loading: false,
  showValue: false
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const localValue = ref(props.modelValue);
const isFocused = ref(false);
let updateTimeout: number | undefined;

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue;
});

// Clean up any pending timeouts
onUnmounted(() => {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
});

const sliderColor = computed(() => {
  return 'primary';
});

const thumbColor = computed(() => {
  switch (props.type) {
    case 'hue':
      return hueToColor(localValue.value);
    case 'saturation':
      return props.baseColor;
    case 'temperature':
      return ctToColor(localValue.value);
    case 'brightness':
      // For brightness, interpolate between black and baseColor
      const brightness = localValue.value / props.max;
      return props.baseColor;
    default:
      return 'primary';
  }
});

const trackColor = computed(() => {
  switch (props.type) {
    case 'brightness':
      return `linear-gradient(to right, black, ${props.baseColor})`;
    case 'temperature':
      return `linear-gradient(to right, ${ctToColor(2000)}, ${ctToColor(4000)}, ${ctToColor(6500)})`;
    case 'hue':
      return 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)';
    case 'saturation':
      return `linear-gradient(to right, #ffffff, ${props.baseColor})`;
    default:
      return undefined;
  }
});

const debouncedUpdate = (value: number) => {
  if (updateTimeout) {
    clearTimeout(updateTimeout);
  }
  
  // Update local value immediately for smooth UI
  localValue.value = value;
  
  // Debounce the emit to parent
  updateTimeout = window.setTimeout(() => {
    emit('update:modelValue', value);
  }, 100) as unknown as number;
};
</script>

<style scoped>
.gradient-slider {
  padding: 0 12px;
  position: relative;
}

:deep(.v-slider-track__background) {
  background: v-bind(trackColor) !important;
  opacity: 1 !important;
  border-radius: 10px !important;
}

:deep(.v-slider-track__fill) {
  background: transparent !important;
}

:deep(.v-slider-thumb) {
  width: 24px !important;
  height: 24px !important;
}

:deep(.v-slider-thumb__surface) {
  border: 2px solid white !important;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
  background-color: v-bind(thumbColor) !important;
  width: 100% !important;
  height: 100% !important;
  border-radius: 6px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  cursor: pointer !important;
  transition: background-color 0.2s ease !important;
}

:deep(.v-slider-thumb__surface:hover) {
  transform: scale(1.05) !important;
}

@media (max-width: 600px) {
  :deep(.v-slider-track__container) {
    height: 20px !important;
  }

  :deep(.v-slider-thumb) {
    width: 24px !important;
    height: 24px !important;
  }
}
</style> 