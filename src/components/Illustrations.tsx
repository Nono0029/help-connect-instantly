type IlluName = "hero" | "auth" | "chat" | "messages" | "jardin" | "bricolage" | "cours" | "tech" | "animaux" | "ecoute" | "demenagement" | "aide";

const illustrations: Record<IlluName, string> = {
  hero: "2 SCENE.png",
  auth: "1 SCENE.png",
  chat: "3 SCENE.png",
  messages: "4 SCENE.png",
  jardin: "Nature and Ecology _ gardening, garden, man, sprout, plant, plants, outdoors.png",
  bricolage: "Sports and Fitness _ weights, weigh, gym, workout, man, equipment.png",
  cours: "Education and training _ teacher, lesson, professor, blackboard, man, book.png",
  tech: "Tech and Innovation _ arrow, up, robot, artificial, intelligence, online, internet, search, man.png",
  animaux: "Animals and pets _ tree, park, outdoors, woman, animal, pet, walk, trash.png",
  ecoute: "Lifestyle and Leisure _ woman, laptop, headphone, bench, outdoors, fire hydrant, city.png",
  demenagement: "Transportation and Logistics _ box, package, shipping, delivery, man, boxes.png",
  aide: "Avatars and Characters _ alert, man, wave, greeting, welcome, city, buildings.png",
};

interface Props {
  name: IlluName;
  className?: string;
}

export const Illu = ({ name, className = "w-48 h-48" }: Props) => {
  const src = `/${encodeURI(illustrations[name])}`;
  return (
    <img
      src={src}
      alt=""
      className={`${className} object-contain pointer-events-none select-none`}
      loading="lazy"
    />
  );
};
