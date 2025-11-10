<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

import { Star } from "lucide-vue-next";

interface ReviewProps {
  image: string;
  name: string;
  userName: string;
  comment: string;
  rating: number;
}

const reviewList: ReviewProps[] = [
  {
    image: "https://avatars.githubusercontent.com/u/10660468?v=4",
    name: "Neha Patel",
    userName: "Staff Product Manager",
    comment:
      "SessionSwitch is the first tool that makes Chrome feel like a second brain. I can stop pinning 30 tabs and still pick up research threads instantly.",
    rating: 5.0,
  },
  {
    image: "https://avatars.githubusercontent.com/u/21008916?v=4",
    name: "Jordan Rivera",
    userName: "Lead UX Researcher",
    comment:
      "The multi-agent grouping is magic. My competitive analysis sessions stay organized even when the team dumps links in Slack all day.",
    rating: 4.9,
  },

  {
    image: "https://avatars.githubusercontent.com/u/2502947?v=4",
    name: "Casey Long",
    userName: "Engineering Manager",
    comment:
      "We self-hosted the FastAPI backend in an afternoon. Our QA crew now snapshots every regression pass and can reopen the exact test suite with one click.",
    rating: 4.8,
  },
  {
    image: "https://avatars.githubusercontent.com/u/13185333?v=4",
    name: "Maya Gomez",
    userName: "Founding Designer",
    comment:
      "SessionSwitch keeps discovery work from spiraling. The auto-cleanup and suggested labels mean I spend zero time filing things manually.",
    rating: 5.0,
  },
];

const initials = (fullName: string) =>
  fullName
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
</script>

<template>
  <section
    id="testimonials"
    class="container py-24 sm:py-32"
  >
    <div class="text-center mb-8">
      <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
        Testimonials
      </h2>

      <h2 class="text-3xl md:text-4xl text-center font-bold mb-4">
        Loved by focus-driven teams
      </h2>
    </div>

    <Carousel
      :opts="{
        align: 'start',
      }"
      class="relative w-[80%] sm:w-[90%] lg:max-w-screen-xl mx-auto"
    >
      <CarouselContent>
        <CarouselItem
          v-for="review in reviewList"
          :key="review.name"
          class="md:basis-1/2 lg:basis-1/3"
        >
          <Card class="bg-muted/50 dark:bg-card">
            <CardContent class="pt-6 pb-0">
              <div class="flex gap-1 pb-6">
                <Star class="size-4 fill-primary text-primary" />
                <Star class="size-4 fill-primary text-primary" />
                <Star class="size-4 fill-primary text-primary" />
                <Star class="size-4 fill-primary text-primary" />
                <Star class="size-4 fill-primary text-primary" />
              </div>

              "{{ review.comment }}"
            </CardContent>

            <CardHeader>
              <div class="flex flex-row items-center gap-4">
                <Avatar>
                  <AvatarImage
                    :src="review.image"
                    :alt="review.name"
                  />
                  <AvatarFallback>
                    {{ initials(review.name) }}
                  </AvatarFallback>
                </Avatar>

                <div class="flex flex-col">
                  <CardTitle class="text-lg">{{ review.name }}</CardTitle>
                  <CardDescription>{{ review.userName }}</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </CarouselItem>
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  </section>
</template>
