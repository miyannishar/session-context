<script setup lang="ts">
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQProps {
  question: string;
  answer: string;
  value: string;
}

const FAQList: FAQProps[] = [
  {
    question: "Is SessionSwitch really free?",
    answer:
      "Yes. The Chrome extension and FastAPI backend are open source and free to run locally or self-host. A managed offering is on the roadmap but optional.",
    value: "item-1",
  },
  {
    question: "Does SessionSwitch send my browsing data to the cloud?",
    answer:
      "No data leaves your machine unless you opt into the AI backend. Even then, only the backend you deploy receives session metadata—you control the keys and hosting.",
    value: "item-2",
  },
  {
    question: "Which AI stack powers the session grouping?",
    answer:
      "We use Google's Agent Development Kit (ADK) to orchestrate summarizer, matcher, and labeler agents. The default model runs via LiteLLM, so you can swap providers easily.",
    value: "item-3",
  },
  {
    question: "How do I deploy the backend?",
    answer:
      "Install the `adk_server` dependencies, set your OPENAI and SERPER API keys, then run `uvicorn app.main:app --reload`. Render and Railway templates are coming soon.",
    value: "item-4",
  },
  {
    question: "Does it work offline?",
    answer:
      "Absolutely. The extension keeps capturing and managing sessions even when offline. AI grouping requires connectivity to whichever model provider you configure.",
    value: "item-5",
  },
];
</script>

<template>
  <section
    id="faq"
    class="container md:w-[700px] py-24 sm:py-32"
  >
    <div class="text-center mb-8">
      <h2 class="text-lg text-primary text-center mb-2 tracking-wider">FAQS</h2>

      <h2 class="text-3xl md:text-4xl text-center font-bold">
        Common Questions
      </h2>
    </div>

    <Accordion
      type="single"
      collapsible
      class="AccordionRoot"
    >
      <AccordionItem
        v-for="{ question, answer, value } in FAQList"
        :key="value"
        :value="value"
      >
        <AccordionTrigger class="text-left"> {{ question }} </AccordionTrigger>

        <AccordionContent>{{ answer }}</AccordionContent>
      </AccordionItem>
    </Accordion>

    <h3 class="font-medium mt-4">
      Still have questions?
      <a href="#contact" class="underline text-muted-foreground">Contact us</a>
    </h3>
  </section>
</template>
