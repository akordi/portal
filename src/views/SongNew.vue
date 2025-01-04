<script setup>
import { onMounted } from "vue";
import SongEdit from "@/views/SongEdit.vue";

onMounted(async () => { });
</script>

<template>
  <SongEdit :is-new="true"></SongEdit>
</template>
