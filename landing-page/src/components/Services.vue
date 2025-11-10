<script setup lang="ts">
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";

enum ProService {
  YES = 1,
  NO = 0,
}

interface ServiceProps {
  title: string;
  pro: ProService;
  description: string;
}

const serviceList: ServiceProps[] = [
  {
    title: "Automatic session capture",
    description:
      "Capture URL, title, favicon, and scrollable content the moment a tab loads or you refocus it.",
    pro: ProService.NO,
  },
  {
    title: "AI-assisted grouping",
    description:
      "Let multi-agent reasoning merge related research into one session without manual sorting.",
    pro: ProService.NO,
  },
  {
    title: "Manual snapshots & tab groups",
    description:
      "Save the current window with a label or reopen everything inside native Chrome tab groups.",
    pro: ProService.NO,
  },
  {
    title: "Self-hosted intelligence",
    description:
      "Bring your own FastAPI deployment with Google ADK and external search tools for enterprise control.",
    pro: ProService.YES,
  },
];
</script>

<template>
  <section
    id="services"
    class="container py-24 sm:py-32"
  >
    <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
      What’s included
    </h2>

    <h2 class="text-3xl md:text-4xl text-center font-bold mb-4">
      Everything you need to pause and resume work with confidence
    </h2>
    <h3 class="md:w-1/2 mx-auto text-xl text-center text-muted-foreground mb-8">
      SessionSwitch ships with production-ready defaults, and unlocks deeper intelligence when you
      connect the optional backend.
    </h3>
    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4"></div>

    <div
      class="grid sm:grid-cols-2 lg:grid-cols-2 gap-4 w-full lg:w-[60%] mx-auto"
    >
      <div
        v-for="{ title, description, pro } in serviceList"
        :key="title"
      >
        <Card class="bg-muted/60 dark:bg-card h-full relative">
          <CardHeader>
            <CardTitle>{{ title }}</CardTitle>
            <CardDescription>{{ description }}</CardDescription>
          </CardHeader>
          <Badge
            v-if="pro === ProService.YES"
            variant="secondary"
            class="absolute -top-2 -right-3"
            >PRO</Badge
          >
        </Card>
      </div>
    </div>
  </section>
</template>
