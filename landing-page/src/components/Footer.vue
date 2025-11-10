<script setup lang="ts">
import { ChevronsDown } from "lucide-vue-next";
import Separator from "./ui/separator/Separator.vue";
</script>

<template>
  <footer
    id="footer"
    class="container py-24 pb-16 sm:py-32 sm:pb-24"
  >
    <div class="p-10 bg-muted/50 dark:bg-card border rounded-2xl">
      <div
        class="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-x-12 gap-y-8"
      >
        <div class="col-span-full xl:col-span-2">
          <a
            href="#hero"
            class="flex font-bold items-center"
          >
            <ChevronsDown
              class="bg-gradient-to-tr from-primary via-primary/70 to-primary rounded-lg w-9 h-9 mr-2 border text-white"
            />

            <h3 class="text-2xl">SessionSwitch</h3>
          </a>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class="font-bold text-lg">Contact</h3>
          <div>
            <a
              href="mailto:hello@sessionswitch.dev"
              class="opacity-60 hover:opacity-100"
            >
              Email
            </a>
          </div>

          <div>
            <a
              href="https://github.com/miyannishar/session-context"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </div>

          <div>
            <a
              href="https://github.com/miyannishar/session-context/discussions"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discussions
            </a>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class="font-bold text-lg">Platforms</h3>
          <div>
            <a
              href="https://developer.chrome.com/docs/extensions/"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chrome
            </a>
          </div>

          <div>
            <a
              href="https://fastapi.tiangolo.com/"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              FastAPI
            </a>
          </div>

          <div>
            <a
              href="https://github.com/google-deepmind/agent-development-kit"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google ADK
            </a>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class="font-bold text-lg">Help</h3>
          <div>
            <a
              href="#contact"
              class="opacity-60 hover:opacity-100"
            >
              Contact Us
            </a>
          </div>

          <div>
            <a
              href="#faq"
              class="opacity-60 hover:opacity-100"
            >
              FAQ
            </a>
          </div>

          <div>
            <a
              href="https://github.com/miyannishar/session-context/issues/new/choose"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback
            </a>
          </div>
        </div>

        <div class="flex flex-col gap-2">
          <h3 class="font-bold text-lg">Socials</h3>
          <div>
            <a
              href="https://x.com"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              X (Twitter)
            </a>
          </div>

          <div>
            <a
              href="https://www.linkedin.com/company/sessionswitch"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>

          <div>
            <a
              href="https://www.youtube.com"
              class="opacity-60 hover:opacity-100"
              target="_blank"
              rel="noopener noreferrer"
            >
              YouTube
            </a>
          </div>
        </div>
      </div>

      <Separator class="my-6" />
      <section>
        <h3>
          &copy; {{ new Date().getFullYear() }} SessionSwitch. Crafted by the community.
        </h3>
      </section>
    </div>
  </footer>
</template>
