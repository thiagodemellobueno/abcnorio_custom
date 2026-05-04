import { defineAction } from 'astro:actions';
import { z } from 'astro/zod';

export const server = {
    submitVolunteerForm: defineAction({
        accept: 'form',
        input: z.object({
            name: z.string().min(2),
            email: z.string().email(),
            message: z.string().min(30),
        }),
        handler: async (_input) => {
            return { success: true };
        }
    }),

    submitContactForm: defineAction({
        accept: 'form',
        input: z.object({
            name: z.string().min(2),
            email: z.string().email(),
            subject: z.string().min(2),
            message: z.string().min(30),
        }),
        handler: async (_input) => {
            return { success: true };
        }
    }),

    submitExhibitProposalForm: defineAction({
        accept: 'form',
        input: z.object({
            name: z.string().min(2),
            email: z.string().email(),
            exhibitTitle: z.string().min(2),
            exhibitDescription: z.string().min(30),
        }),
        handler: async (_input) => {
            return { success: true };
        }
    }),
}