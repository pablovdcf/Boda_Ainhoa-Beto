import { defineCollection, z } from "astro:content";

const agenda = defineCollection({
  type: "content",
  schema: z.object({
    order: z.number().optional(),
    title: z.string().optional(),
    time: z.string().optional()
  })
});

const faq = defineCollection({
  type: "content",
  schema: z.object({
    question: z.string().optional()
  })
});

const recomendaciones = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string().optional()
  })
});

const site = defineCollection({
  type: "data",
  schema: z.object({
    title: z.string().optional()
  })
});

export const collections = {
  agenda,
  faq,
  recomendaciones,
  site
};

