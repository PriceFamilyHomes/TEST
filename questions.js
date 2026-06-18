// Each question: { clue, lat, lng, label }
// label = what's shown in the result list
const QUESTIONS = [
  // Countries / Capitals
  { clue: "Click the capital of France", lat: 48.8566, lng: 2.3522, label: "Paris, France" },
  { clue: "Click the capital of Japan", lat: 35.6762, lng: 139.6503, label: "Tokyo, Japan" },
  { clue: "Click the capital of Brazil", lat: -15.7975, lng: -47.8919, label: "Brasília, Brazil" },
  { clue: "Click the capital of Australia", lat: -35.2809, lng: 149.1300, label: "Canberra, Australia" },
  { clue: "Click the capital of Canada", lat: 45.4215, lng: -75.6919, label: "Ottawa, Canada" },
  { clue: "Click the capital of Egypt", lat: 30.0444, lng: 31.2357, label: "Cairo, Egypt" },
  { clue: "Click the capital of Russia", lat: 55.7558, lng: 37.6173, label: "Moscow, Russia" },
  { clue: "Click the capital of India", lat: 28.6139, lng: 77.2090, label: "New Delhi, India" },
  { clue: "Click the capital of South Africa", lat: -25.7461, lng: 28.1881, label: "Pretoria, South Africa" },
  { clue: "Click the capital of Argentina", lat: -34.6037, lng: -58.3816, label: "Buenos Aires, Argentina" },
  { clue: "Click the capital of Mexico", lat: 19.4326, lng: -99.1332, label: "Mexico City, Mexico" },
  { clue: "Click the capital of Germany", lat: 52.5200, lng: 13.4050, label: "Berlin, Germany" },
  { clue: "Click the capital of China", lat: 39.9042, lng: 116.4074, label: "Beijing, China" },
  { clue: "Click the capital of Nigeria", lat: 9.0765, lng: 7.3986, label: "Abuja, Nigeria" },
  { clue: "Click the capital of Indonesia", lat: -6.2088, lng: 106.8456, label: "Jakarta, Indonesia" },
  { clue: "Click the capital of Saudi Arabia", lat: 24.7136, lng: 46.6753, label: "Riyadh, Saudi Arabia" },
  { clue: "Click the capital of South Korea", lat: 37.5665, lng: 126.9780, label: "Seoul, South Korea" },
  { clue: "Click the capital of Turkey", lat: 39.9334, lng: 32.8597, label: "Ankara, Turkey" },
  { clue: "Click the capital of Spain", lat: 40.4168, lng: -3.7038, label: "Madrid, Spain" },
  { clue: "Click the capital of Italy", lat: 41.9028, lng: 12.4964, label: "Rome, Italy" },
  { clue: "Click the capital of United Kingdom", lat: 51.5074, lng: -0.1278, label: "London, UK" },
  { clue: "Click the capital of Thailand", lat: 13.7563, lng: 100.5018, label: "Bangkok, Thailand" },
  { clue: "Click the capital of Kenya", lat: -1.2921, lng: 36.8219, label: "Nairobi, Kenya" },
  { clue: "Click the capital of Peru", lat: -12.0464, lng: -77.0428, label: "Lima, Peru" },
  { clue: "Click the capital of Ukraine", lat: 50.4501, lng: 30.5234, label: "Kyiv, Ukraine" },
  { clue: "Click the capital of Poland", lat: 52.2297, lng: 21.0122, label: "Warsaw, Poland" },
  { clue: "Click the capital of Sweden", lat: 59.3293, lng: 18.0686, label: "Stockholm, Sweden" },
  { clue: "Click the capital of Norway", lat: 59.9139, lng: 10.7522, label: "Oslo, Norway" },
  { clue: "Click the capital of Netherlands", lat: 52.3676, lng: 4.9041, label: "Amsterdam, Netherlands" },
  { clue: "Click the capital of Greece", lat: 37.9838, lng: 23.7275, label: "Athens, Greece" },
  // Landmarks
  { clue: "Click the Eiffel Tower", lat: 48.8584, lng: 2.2945, label: "Eiffel Tower, Paris" },
  { clue: "Click the Great Wall of China (at Badaling)", lat: 40.3594, lng: 116.0173, label: "Great Wall, China" },
  { clue: "Click Machu Picchu", lat: -13.1631, lng: -72.5450, label: "Machu Picchu, Peru" },
  { clue: "Click the Colosseum", lat: 41.8902, lng: 12.4922, label: "Colosseum, Rome" },
  { clue: "Click the Taj Mahal", lat: 27.1751, lng: 78.0421, label: "Taj Mahal, India" },
  { clue: "Click the Statue of Liberty", lat: 40.6892, lng: -74.0445, label: "Statue of Liberty, New York" },
  { clue: "Click Mount Everest", lat: 27.9881, lng: 86.9250, label: "Mount Everest, Nepal/Tibet" },
  { clue: "Click the Amazon River mouth", lat: -0.4653, lng: -49.9897, label: "Amazon River Mouth, Brazil" },
  { clue: "Click the Sahara Desert (center)", lat: 23.4162, lng: 25.6628, label: "Sahara Desert, Africa" },
  { clue: "Click Angkor Wat", lat: 13.4125, lng: 103.8670, label: "Angkor Wat, Cambodia" },
  { clue: "Click the Sydney Opera House", lat: -33.8568, lng: 151.2153, label: "Sydney Opera House, Australia" },
  { clue: "Click Stonehenge", lat: 51.1789, lng: -1.8262, label: "Stonehenge, UK" },
  { clue: "Click the Pyramids of Giza", lat: 29.9792, lng: 31.1342, label: "Pyramids of Giza, Egypt" },
  { clue: "Click Victoria Falls", lat: -17.9243, lng: 25.8572, label: "Victoria Falls, Zambia/Zimbabwe" },
  { clue: "Click Mount Kilimanjaro", lat: -3.0674, lng: 37.3556, label: "Mt. Kilimanjaro, Tanzania" },
  // Bodies of Water
  { clue: "Click Lake Baikal", lat: 53.5587, lng: 108.1650, label: "Lake Baikal, Russia" },
  { clue: "Click the Caspian Sea", lat: 42.5000, lng: 51.0000, label: "Caspian Sea" },
  { clue: "Click the Dead Sea", lat: 31.5590, lng: 35.4732, label: "Dead Sea, Middle East" },
  { clue: "Click the Panama Canal", lat: 9.0800, lng: -79.6800, label: "Panama Canal" },
  { clue: "Click the Suez Canal", lat: 30.5852, lng: 32.2654, label: "Suez Canal, Egypt" },
];

function getShuffledQuestions(count = 10) {
  const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
