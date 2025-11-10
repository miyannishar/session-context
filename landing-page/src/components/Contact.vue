<script setup lang="ts">
import { reactive } from "vue";
import { Button } from "./ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "./ui/card";
import { Label } from "./ui/label";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";

import { Building2, Phone, Mail, Clock } from "lucide-vue-next";

interface ContactFormeProps {
  firstName: string;
  lastName: string;
  email: string;
  subject: string;
  message: string;
}

const contactForm = reactive<ContactFormeProps>({
  firstName: "",
  lastName: "",
  email: "",
  subject: "Integration support",
  message: "",
});

const handleSubmit = () => {
  const { firstName, lastName, email, subject, message } = contactForm;
  const mailToLink = `mailto:hello@sessionswitch.dev?subject=${encodeURIComponent(
    `[SessionSwitch] ${subject}`
  )}&body=${encodeURIComponent(
    `Hello SessionSwitch team,\n\nI'm ${firstName} ${lastName} (${email}).\n\n${message}\n\n`
  )}`;

  window.location.href = mailToLink;
};
</script>

<template>
  <section
    id="contact"
    class="container py-24 sm:py-32"
  >
    <section class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div>
        <div class="mb-4">
          <h2 class="text-lg text-primary mb-2 tracking-wider">Contact</h2>

          <h2 class="text-3xl md:text-4xl font-bold">Connect With Us</h2>
        </div>
        <p class="mb-8 text-muted-foreground lg:w-5/6">
          Questions about the Chrome extension, backend deployment, or contributing? Drop us a line
          and we’ll get back within one business day.
        </p>

        <div class="flex flex-col gap-4">
          <div>
            <div class="flex gap-2 mb-1">
              <Building2 />
              <div class="font-bold">Find us</div>
            </div>

            <div>Remote-first across North America & India</div>
          </div>

          <div>
            <div class="flex gap-2 mb-1">
              <Phone />
              <div class="font-bold">Community chat</div>
            </div>

            <div>
              Join the discussions on
              <a
                class="underline"
                href="https://github.com/nisharmiya/session-context/discussions"
                target="_blank"
                rel="noopener noreferrer"
                >GitHub Discussions</a
              >
            </div>
          </div>

          <div>
            <div class="flex gap-2 mb-1">
              <Mail />
              <div class="font-bold">Mail us</div>
            </div>

            <div>hello@sessionswitch.dev</div>
          </div>

          <div>
            <div class="flex gap-2">
              <Clock />
              <div class="font-bold">Office hours</div>
            </div>

            <div>
              <div>Monday – Friday</div>
              <div>9AM – 5PM PT</div>
            </div>
          </div>
        </div>
      </div>

      <!-- form -->
      <Card class="bg-muted/60 dark:bg-card">
        <CardHeader class="text-primary text-2xl"> </CardHeader>
        <CardContent>
          <form
            @submit.prevent="handleSubmit"
            class="grid gap-4"
          >
            <div class="flex flex-col md:flex-row gap-8">
              <div class="flex flex-col w-full gap-1.5">
                <Label for="first-name">First Name</Label>
                <Input
                  id="first-name"
                  type="text"
                  placeholder="Alex"
                  v-model="contactForm.firstName"
                />
              </div>

              <div class="flex flex-col w-full gap-1.5">
                <Label for="last-name">Last Name</Label>
                <Input
                  id="last-name"
                  type="text"
                  placeholder="Jordan"
                  v-model="contactForm.lastName"
                />
              </div>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                v-model="contactForm.email"
              />
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="subject">Subject</Label>

              <Select v-model="contactForm.subject">
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="Integration support">
                      Integration support
                    </SelectItem>
                    <SelectItem value="Backend deployment">
                      Backend deployment
                    </SelectItem>
                    <SelectItem value="Contribute">
                      Contribute
                    </SelectItem>
                    <SelectItem value="Partnerships">
                      Partnerships
                    </SelectItem>
                    <SelectItem value="Other"> Other </SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div class="flex flex-col gap-1.5">
              <Label for="message">Message</Label>
              <Textarea
                id="message"
                placeholder="Tell us how we can help..."
                rows="5"
                v-model="contactForm.message"
              />
            </div>

            <Button class="mt-4">Send message</Button>
          </form>
        </CardContent>

        <CardFooter></CardFooter>
      </Card>
    </section>
  </section>
</template>
