<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
const mode = useColorMode();

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-vue-next";
</script>

<template>
  <section id="hero" class="container">
    <div
      class="grid place-items-center lg:max-w-screen-xl gap-8 mx-auto py-20 md:py-32"
    >
      <div class="text-center space-y-8">
        <Badge variant="outline" class="text-sm py-2 px-4 gap-2 inline-flex items-center">
          <span class="mr-1 text-primary font-semibold uppercase tracking-wider text-xs">
            New
          </span>
          <span>Chrome extension + FastAPI backend</span>
        </Badge>

        <div
          class="max-w-screen-md mx-auto text-center text-5xl md:text-6xl font-bold"
        >
          <h1>
            Keep every browsing session
            <span
              class="text-transparent bg-gradient-to-r from-primary via-sky-400 to-emerald-300 bg-clip-text"
              >organized automatically.
            </span>
          </h1>
        </div>

        <p class="max-w-screen-sm mx-auto text-xl text-muted-foreground">
          SessionSwitch captures every tab, lets AI group related work, and re-launches full
          workflows on demand—without touching your bookmarks.
        </p>

        <div class="space-y-4 md:space-y-0 md:space-x-4">
          <Button as-child class="w-5/6 md:w-1/4 font-bold group/arrow">
            <a
              href="https://github.com/miyannishar/session-context#development-workflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              Install SessionSwitch
              <ArrowRight class="size-5 ml-2 group-hover/arrow:translate-x-1 transition-transform" />
            </a>
          </Button>

          <Button
            as-child
            variant="secondary"
            class="w-5/6 md:w-1/4 font-bold"
          >
            <a
              href="#how-it-works"
              >See how it works</a
            >
          </Button>
        </div>
      </div>

      <div class="relative group mt-14">
        <!-- gradient shadow -->
        <div
          class="absolute -top-6 right-12 w-[90%] h-12 lg:h-[80%] bg-primary/50 blur-3xl rounded-full img-shadow-animation"
        ></div>

        <img
          class="w-full md:w-[1200px] mx-auto rounded-lg relative rouded-lg leading-none flex items-center border border-t-2 border-t-primary/30 img-border-animation"
          :src="
            mode == 'light' ? 'hero-image-light.jpg' : 'hero-image-dark.jpg'
          "
          alt="SessionSwitch Chrome extension dashboard preview"
        />

        <!-- gradient effect img -->
        <div
          class="absolute bottom-0 left-0 w-full h-20 md:h-28 bg-gradient-to-b from-background/0 via-background/50 to-background rounded-lg"
        ></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.img-shadow-animation {
  animation-name: img-shadow-animation;
  animation-iteration-count: infinite;
  animation-duration: 2s;
  animation-timing-function: linear;
  animation-direction: alternate;
}

.img-border-animation {
  animation-name: img-border-animation;
  animation-iteration-count: infinite;
  animation-duration: 2s;
  animation-timing-function: linear;
  animation-direction: alternate;
}

@keyframes img-shadow-animation {
  from {
    opacity: 0.5;
    transform: translateY(30px);
  }

  to {
    opacity: 1;
    transform: translateY(0px);
  }
}
@keyframes img-border-animation {
  from {
    @apply border-t-primary/10;
  }

  to {
    @apply border-t-primary/60;
  }
}
</style>
