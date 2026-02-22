<script setup>
import { ref, onMounted } from 'vue'

const code = ref('')
const message = ref('')
const orderId = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  code.value = params.get('code')
  message.value = params.get('message')
  orderId.value = params.get('orderId')
})
</script>

<template>
  <div class="container">
    <h2>❌ 결제 실패</h2>

    <p>code: {{ code }}</p>
    <p>message: {{ message }}</p>
    <p>orderId: {{ orderId }}</p>

    <button @click="goBack">다시 결제</button>
  </div>
</template>

<script>
export default {
  methods: {
    goBack() {
      window.history.back()
    }
  }
}
</script>
