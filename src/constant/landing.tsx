import {
  Brain,
  HeartHandshake,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  BookOpen,
  Lightbulb,
  Users,
  Search,
} from "lucide-react";

export const name = "Nova Star";

export const tagline = "Your AI-Powered Relationship Companion";

export const description =
  "An emotionally intelligent AI companion designed to strengthen connection, clarity, and communication — without replacing real human intimacy.";

export const featureInfo = [
  {
    title: "Relationship-Aware",
    description:
      "Understands emotional context, communication patterns, and long-term relational growth.",
    icon: <HeartHandshake size={28} />,
  },
  {
    title: "Structured Memory",
    description:
      "Remembers preferences, patterns, and important details across all your conversations.",
    icon: <Brain size={28} />,
  },
  {
    title: "Private & Ethical",
    description:
      "Role-protected insights, transparency-first design, and autonomy-preserving AI behavior.",
    icon: <ShieldCheck size={28} />,
  },
  {
    title: "Personality Profiling",
    description:
      "Take a personality quiz or let Nova learn who you are over time through natural conversation.",
    icon: <Sparkles size={28} />,
  },
  {
    title: "Partner Connection",
    description:
      "Link with your partner for shared insights and mutual understanding powered by AI.",
    icon: <Users size={28} />,
  },
  {
    title: "Deep Thinking",
    description:
      "Nova can reason deeply about complex relationship dynamics and give thoughtful advice.",
    icon: <Lightbulb size={28} />,
  },
];

export const capabilityInfo = [
  {
    title: "Smart Conversations",
    description:
      "Chat naturally with Nova about anything — relationships, emotions, daily life, or deep questions.",
    icon: <MessageCircle size={24} />,
  },
  {
    title: "Cross-Chat Memory",
    description:
      "Nova remembers what matters across all conversations — preferences, dates, patterns, and insights.",
    icon: <BookOpen size={24} />,
  },
  {
    title: "Web Search",
    description:
      "Nova can search the web in real-time to find answers, articles, and resources for you.",
    icon: <Search size={24} />,
  },
  {
    title: "AI Personality Quiz",
    description:
      "Answer a few questions and Nova builds a detailed personality profile to personalize every interaction.",
    icon: <Sparkles size={24} />,
  },
];
