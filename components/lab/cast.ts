// The demo cast every Lab prototype shares, so the same friends appear across ideas.
// Fictional people for prototypes only; nothing here is real user data.

export interface Person {
  id: string;
  name: string;
  first: string;
  /** The letter cut into their personal seal. */
  initial: string;
  city: string;
  role: string;
}

export const CAST: Person[] = [
  { id: "mira", name: "Mira Okafor", first: "Mira", initial: "M", city: "Lisbon", role: "Designer" },
  { id: "arjun", name: "Arjun Rao", first: "Arjun", initial: "A", city: "Bengaluru", role: "Founder" },
  { id: "lena", name: "Lena Fischer", first: "Lena", initial: "L", city: "Berlin", role: "Student" },
  { id: "theo", name: "Theo Lindqvist", first: "Theo", initial: "T", city: "Stockholm", role: "Writer" },
  { id: "priya", name: "Priya Nair", first: "Priya", initial: "P", city: "Toronto", role: "Job seeker" },
  { id: "kenji", name: "Kenji Mori", first: "Kenji", initial: "K", city: "Kyoto", role: "Developer" },
  { id: "ana", name: "Dina Duarte", first: "Dina", initial: "D", city: "Porto", role: "Teacher" },
  { id: "nani", name: "Nani", first: "Nani", initial: "N", city: "Hyderabad", role: "Grandmother" },
];

export const person = (id: string) => CAST.find((p) => p.id === id)!;

/** The signed-in writer, as the prototypes see them. */
export interface Me {
  name: string;
  first: string;
  initial: string;
}

export function meFrom(name?: string | null): Me {
  const n = name?.trim() || "You";
  return { name: n, first: n.split(" ")[0], initial: n[0]?.toUpperCase() ?? "Y" };
}
