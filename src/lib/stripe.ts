import { loadStripe } from "@stripe/stripe-js";

const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "pk_live_51TOgh7JwFZnHiYqfLqnwpNHfG0krpc8ZYbi95cp6UeIm7UzdqwBMu6DhMz2uIK60pRrJW6hF6DR14JNlEQWpcT8500yHgrPu3c";

export const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;
export const getStripe = () => stripePromise;