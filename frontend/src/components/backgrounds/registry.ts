export type BackgroundId =
  | "time-of-day"
  | "clean-white"
  | "apple-light"
  | "pure-dark"
  | "midnight-blue"
  | "warm-dark"
  | "textured-dark"
  | "subtle-mesh"
  | "aurora"
  | "flowing-waves"
  | "glass-blobs"
  | "particle-field"
  | "topography"
  | "grid-3d"
  | "sphere-3d"
  | "wave-mesh-3d"
  | "point-cloud-3d";

export interface BackgroundMeta {
  id: BackgroundId;
  name: string;
  description: string;
  category: "light" | "dark" | "ambient" | "reactive-3d" | "special";
  tag: string;
  /** Whether text on glass should be dark (for light backgrounds) */
  lightMode?: boolean;
}

export const BACKGROUNDS: BackgroundMeta[] = [
  // Special
  { id: "time-of-day", name: "Time-of-Day", description: "Ändert sich automatisch über den Tag", category: "special", tag: "DYNAMIC" },
  // Light
  { id: "clean-white", name: "Clean White", description: "Minimalistisch, Apple-Style", category: "light", tag: "LIGHT", lightMode: true },
  { id: "apple-light", name: "Apple SF Light", description: "Sanfter Gradient, warm-neutral", category: "light", tag: "LIGHT", lightMode: true },
  // Dark
  { id: "pure-dark", name: "Pure Dark", description: "OLED-schwarz, maximaler Kontrast", category: "dark", tag: "DARK" },
  { id: "midnight-blue", name: "Midnight Blue", description: "Tiefdunkles Blau-Violett", category: "dark", tag: "DARK" },
  { id: "warm-dark", name: "Warm Dark", description: "Dunkle warme Töne, gemütlich", category: "dark", tag: "DARK" },
  { id: "textured-dark", name: "Textured Dark", description: "Feines Rauschen, subtile Tiefe", category: "dark", tag: "DARK" },
  // Ambient
  { id: "subtle-mesh", name: "Subtle Mesh", description: "Sanfte Farbverläufe, ruhig", category: "ambient", tag: "AMBIENT" },
  { id: "aurora", name: "Aurora", description: "Nordlicht-Effekt, langsam rotierend", category: "ambient", tag: "ANIMATED" },
  { id: "flowing-waves", name: "Flowing Waves", description: "Fließende Wellen am unteren Rand", category: "ambient", tag: "ANIMATED" },
  { id: "glass-blobs", name: "Glass Blobs", description: "Schwebende Farbkugeln, organisch", category: "ambient", tag: "ANIMATED" },
  { id: "particle-field", name: "Particle Field", description: "Schwebende Partikel, Weltraum-Feeling", category: "ambient", tag: "ANIMATED" },
  { id: "topography", name: "Topography", description: "Dezente Höhenlinien, technisch", category: "ambient", tag: "AMBIENT" },
  // Reactive 3D
  { id: "grid-3d", name: "3D Grid", description: "Perspektivisches Gitter, reagiert auf Maus", category: "reactive-3d", tag: "3D REACTIVE" },
  { id: "sphere-3d", name: "Floating Sphere", description: "3D-Kugel folgt dem Cursor", category: "reactive-3d", tag: "3D REACTIVE" },
  { id: "wave-mesh-3d", name: "3D Wave Mesh", description: "Wellenförmiges 3D-Netz", category: "reactive-3d", tag: "3D REACTIVE" },
  { id: "point-cloud-3d", name: "Point Cloud", description: "Partikelwolke mit Maus-Gravitation", category: "reactive-3d", tag: "3D REACTIVE" },
];
