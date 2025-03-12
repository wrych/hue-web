<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Hue Controller</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <v-container>
        <router-view></router-view>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
// Component logic will go here
</script>

<style>
/* Global styles */
html {
  overflow-y: auto;
}
</style> 