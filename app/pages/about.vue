<script setup lang="ts">
useHead({
  title: 'About | ssr.pomo.dev',
  meta: [{ name: 'description', content: 'What this serverless SSR demo proves and how it is built.' }],
})
</script>

<template>
  <div class="about-section">
    <p class="label" style="margin-bottom: 1rem;">About this demo</p>
    <h1>A live proof of serverless SSR on AWS.</h1>
    <p>
      This site is not a static page. Every HTML response is generated on demand by a
      Nuxt/Nitro application running inside an AWS Lambda function. The function is
      invoked through a CloudFront origin group that routes around regional failures.
    </p>
    <p>What the homepage demonstrates:</p>
    <ul>
      <li><strong>Server-side rendering:</strong> the timestamp, region, and request ID are generated at request time.</li>
      <li><strong>Scale to zero:</strong> when traffic stops, the Lambda function is idle and costs nothing until the next request.</li>
      <li><strong>Cold-start visibility:</strong> the page reports whether this invocation reused a warm container or started a new one.</li>
      <li><strong>Regional serving:</strong> the page shows which AWS region rendered the response.</li>
      <li><strong>Infrastructure as code:</strong> the entire stack is defined in the terraform-aws-serverless-ssr module.</li>
    </ul>
    <p>
      The DynamoDB counter is a small stateful addition: it increments on every render
      so you can see the page has been invoked repeatedly, even though the compute
      itself is ephemeral.
    </p>
    <NuxtLink to="/" class="back-link">← Back to live proof</NuxtLink>
  </div>
</template>
