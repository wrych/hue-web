<template>
  <div class="gradient-slider">
    <div class="slider-track" ref="track" @mousedown="startDragging" @touchstart="startDragging">
      <div class="slider-background" :style="backgroundStyle"></div>
      <div class="slider-thumb" :style="thumbStyle"></div>
    </div>
    <span v-if="showValue" class="value-display">{{ formattedValue }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { ctToColor } from '../utils/colorUtils';

const props = defineProps<{
  modelValue: number;
  min: number;
  max: number;
  type: 'hue' | 'saturation' | 'brightness' | 'temperature';
  baseColor?: string;  // Required for saturation and brightness
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const track = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const localValue = ref(props.modelValue);

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue;
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

const debouncedEmit = debounce((value: number) => {
  emit('update:modelValue', value);
}, 100);

const backgroundStyle = computed(() => {
  switch (props.type) {
    case 'hue':
      return {
        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
      };
    case 'saturation':
      return {
        background: `linear-gradient(to right, #ffffff, ${props.baseColor || '#ff0000'})`
      };
    case 'brightness':
      return {
        background: `linear-gradient(to right, #000000, ${props.baseColor || '#ffffff'})`
      };
    case 'temperature':
      return {
        background: `linear-gradient(to right, ${ctToColor(2000)}, ${ctToColor(4000)}, ${ctToColor(6500)})`
      };
    default:
      return {};
  }
});

const thumbStyle = computed(() => {
  const percentage = ((localValue.value - props.min) / (props.max - props.min)) * 100;
  return {
    left: `${percentage}%`
  };
});

const formattedValue = computed(() => {
  if (props.valueFormatter) {
    return props.valueFormatter(localValue.value);
  }
  return localValue.value.toString();
});

function updateValue(clientX: number) {
  if (!track.value) return;

  const rect = track.value.getBoundingClientRect();
  const percentage = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  const newValue = Math.round(props.min + percentage * (props.max - props.min));
  
  // Update local value immediately for smooth UI
  localValue.value = newValue;
  // Debounce the emit to parent
  debouncedEmit(newValue);
}

function startDragging(event: MouseEvent | TouchEvent) {
  isDragging.value = true;
  updateValue('touches' in event ? event.touches[0].clientX : event.clientX);

  window.addEventListener('mousemove', handleDragging);
  window.addEventListener('touchmove', handleDragging);
  window.addEventListener('mouseup', stopDragging);
  window.addEventListener('touchend', stopDragging);
}

function handleDragging(event: MouseEvent | TouchEvent) {
  if (!isDragging.value) return;
  event.preventDefault();
  updateValue('touches' in event ? event.touches[0].clientX : event.clientX);
}

function stopDragging() {
  isDragging.value = false;
  window.removeEventListener('mousemove', handleDragging);
  window.removeEventListener('touchmove', handleDragging);
  window.removeEventListener('mouseup', stopDragging);
  window.removeEventListener('touchend', stopDragging);
}

onUnmounted(() => {
  stopDragging();
});
</script>

<style scoped>
.gradient-slider {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.slider-track {
  position: relative;
  height: 24px;
  flex-grow: 1;
  border-radius: 12px;
  cursor: pointer;
  overflow: hidden;
}

.slider-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.slider-thumb {
  position: absolute;
  top: 0;
  width: 4px;
  height: 100%;
  background: white;
  box-shadow: 0 0 4px rgba(0, 0, 0, 0.2);
  transform: translateX(-50%);
  pointer-events: none;
}

.value-display {
  min-width: 4em;
  text-align: right;
  font-size: 0.875rem;
}
</style> 