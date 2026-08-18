export interface GigBuilderInput {
  brief: string;
  category: string;
  skills: string[];
  targetClient?: string;
  tone: "professional" | "friendly" | "premium" | "fast";
  startingPrice: number;
  currency?: string;
}

export interface GeneratedGigPackage {
  name: string;
  price: number;
  timeline: string;
  description: string;
  deliverables: string[];
}

export interface GeneratedGigDraft {
  title: string;
  summary: string;
  description: string;
  category: string;
  skills: string[];
  startingPrice: number;
  currency: string;
  deliverables: string[];
  packages: GeneratedGigPackage[];
  process: string[];
  faq: { question: string; answer: string }[];
  keywords: string[];
  serviceAngle: string;
}

const archetypes = {
  web: {
    signals: ["web", "website", "landing", "frontend", "next", "react", "seo"],
    label: "Website & Web App",
    outcomes: ["conversion-ready", "SEO-friendly", "fast-loading"],
    deliverables: [
      "Responsive landing page atau web app flow",
      "Component UI yang reusable",
      "Basic SEO metadata dan performance pass",
      "Deployment-ready source handoff",
    ],
  },
  design: {
    signals: ["ui", "ux", "figma", "design", "prototype", "wireframe"],
    label: "UI/UX Design",
    outcomes: ["user-centered", "prototype-ready", "conversion-focused"],
    deliverables: [
      "User flow dan wireframe prioritas",
      "High-fidelity Figma screen",
      "Interactive prototype untuk review",
      "Design system mini dengan component states",
    ],
  },
  brand: {
    signals: ["brand", "logo", "identity", "visual", "packaging"],
    label: "Brand Identity",
    outcomes: ["memorable", "export-ready", "consistent"],
    deliverables: [
      "Brand direction dan moodboard",
      "Logo/visual identity exploration",
      "Color, typography, dan usage guide",
      "Social/profile asset kit",
    ],
  },
  marketing: {
    signals: ["marketing", "ads", "campaign", "social", "instagram", "tiktok"],
    label: "Digital Marketing",
    outcomes: ["growth-focused", "audience-aware", "campaign-ready"],
    deliverables: [
      "Campaign angle dan content pillars",
      "Copywriting untuk ad/social post",
      "Content calendar awal",
      "Performance tracking template",
    ],
  },
  data: {
    signals: ["data", "dashboard", "analytics", "report", "excel", "power bi"],
    label: "Data & Analytics",
    outcomes: ["decision-ready", "clean", "automated"],
    deliverables: [
      "Data cleanup dan mapping kebutuhan",
      "Dashboard/report interaktif",
      "Insight summary untuk stakeholder",
      "Handoff guide untuk update berkala",
    ],
  },
  content: {
    signals: ["copy", "writing", "article", "content", "script", "blog"],
    label: "Content & Copywriting",
    outcomes: ["clear", "persuasive", "brand-aligned"],
    deliverables: [
      "Content outline dan messaging angle",
      "Draft copy siap review",
      "Revision pass berdasarkan feedback",
      "Final copy dengan usage notes",
    ],
  },
};

const toneCopy = {
  professional: {
    promise: "rapi, terstruktur, dan siap dipakai untuk kebutuhan bisnis",
    suffix: "professional workflow",
  },
  friendly: {
    promise: "mudah dipahami, kolaboratif, dan nyaman direview bersama tim",
    suffix: "collaborative delivery",
  },
  premium: {
    promise: "polished, detail-oriented, dan siap mewakili brand di pasar global",
    suffix: "premium execution",
  },
  fast: {
    promise: "cepat dieksekusi, tetap rapi, dan fokus ke hasil paling penting",
    suffix: "fast turnaround",
  },
};

function hashInput(value: string) {
  return [...value].reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pick<T>(items: T[], seed: number, offset = 0) {
  return items[(seed + offset) % items.length];
}

function compactWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3);
}

function detectArchetype(input: GigBuilderInput) {
  const haystack = [
    input.brief,
    input.category,
    input.skills.join(" "),
    input.targetClient ?? "",
  ]
    .join(" ")
    .toLowerCase();

  const scored = Object.entries(archetypes).map(([key, archetype]) => ({
    key,
    score: archetype.signals.filter((signal) => haystack.includes(signal))
      .length,
  }));
  const best = scored.sort((a, b) => b.score - a.score)[0];

  return archetypes[(best?.score ?? 0) > 0 ? (best.key as keyof typeof archetypes) : "web"];
}

function keywordSet(input: GigBuilderInput) {
  const words = compactWords(`${input.brief} ${input.category}`);
  const skillWords = input.skills.flatMap(compactWords);
  return [...new Set([...skillWords, ...words])].slice(0, 8);
}

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`)
    .join(" ");
}

function roundedPrice(value: number) {
  return Math.max(50, Math.round(value / 25) * 25);
}

export function generateGigDraft(input: GigBuilderInput): GeneratedGigDraft {
  const currency = input.currency ?? "USD";
  const seed = hashInput(
    `${input.brief}|${input.category}|${input.skills.join(",")}|${input.targetClient}|${input.tone}`,
  );
  const archetype = detectArchetype(input);
  const keywords = keywordSet(input);
  const primarySkill = input.skills[0] ?? archetype.label;
  const target = input.targetClient?.trim() || "business owner";
  const outcome = pick(archetype.outcomes, seed);
  const tone = toneCopy[input.tone];
  const angle = `${outcome} ${archetype.label.toLowerCase()} for ${target}`;
  const titlePatterns = [
    `I will build a ${outcome} ${archetype.label.toLowerCase()} for ${target}`,
    `${titleCase(primarySkill)} service for ${target} with ${tone.suffix}`,
    `Launch-ready ${archetype.label.toLowerCase()} powered by ${titleCase(primarySkill)}`,
    `${titleCase(target)} ${archetype.label} that feels ${outcome}`,
  ];
  const title = pick(titlePatterns, seed, input.tone.length);
  const selectedDeliverables = [
    ...new Set([
      pick(archetype.deliverables, seed),
      pick(archetype.deliverables, seed, 1),
      pick(archetype.deliverables, seed, 2),
      `${titleCase(primarySkill)} implementation notes`,
      `Final handoff checklist for ${target}`,
    ]),
  ];
  const starterDeliverables = selectedDeliverables.slice(0, 2);
  const growthDeliverables = selectedDeliverables.slice(0, 4);
  const scaleDeliverables = [
    ...selectedDeliverables,
    "Priority async support after delivery",
    "Revision buffer for stakeholder feedback",
  ];
  const packageNames = {
    web: ["Launch", "Growth", "Scale"],
    design: ["Wireframe", "Prototype", "Product Kit"],
    brand: ["Direction", "Identity", "Brand System"],
    marketing: ["Campaign Seed", "Growth Sprint", "Launch Engine"],
    data: ["Clean View", "Insight Board", "Decision System"],
    content: ["Message Draft", "Conversion Copy", "Content System"],
  };
  const archetypeKey =
    Object.entries(archetypes).find(([, value]) => value === archetype)?.[0] ??
    "web";
  const names = packageNames[archetypeKey as keyof typeof packageNames];
  const base = roundedPrice(input.startingPrice);
  const packages = [
    {
      name: names[0],
      price: base,
      timeline: input.tone === "fast" ? "3-5 hari" : "5-7 hari",
      description: `Scope awal untuk validasi arah dan deliverable inti.`,
      deliverables: starterDeliverables,
    },
    {
      name: names[1],
      price: roundedPrice(base * 2.2),
      timeline: input.tone === "fast" ? "7-10 hari" : "10-14 hari",
      description: `Paket paling seimbang untuk ${target} yang butuh eksekusi lengkap.`,
      deliverables: growthDeliverables,
    },
    {
      name: names[2],
      price: roundedPrice(base * 3.8),
      timeline: input.tone === "fast" ? "14-18 hari" : "18-28 hari",
      description: `End-to-end delivery dengan polish ekstra dan handoff lebih lengkap.`,
      deliverables: scaleDeliverables,
    },
  ];
  const process = [
    "Discovery singkat untuk memahami tujuan, audience, dan constraint.",
    `Membuat arah solusi berdasarkan ${primarySkill} dan konteks ${target}.`,
    "Review checkpoint supaya feedback masuk sebelum finalisasi.",
    "Final delivery, dokumentasi, dan handoff file/source yang rapi.",
  ];

  return {
    title,
    summary: `Saya membantu ${target} membuat ${angle} yang ${tone.promise}.`,
    description: `${input.brief.trim()}\n\nGig ini cocok untuk ${target} yang membutuhkan ${archetype.label.toLowerCase()} dengan pendekatan ${tone.suffix}. Fokus saya adalah membuat hasil yang jelas, bisa direview, dan siap dipakai untuk kebutuhan nyata.`,
    category: input.category,
    skills: input.skills,
    startingPrice: base,
    currency,
    deliverables: selectedDeliverables,
    packages,
    process,
    faq: [
      {
        question: "Apa yang perlu disiapkan sebelum mulai?",
        answer: `Brief singkat, referensi visual/brand, target audience, dan prioritas deliverable untuk ${target}.`,
      },
      {
        question: "Apakah bisa revisi?",
        answer:
          "Ya. Setiap paket punya checkpoint review supaya revisi dilakukan sebelum final handoff.",
      },
      {
        question: "Apakah cocok untuk client internasional?",
        answer:
          "Ya. Output bisa disiapkan dengan struktur komunikasi bilingual dan file handoff yang mudah dipahami.",
      },
    ],
    keywords,
    serviceAngle: angle,
  };
}
