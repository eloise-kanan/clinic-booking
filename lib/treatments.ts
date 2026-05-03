// Available treatments and their slot durations.
// "other" defaults to 30 min; nurse can adjust before confirmation.

export type Treatment = { value: string; label: string; minutes: number };

export const TREATMENTS: Treatment[] = [
  { value: "scaling", label: "Normal treatment / scaling", minutes: 30 },
  { value: "root_canal", label: "Root canal treatment", minutes: 90 },
  { value: "whitening", label: "Whitening", minutes: 90 },
  { value: "wisdom_tooth", label: "Wisdom tooth surgery", minutes: 60 },
  { value: "other", label: "Others", minutes: 30 },
];

export function treatmentMinutes(value: string): number | null {
  return TREATMENTS.find((t) => t.value === value)?.minutes ?? null;
}
