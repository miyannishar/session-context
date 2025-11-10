<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Check } from "lucide-vue-next";

enum PopularPlan {
  NO = 0,
  YES = 1,
}

interface PlanProps {
  title: string;
  popular: PopularPlan;
  priceLabel: string;
  billing: string;
  description: string;
  buttonText: string;
  benefitList: string[];
  buttonHref: string;
}

const plans: PlanProps[] = [
  {
    title: "Free",
    popular: PopularPlan.NO,
    priceLabel: "$0",
    billing: "Forever free",
    description: "Everything you need to capture and reopen sessions locally.",
    buttonText: "Read setup guide",
    buttonHref: "https://github.com/nisharmiya/session-context#quick-start-adk-server",
    benefitList: [
      "Manifest V3 Chrome extension",
      "Local chrome.storage persistence",
      "Manual snapshots & tab groups",
      "Open-source MIT license (coming soon)",
    ],
  },
  {
    title: "AI Orchestrated",
    popular: PopularPlan.YES,
    priceLabel: "Self-host",
    billing: "Bring your own keys",
    description: "Deploy the FastAPI + Google ADK backend for full agent magic.",
    buttonText: "Deploy backend",
    buttonHref: "https://github.com/nisharmiya/session-context/tree/main/adk_server",
    benefitList: [
      "Summarizer, matcher, labeler agents",
      "Serper web search integration",
      "Structured decision logging",
      "Docker & Render ready",
    ],
  },
  {
    title: "Managed Teams",
    popular: PopularPlan.NO,
    priceLabel: "Coming soon",
    billing: "Join the waitlist",
    description: "Hosted analytics, SSO, and policy packs for larger orgs.",
    buttonText: "Join waitlist",
    buttonHref: "mailto:hello@sessionswitch.dev",
    benefitList: [
      "SOC2-ready infrastructure",
      "Team-wide session insights",
      "Role-based access policies",
      "Live onboarding and support",
    ],
  },
];
</script>

<template>
  <section class="container py-24 sm:py-32">
    <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
      Pricing
    </h2>

    <h2 class="text-3xl md:text-4xl text-center font-bold mb-4">
      Open source by default. Pick your path.
    </h2>

    <h3 class="md:w-1/2 mx-auto text-xl text-center text-muted-foreground pb-14">
      Run SessionSwitch locally for free or plug into the self-hosted backend for AI-powered grouping.
      Managed plans are on the roadmap—join the list to shape them.
    </h3>

    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-4">
      <Card
        v-for="{
          title,
          popular,
          priceLabel,
          billing,
          description,
          buttonText,
          buttonHref,
          benefitList,
        } in plans"
        :key="title"
        :class="{
          'drop-shadow-xl shadow-black/10 dark:shadow-white/10 border-[1.5px] border-primary lg:scale-[1.1]':
            popular === PopularPlan?.YES,
        }"
      >
        <CardHeader>
          <CardTitle class="pb-2">
            {{ title }}
          </CardTitle>

          <CardDescription class="pb-4">{{ description }}</CardDescription>

          <div>
            <span class="text-3xl font-bold">{{ priceLabel }}</span>
            <span class="text-muted-foreground block text-base">{{ billing }}</span>
          </div>
        </CardHeader>

        <CardContent class="flex">
          <div class="space-y-4">
            <span
              v-for="benefit in benefitList"
              :key="benefit"
              class="flex"
            >
              <Check class="text-primary mr-2" />
              <h3>{{ benefit }}</h3>
            </span>
          </div>
        </CardContent>

        <CardFooter>
          <Button :variant="popular === PopularPlan?.NO ? 'secondary' : 'default'" class="w-full" as-child>
            <a :href="buttonHref" target="_blank" rel="noopener noreferrer">
              {{ buttonText }}
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  </section>
</template>
