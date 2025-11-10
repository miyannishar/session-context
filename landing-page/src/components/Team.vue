<script setup lang="ts">
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";

import { Linkedin, Github, Twitter } from "lucide-vue-next";

interface TeamProps {
  imageUrl: string;
  firstName: string;
  lastName: string;
  positions: string[];
  socialNetworks: SocialNetworkProps[];
}

interface SocialNetworkProps {
  name: string;
  url: string;
}

const teamList: TeamProps[] = [
  {
    imageUrl: "/profile.JPG",
    firstName: "Nishar",
    lastName: "Miya",
    positions: ["AI Engineer @ Dayos"],
    socialNetworks: [
      {
        name: "Github",
        url: "https://github.com/miyannishar",
      },
      {
        name: "LinkedIn",
        url: "https://www.linkedin.com/in/nishar-miya/",
      },
    ],
  },
];

const socialIcon = (socialName: string) => {
  switch (socialName) {
    case "LinkedIn":
      return Linkedin;
    case "Github":
      return Github;
    case "X":
      return Twitter;
  }
};
</script>

<template>
  <section
    id="team"
    class="container lg:w-[75%] py-24 sm:py-32"
  >
    <div class="text-center mb-8">
      <h2 class="text-lg text-primary text-center mb-2 tracking-wider uppercase">
        Maintainers
      </h2>

      <h2 class="text-3xl md:text-4xl text-center font-bold">
        The folks growing SessionSwitch
      </h2>
    </div>

    <div class="grid grid-cols-1 gap-8 place-items-center">
      <Card
        v-for="{
          imageUrl,
          firstName,
          lastName,
          positions,
          socialNetworks,
        } in teamList"
        :key="imageUrl"
        class="bg-muted/60 dark:bg-card flex flex-col h-full overflow-hidden group/hoverimg max-w-sm w-full"
      >
        <CardHeader class="p-0 gap-0">
          <div class="h-full overflow-hidden">
            <img
              :src="imageUrl"
              alt=""
              class="w-full aspect-square object-cover saturate-0 transition-all duration-200 ease-linear size-full group-hover/hoverimg:saturate-100 group-hover/hoverimg:scale-[1.01]"
            />
          </div>
          <CardTitle class="py-6 pb-4 px-6"
            >{{ firstName }}
            <span class="text-primary">{{ lastName }}</span>
          </CardTitle>
        </CardHeader>

        <CardContent
          v-for="(position, index) in positions"
          :key="index"
          :class="{
            'pb-0 text-muted-foreground ': true,
            'pb-4': index === positions.length - 1,
          }"
        >
          {{ position }}<span v-if="index < positions.length - 1">,</span>
        </CardContent>

        <CardFooter class="space-x-4 mt-auto">
          <a
            v-for="{ name, url } in socialNetworks"
            key="name"
            :href="url"
            target="_blank"
            class="hover:opacity-80 transition-all"
            :aria-label="`Visit our ${name} page`"
          >
            <component :is="socialIcon(name)" />
          </a>
        </CardFooter>
      </Card>
    </div>
  </section>
</template>
