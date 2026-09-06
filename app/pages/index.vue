<script setup lang="ts">
interface RenderData {
  time: string
  date: string
  timezone: string
  region: string
  regionName: string
  latency: number
  renderMode: string
  requestId: string
  coldStart: boolean
  counter: number
  version: string
}

useHead({
  title: 'Serverless SSR Proof | ssr.pomo.dev',
  meta: [{ name: 'description', content: 'A live server-side rendered page running on AWS Lambda, deployed with terraform-aws-serverless-ssr.' }],
})

const { data: pageData, refresh } = await useFetch<RenderData>('/api/render', {
  key: 'render-data',
  server: true,
})

const healthResult = ref('')
const healthLoading = ref(false)

const formatNumber = (num?: number) => {
  if (num === undefined) return '---'
  return new Intl.NumberFormat().format(num)
}

const testHealth = async () => {
  healthLoading.value = true
  healthResult.value = ''
  const start = performance.now()
  try {
    const res = await fetch('/api/health')
    const duration = Math.round(performance.now() - start)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    healthResult.value = `Health check from ${data.region} in ${duration}ms`
  } catch (err) {
    healthResult.value = `Error: ${err instanceof Error ? err.message : 'Unknown'}`
  } finally {
    healthLoading.value = false
  }
}

const refreshPage = () => {
  window.location.reload()
}
</script>

<template>
  <div>
    <section class="hero">
      <p class="label">Live infrastructure proof</p>
      <h1>This page was rendered <span>on AWS Lambda.</span></h1>
      <p>
        Every request is server-side rendered by a Nuxt/Nitro application running inside
        a Lambda function. Between requests, the function scales to zero. This page
        proves the architecture: it shows the serving region, render latency, and
        whether this invocation was a cold start.
      </p>

      <div class="path-diagram">
        <div class="path-node">
          <div class="node-name">You</div>
          <div class="node-detail">Browser</div>
        </div>
        <div class="path-node">
          <div class="node-name">CloudFront</div>
          <div class="node-detail">Edge cache</div>
        </div>
        <div class="path-node active">
          <div class="node-name">Lambda</div>
          <div class="node-detail">{{ pageData?.region || '...' }}</div>
        </div>
        <div class="path-node">
          <div class="node-name">Response</div>
          <div class="node-detail">SSR HTML</div>
        </div>
      </div>
    </section>

    <section class="metrics" aria-label="Render metrics">
      <div class="metric">
        <div class="metric-label">Rendered at</div>
        <div class="metric-value">{{ pageData?.time || '---' }}</div>
        <div class="metric-sub">{{ pageData?.date }} · {{ pageData?.timezone }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Serving region</div>
        <div class="metric-value">
          <span class="region-badge">
            <span class="status-dot" :class="{ cold: pageData?.coldStart }"></span>
            {{ pageData?.region || '---' }}
          </span>
        </div>
        <div class="metric-sub">{{ pageData?.regionName }}</div>
      </div>
      <div class="metric">
        <div class="metric-label">Render latency</div>
        <div class="metric-value">{{ pageData?.latency ?? '---' }}<span style="font-size:0.7em;color:var(--muted)">ms</span></div>
        <div class="metric-sub">Server-side generation time</div>
      </div>
      <div class="metric">
        <div class="metric-label">Invocation state</div>
        <div class="metric-value">{{ pageData?.coldStart ? 'Cold start' : 'Warm' }}</div>
        <div class="metric-sub">#{{ formatNumber(pageData?.counter) }} requests counted</div>
      </div>
    </section>

    <section aria-label="Diagnostics">
      <div class="metric" style="border-top: none; padding-top: 0;">
        <div class="metric-label">Request ID</div>
        <div class="metric-value"><code>{{ pageData?.requestId || '---' }}</code></div>
        <div class="metric-sub">Render mode: {{ pageData?.renderMode || '---' }} · Version: {{ pageData?.version || '---' }}</div>
      </div>

      <div class="actions">
        <button class="button" @click="refreshPage" :disabled="!pageData">Refresh page</button>
        <button class="button secondary" @click="testHealth" :disabled="healthLoading">
          {{ healthLoading ? 'Checking...' : 'Test health endpoint' }}
        </button>
      </div>
      <p v-if="healthResult" class="metric-sub" style="margin-top: 1rem;">{{ healthResult }}</p>
    </section>

    <section class="provenance">
      <h2>Created with Terraform</h2>
      <p>
        This site is deployed by the
        <code>terraform-aws-serverless-ssr</code> module. The same configuration
        produces a CloudFront distribution, Lambda functions in two regions, S3
        buckets for static assets, and a DynamoDB table for request counting.
      </p>
      <pre><code>module "ssr" {
  source  = "pomo-studio/serverless-ssr/aws"
  version = "~> 2.4"

  project_name = "pomo-ssr"
  domain_name  = "pomo.dev"
  subdomain    = "ssr"
}</code></pre>
      <div class="links">
        <a href="https://github.com/pomo-studio/pomo-ssr/blob/main/docs/GETTING-STARTED.md" target="_blank" rel="noreferrer">Deploy your own copy ↗</a>
        <a href="https://github.com/pomo-studio/terraform-aws-serverless-ssr" target="_blank" rel="noreferrer">GitHub</a>
        <a href="https://registry.terraform.io/modules/pomo-studio/serverless-ssr/aws" target="_blank" rel="noreferrer">Terraform Registry</a>
        <NuxtLink to="/about">About this demo</NuxtLink>
      </div>
    </section>
  </div>
</template>
