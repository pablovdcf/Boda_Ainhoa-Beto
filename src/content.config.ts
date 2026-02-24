import { defineCollection, z } from "astro:content";

const agenda = defineCollection({
  type: "content",
  schema: z.object({
    order: z.number(),
    label: z.string().optional(),
    time: z.string(),
    title: z.string(),
    location: z.string().optional(),
    icon: z.string().optional(),
    kind: z.string().optional()
  })
});

const faq = defineCollection({
  type: "content",
  schema: z.object({
    question: z.string(),
    order: z.number()
  })
});

const recomendaciones = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    order: z.number(),
    category: z.string()
  })
});

const site = defineCollection({
  type: "data",
  schema: z.object({
    coupleNames: z.string(),
    heroEyebrow: z.string(),
    heroTitle: z.string(),
    heroDescription: z.string(),
    heroCtaLabel: z.string(),
    weddingDateIso: z.string(),
    weddingDateLabel: z.string(),
    venueLine: z.string(),
    venue: z.object({
      name: z.string(),
      address: z.string(),
      city: z.string(),
      mapUrl: z.string().url()
    }),
    story: z.object({
      title: z.string(),
      lead: z.string(),
      closing: z.string(),
      image: z.object({
        src: z.string(),
        alt: z.string(),
        width: z.number(),
        height: z.number()
      })
    }),
    location: z.object({
      title: z.string(),
      subtitle: z.string(),
      description: z.string(),
      photos: z.array(
        z.object({
          src: z.string(),
          alt: z.string(),
          width: z.number(),
          height: z.number()
        })
      )
    }),
    gallery: z.array(
      z.object({
        src: z.string(),
        alt: z.string(),
        width: z.number(),
        height: z.number()
      })
    ),
    footerNote: z.string(),
    faqTitle: z.string(),
    agendaTitle: z.string(),
    galleryTitle: z.string(),
    locationButtonLabel: z.string()
  })
});

export const collections = {
  agenda,
  faq,
  recomendaciones,
  site
};
