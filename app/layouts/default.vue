<script setup lang="ts">
useHead({
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=Inter:wght@300;400;500&display=swap',
    },
  ],
})
</script>

<template>
  <div class="app">
    <main class="container">
      <slot />
    </main>
    <footer class="footer">
      <p>
        Deployed with
        <a href="https://github.com/pomo-studio/terraform-aws-serverless-ssr" target="_blank" rel="noreferrer">terraform-aws-serverless-ssr</a>
        · {{ new Date().getFullYear() }}
      </p>
    </footer>
  </div>
</template>
