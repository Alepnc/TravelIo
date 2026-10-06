/**
 * Dati di riferimento (non offerte): elenco ridotto di aeroporti usati dalla ricerca.
 */
import type { Airport } from "@/lib/types";

const a = (code: string, city: string, name: string, country: string, lat: number, lng: number): Airport => ({
  code, city, name, country, location: { lat, lng },
});

/** Aeroporti di partenza proposti nel search widget (pubblico italiano) */
export const ORIGIN_AIRPORTS: Airport[] = [
  a("NAP", "Napoli", "Napoli Capodichino", "Italia", 40.886, 14.2908),
  a("FCO", "Roma", "Roma Fiumicino", "Italia", 41.8003, 12.2389),
  a("CIA", "Roma", "Roma Ciampino", "Italia", 41.7994, 12.5949),
  a("MXP", "Milano", "Milano Malpensa", "Italia", 45.6306, 8.7281),
  a("BGY", "Milano Bergamo", "Bergamo Orio al Serio", "Italia", 45.6739, 9.7042),
  a("LIN", "Milano", "Milano Linate", "Italia", 45.4451, 9.2767),
  a("VCE", "Venezia", "Venezia Marco Polo", "Italia", 45.5053, 12.3519),
  a("BLQ", "Bologna", "Bologna Guglielmo Marconi", "Italia", 44.5354, 11.2887),
  a("TRN", "Torino", "Torino Caselle", "Italia", 45.2008, 7.6497),
  a("PSA", "Pisa", "Pisa Galileo Galilei", "Italia", 43.6839, 10.3927),
  a("FLR", "Firenze", "Firenze Peretola", "Italia", 43.81, 11.2051),
  a("BRI", "Bari", "Bari Karol Wojtyła", "Italia", 41.1389, 16.7606),
  a("CTA", "Catania", "Catania Fontanarossa", "Italia", 37.4668, 15.0664),
  a("PMO", "Palermo", "Palermo Falcone Borsellino", "Italia", 38.1759, 13.091),
  a("CAG", "Cagliari", "Cagliari Elmas", "Italia", 39.2515, 9.0543),
];

/** Aeroporti delle destinazioni del catalogo + hub di scalo */
export const DESTINATION_AIRPORTS: Airport[] = [
  a("BCN", "Barcellona", "Barcelona El Prat", "Spagna", 41.2974, 2.0833),
  a("CDG", "Parigi", "Paris Charles de Gaulle", "Francia", 49.0097, 2.5479),
  a("LHR", "Londra", "London Heathrow", "Regno Unito", 51.47, -0.4543),
  a("LIS", "Lisbona", "Lisboa Humberto Delgado", "Portogallo", 38.7742, -9.1342),
  a("AMS", "Amsterdam", "Amsterdam Schiphol", "Paesi Bassi", 52.3105, 4.7683),
  a("BER", "Berlino", "Berlin Brandenburg", "Germania", 52.3667, 13.5033),
  a("PRG", "Praga", "Praha Václav Havel", "Repubblica Ceca", 50.1008, 14.26),
  a("BUD", "Budapest", "Budapest Liszt Ferenc", "Ungheria", 47.4369, 19.2556),
  a("ATH", "Atene", "Athens Eleftherios Venizelos", "Grecia", 37.9364, 23.9445),
  a("IBZ", "Ibiza", "Ibiza", "Spagna", 38.8729, 1.3731),
  a("HND", "Tokyo", "Tokyo Haneda", "Giappone", 35.5494, 139.7798),
  a("JFK", "New York", "New York JFK", "Stati Uniti", 40.6413, -73.7781),
  a("RAK", "Marrakech", "Marrakech Menara", "Marocco", 31.6069, -8.0363),
  a("KEF", "Reykjavík", "Keflavík", "Islanda", 63.985, -22.6056),
  a("KRK", "Cracovia", "Kraków John Paul II", "Polonia", 50.0777, 19.7848),
  a("OPO", "Porto", "Porto Francisco Sá Carneiro", "Portogallo", 41.2481, -8.6814),
  a("DBV", "Dubrovnik", "Dubrovnik", "Croazia", 42.5614, 18.2682),
  a("VLC", "Valencia", "Valencia", "Spagna", 39.4893, -0.4816),
  a("IST", "Istanbul", "Istanbul Airport", "Turchia", 41.2753, 28.7519),
  a("MLA", "Malta", "Malta International", "Malta", 35.8575, 14.4775),
  a("FNC", "Madeira", "Madeira Cristiano Ronaldo", "Portogallo", 32.6979, -16.7745),
  a("FRA", "Francoforte", "Frankfurt am Main", "Germania", 50.0379, 8.5622),
  a("MUC", "Monaco", "München", "Germania", 48.3538, 11.7861),
  a("DOH", "Doha", "Hamad International", "Qatar", 25.2731, 51.6081),
  a("HEL", "Helsinki", "Helsinki-Vantaa", "Finlandia", 60.3172, 24.9633),
  a("MAD", "Madrid", "Madrid Barajas", "Spagna", 40.4983, -3.5676),
];

const ALL = [...ORIGIN_AIRPORTS, ...DESTINATION_AIRPORTS];
const BY_CODE = new Map(ALL.map((x) => [x.code, x]));

export function findAirport(code: string): Airport | undefined {
  return BY_CODE.get(code.toUpperCase());
}
