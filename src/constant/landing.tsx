import { Brain, HeartHandshake, ShieldCheck } from "lucide-react";

export const name = "Nova Star";

export const description =
  "An emotionally intelligent AI companion designed to strengthen\n connection, clarity, and communication — without replacing real human\nintimacy.";

const featureInfo = [
  {
    title: "Relationship-Aware",
    description:
      "Understands emotional context, communication patterns, and long-term relational growth.",
    icon: <HeartHandshake size={28} />,
  },
  {
    title: "Structured Memory",
    description:
      "Stores preferences and patterns — not raw conflicts — for healthy, balanced insight.",
    icon: <Brain size={28} />,
  },
  {
    title: "Private & Ethical",
    description:
      "Role-protected insights, transparency-first design, and autonomy-preserving AI behavior.",
    icon: <ShieldCheck size={28} />,
  },
];

export { featureInfo };
