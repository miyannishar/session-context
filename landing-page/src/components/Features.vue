<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  TabletSmartphone,
  BadgeCheck,
  Goal,
  PictureInPicture,
  MousePointerClick,
  Newspaper,
} from "lucide-vue-next";

interface FeaturesProps {
  icon: string;
  title: string;
  description: string;
}

const featureList: FeaturesProps[] = [
  {
    icon: "tabletSmartphone",
    title: "Chrome-native capture",
    description:
      "Runs quietly as a Manifest V3 service worker, logging every tab change with zero performance hit.",
  },
  {
    icon: "goal",
    title: "Agent orchestration",
    description:
      "Summarizer, matcher, and labeler agents coordinate through Google ADK to keep sessions cohesive.",
  },
  {
    icon: "badgeCheck",
    title: "Accurate session labels",
    description:
      "Concise labels are generated automatically so you can scan and relaunch entire flows in seconds.",
  },
  {
    icon: "mousePointerClick",
    title: "One-click resume",
    description:
      "Open all tabs, spawn Chrome tab groups, or snapshot your current window right from the popup.",
  },
  {
    icon: "pictureInPicture",
    title: "Optional FastAPI backend",
    description:
      "Ship with a production-ready FastAPI service that you can self-host or run locally for deeper context.",
  },
  {
    icon: "newspaper",
    title: "Structured storage",
    description:
      "chrome.storage.local keeps data on-device, while JSON schemas ensure every decision is explainable.",
  },
];

const iconMap: Record<
  string,
  | typeof TabletSmartphone
  | typeof BadgeCheck
  | typeof Goal
  | typeof PictureInPicture
  | typeof MousePointerClick
  | typeof Newspaper
> = {
  tabletSmartphone: TabletSmartphone,
  badgeCheck: BadgeCheck,
  goal: Goal,
  pictureInPicture: PictureInPicture,
  mousePointerClick: MousePointerClick,
  newspaper: Newspaper,
};
</script>

<template>
  <section
    id="features"
    class="container py-24 sm:py-32"
  >
    <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
      Features
    </h2>

    <h2 class="text-3xl md:text-4xl text-center font-bold mb-4">
      Built for the way focus work really happens
    </h2>

    <h3 class="md:w-1/2 mx-auto text-xl text-center text-muted-foreground mb-8">
      From background capture to AI-driven regrouping, SessionSwitch connects your browser, backend,
      and workflow so you can context switch without losing your place.
    </h3>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="{ icon, title, description } in featureList"
        :key="title"
      >
        <Card class="h-full bg-background border-0 shadow-none">
          <CardHeader class="flex justify-center items-center">
            <div
              class="bg-primary/20 p-2 rounded-full ring-8 ring-primary/10 mb-4"
            >
              <component
                :is="iconMap[icon]"
                class="size-6 text-primary"
              />
            </div>

            <CardTitle>
              {{ title }}
            </CardTitle>
          </CardHeader>

          <CardContent class="text-muted-foreground text-center">
            {{ description }}
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped></style>
