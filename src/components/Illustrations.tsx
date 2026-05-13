import { cn } from "@/lib/utils";

const illustrations = {
  hero: "2 SCENE.png",
  auth: "Avatars and Characters _ alert, man, wave, greeting, welcome, city, buildings.png",
  chat: "Lifestyle and Leisure _ woman, laptop, headphone, bench, outdoors, fire hydrant, city.png",
  messages: "Tech and Innovation _ virtual, reality, laptop, computer, device, plant, table.png",
  jardin: "Nature and Ecology _ gardening, garden, man, sprout, plant, plants, outdoors.png",
  bricolage: "Business and Finance _ man, office, computer, desk, table, filing, suitcase, briefcase.png",
  cours: "Education and training _ teacher, lesson, professor, blackboard, man, book.png",
  tech: "Tech and Innovation _ arrow, up, robot, artificial, intelligence, online, internet, search, man.png",
  animaux: "Animals and pets _ tree, park, outdoors, woman, animal, pet, walk, trash.png",
  ecoute: "Lifestyle and Leisure _ woman, laptop, headphone, bench, outdoors, fire hydrant, city.png",
  demenagement: "Transportation and Logistics _ box, package, shipping, delivery, man, boxes.png",
  aide: "Avatars and Characters _ alert, man, wave, greeting, welcome, city, buildings.png",
  empty: "1 SCENE.png",
  sports: "Sports and Fitness _ basketball, sport, ball, man, people, jump, throw.png",
  shopping: "Shopping and Retail _ shop, store, bag, woman, discount, price tag, star, rating, dollar.png",
  food: "Food and Cuisine _ cooking, cook, chef, pot, kitchen, furniture, spoon, taste.png",
  health: "Health and Wellness _ doctor, healthcare, medical, stethoscope, tie.png",
  travel: "Travel and Adventure _ airport, sign, suitcase, luggage, baggage, woman, flight.png",
  nature: "Nature and Ecology _ woman, wheelbarrow, garden, gardening, farming, farmer, tool, equipment.png",
  famille: "Family and Children _ woman, carriage, stroller, mother, infant, baby.png",
  musique: "Lifestyle and Leisure _ guitar, play, instrument, cactus, plant, chair.png",
} as const;

type IlluName = keyof typeof illustrations;

interface IlluProps {
  name: IlluName;
  className?: string;
  alt?: string;
}

export const Illu = ({ name, className, alt }: IlluProps) => {
  const src = `/${encodeURI(illustrations[name])}`;
  return (
    <img
      src={src}
      alt={alt ?? name}
      className={cn("object-contain pointer-events-none select-none", className)}
      loading="lazy"
    />
  );
};
