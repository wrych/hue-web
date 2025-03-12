<template>
  <div class="d-flex align-center">
    <v-icon :size="iconSize" class="mr-4">{{ icon }}</v-icon>
    <v-slider
      v-model="localValue"
      :loading="loading"
      :min="min"
      :max="max"
      :step="step"
      @update:modelValue="updateValue"
      hide-details
      class="flex-grow-1"
      :color="color"
      :track-color="trackColor"
    ></v-slider>
    <span class="text-body-2 ml-4" :style="{ minWidth: valueWidth }">
      {{ formatValue(localValue) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { debounce } from '../utils/debounce';

const props = defineProps<{
  modelValue: number;
  loading?: boolean;
  icon: string;
  min: number;
  max: number;
  step?: number;
  iconSize?: number;
  color?: string;
  trackColor?: string;
  valueWidth?: string;
  valueFormat?: (value: number) => string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void;
}>();

const localValue = ref(props.modelValue);

// Watch for external changes
watch(() => props.modelValue, (newValue) => {
  localValue.value = newValue;
});

// Debounced update function
const debouncedUpdate = debounce((value: number) => {
  emit('update:modelValue', value);
}, 100);

function updateValue(value: number) {
  debouncedUpdate(value);
}

function formatValue(value: number): string {
  if (props.valueFormat) {
    return props.valueFormat(value);
  }
  return `${value}`;
}
</script>

<style scoped>
.v-slider {
  margin: 0 !important;
}
</style> 