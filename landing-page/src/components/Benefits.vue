<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { Sparkle, Blocks, LineChart, Wallet } from "lucide-vue-next";

interface BenefitsProps {
  icon: string;
  title: string;
  description: string;
}

const benefitList: BenefitsProps[] = [
  {
    icon: "sparkle",
    title: "Never lose context",
    description:
      "SessionSwitch snapshots every tab you touch—title, URL, favicon, and key content are all saved automatically.",
  },
  {
    icon: "blocks",
    title: "Sessions stay tidy",
    description:
      "Idle thresholds, duplicate checks, and auto-cleanups keep noisy one-off tabs from cluttering your workspace.",
  },
  {
    icon: "lineChart",
    title: "AI that understands flow",
    description:
      "Google ADK agents summarize, match, and label related tabs, so your sessions grow smarter with every switch.",
  },
  {
    icon: "wallet",
    title: "Privacy-first by design",
    description:
      "All data lives in chrome.storage.local by default, with an optional self-hosted FastAPI backend when you need it.",
  },
];

const iconMap: Record<string, typeof Sparkle | typeof Blocks | typeof LineChart | typeof Wallet> = {
  sparkle: Sparkle,
  blocks: Blocks,
  lineChart: LineChart,
  wallet: Wallet,
};
</script>

<template>
  <section
    id="benefits"
    class="container py-24 sm:py-32"
  >
    <div class="grid lg:grid-cols-2 place-items-center lg:gap-24">
      <div>
        <h2 class="text-lg text-primary mb-2 tracking-wider uppercase">
          Why teams love SessionSwitch
        </h2>

        <h2 class="text-3xl md:text-4xl font-bold mb-4">
          A smarter way to pause and resume deep work
        </h2>
        <p class="text-xl text-muted-foreground mb-8">
          Designed for researchers, PMs, and startup teams who live in 20+ tabs but refuse to lose
          momentum when context switches happen.
        </p>
      </div>

      <div class="grid lg:grid-cols-2 gap-4 w-full">
        <Card
          v-for="({ icon, title, description }, index) in benefitList"
          :key="title"
          class="bg-muted/50 dark:bg-card hover:bg-background dark:hover:bg-background transition-all delay-75 group/number"
        >
          <CardHeader>
            <div class="flex justify-between">
              <component
                class="size-8 mb-6 text-primary"
                :is="iconMap[icon]"
              />

              <span
                class="text-5xl text-muted-foreground/15 font-medium transition-all delay-75 group-hover/number:text-muted-foreground/30"
                >0{{ index + 1 }}</span
              >
            </div>

            <CardTitle>{{ title }}</CardTitle>
          </CardHeader>

          <CardContent class="text-muted-foreground">
            {{ description }}
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>
