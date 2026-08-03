export const PRICE_SUGGESTIONS: Record<string, number> = {
  menage: 15,
  demenagement: 20,
  cuisine: 12,
  courses: 10,
  portage: 8,
  physique: 15,
  bricolage: 20,
  jardin: 15,
  admin: 20,
  compta: 25,
  juridique: 30,
  tech: 30,
  photo: 30,
  design: 30,
  cours: 20,
  langues: 15,
  musique: 25,
  animaux: 12,
  ecoute: 0,
  bienetre: 15,
  enfants: 12,
  "personnes agees": 13,
  transport: 10,
  evenement: 20,
  mode: 20,
  sante: 20,
  depannage: 20,
  autre: 12,
};

export const getPriceSuggestion = (typeId: string): number | null => {
  const v = PRICE_SUGGESTIONS[typeId];
  return v != null && v > 0 ? v : null;
};
