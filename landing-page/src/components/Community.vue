<script setup lang="ts">
import {
  Card,
  CardHeader,
  CardTitle,
  CardFooter,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Github } from "lucide-vue-next";
</script>

<template>
  <section
    id="community"
    class="py-12"
  >
    <hr />
    <div class="container py-20 sm:py-20">
      <div class="lg:w-[60%] mx-auto">
        <Card
          class="bg-background shadow-none text-center flex flex-col items-center justify-center border-0"
        >
          <CardHeader>
            <CardTitle class="text-4xl md:text-5xl font-bold">
              <Github class="w-20 h-20 m-auto mb-4" />
              Ready to join the
              <span
                class="text-transparent bg-gradient-to-r from-primary via-sky-400 to-emerald-300 bg-clip-text"
              >
                SessionSwitch community?
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent class="lg:w-[80%] text-xl text-muted-foreground">
            Star the repo, open an issue, or drop a PR. We welcome telemetry ideas, agent tweaks, and
            new workflows from teams living in their browser.
          </CardContent>

          <CardFooter>
            <Button as-child>
              <a
                href="https://github.com/nisharmiya/session-context"
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit GitHub
              </a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
    <hr />
  </section>
</template>
