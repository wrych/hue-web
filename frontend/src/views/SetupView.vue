<template>
  <v-card class="mx-auto mt-4" max-width="600">
    <v-card-title class="text-h5">
      Hue Bridge Setup
    </v-card-title>

    <v-card-text>
      <v-stepper v-model="currentStep">
        <v-stepper-header>
          <v-stepper-item value="1">
            Discover Bridge
          </v-stepper-item>
          <v-stepper-divider></v-stepper-divider>
          <v-stepper-item value="2">
            Connect
          </v-stepper-item>
        </v-stepper-header>

        <v-stepper-window>
          <v-stepper-window-item value="1">
            <v-card-text>
              <p class="mb-4">Click the button below to discover your Hue Bridge on the network.</p>
              <v-btn
                color="primary"
                :loading="hueStore.isLoading"
                @click="discoverBridge"
              >
                Discover Bridge
              </v-btn>
              <div v-if="bridgeFound" class="mt-4">
                <v-alert type="success">
                  Bridge found at {{ hueStore.bridgeIp }}
                </v-alert>
                <v-btn
                  color="primary"
                  class="mt-4"
                  @click="currentStep = '2'"
                >
                  Next
                </v-btn>
              </div>
            </v-card-text>
          </v-stepper-window-item>

          <v-stepper-window-item value="2">
            <v-card-text>
              <p class="mb-4">Press the link button on your Hue Bridge, then click Connect.</p>
              <v-btn
                color="primary"
                :loading="hueStore.isLoading"
                @click="connectToBridge"
              >
                Connect
              </v-btn>
            </v-card-text>
          </v-stepper-window-item>
        </v-stepper-window>
      </v-stepper>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useHueStore } from '../stores/hue';

const router = useRouter();
const hueStore = useHueStore();
const currentStep = ref('1');

const bridgeFound = computed(() => !!hueStore.bridgeIp);

onMounted(async () => {
  await hueStore.init();
  if (hueStore.isConnected) {
    router.push('/rooms');
  }
});

async function discoverBridge() {
  try {
    await hueStore.discoverBridge();
  } catch (error) {
    // Handle error
    console.error('Failed to discover bridge:', error);
  }
}

async function connectToBridge() {
  try {
    await hueStore.registerUser();
    router.push('/rooms');
  } catch (error) {
    // Handle error
    console.error('Failed to connect to bridge:', error);
  }
}
</script> 