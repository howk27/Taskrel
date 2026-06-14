import Stripe from "stripe";
import { getConfiguredEnv } from "@/lib/env";

export function getStripe() {
  const secretKey = getConfiguredEnv("STRIPE_SECRET_KEY");
  if (!secretKey) return null;

  return new Stripe(secretKey, {
    apiVersion: "2025-02-24.acacia",
  });
}

export function requireStripe() {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured. Set STRIPE_SECRET_KEY.");
  }
  return stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, property, receiver) {
    return Reflect.get(requireStripe(), property, receiver);
  },
});
