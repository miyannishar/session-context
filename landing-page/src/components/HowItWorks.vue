<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface HowItWorksProps {
  badgeTitle: string;
  title: string;
  description: string;
  image: string;
}

const HowItWorksList: HowItWorksProps[] = [
  {
    badgeTitle: "Install",
    title: "Load SessionSwitch in Chrome",
    description:
      "Clone the repo, head to chrome://extensions, enable Developer Mode, and load the session-context directory. Optional: boot the FastAPI backend for AI grouping.",
    image: "roboto.png",
  },
  {
    badgeTitle: "Capture",
    title: "Browse like you always do",
    description:
      "The background service worker watches for tab changes, pulls key page content, and stores everything locally without slowing you down.",
    image: "runner.png",
  },
  {
    badgeTitle: "Organize",
    title: "Agents tidy your sessions",
    description:
      "Summaries run, duplicates drop, and matcher logic decides whether to merge, create new, or ignore using generous similarity thresholds.",
    image: "pacheco.png",
  },
  {
    badgeTitle: "Resume",
    title: "Relaunch with the popup",
    description:
      "Open the popup to reopen entire sessions, spin up tab groups, or snapshot your current flow before moving on.",
    image: "gamestation.png",
  },
];
</script>

<template>
  <section
    id="how-it-works"
    class="container py-24 sm:py-32"
  >
    <div class="text-center mb-8">
      <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
        How It Works
      </h2>

      <h2 class="text-3xl md:text-4xl text-center font-bold">
        Step-by-Step Process
      </h2>
    </div>

    <div class="lg:w-[80%] mx-auto relative">
      <div
        v-for="(
          { badgeTitle, title, description, image }, index
        ) in HowItWorksList"
        :key="title"
        :class="[
          'flex mb-8 items-center',
          { ' flex-row-reverse': index % 2 !== 0 },
        ]"
      >
        <Card class="h-full bg-transparent border-0 shadow-none">
          <CardHeader>
            <div class="pb-4">
              <Badge>{{ badgeTitle }}</Badge>
            </div>

            <CardTitle>
              {{ title }}
            </CardTitle>
          </CardHeader>

          <CardContent class="text-muted-foreground w-[80%]">
            {{ description }}
          </CardContent>
        </Card>

        <img
          :src="image"
          :alt="`Image describing ${title} `"
          className="w-[150px]  md:w-[250px] lg:w-[300px] mx-auto -scale-x-100 "
        />
        <div
          :class="[
            '-z-10 absolute right-0 w-44 h-72  lg:w-64 lg:h-80 rounded-full bg-primary/15 dark:bg-primary/10 blur-3xl',
            {
              'left-0': index % 2 !== 0,
            },
          ]"
        ></div>
      </div>
    </div>
  </section>
</template>
