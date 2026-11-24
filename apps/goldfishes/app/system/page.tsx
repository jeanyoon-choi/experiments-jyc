import type { Metadata } from "next";
import GoldfishesSystem from "@/foundations/system";

export const metadata: Metadata = {
  title: "goldfishes system",
  description: "The map of Goldfishes: the devices, what passes between them, what is built and what is still asked.",
};

export default function GoldfishesSystemPage() {
  return <GoldfishesSystem />;
}
