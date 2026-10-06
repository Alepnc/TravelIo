/**
 * Schema relazionale (Drizzle, dialetto SQLite per lo sviluppo).
 * Per PostgreSQL: stesso modello con `drizzle-orm/pg-core` (text→text, integer→integer,
 * real→doublePrecision, json→jsonb). I servizi non usano funzioni specifiche di SQLite.
 */
import { relations, sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import type {
  AccommodationType,
  BookingRef,
  ActivityCategory,
  ActivitySource,
  ExpenseCategory,
  TripPace,
  TripStatus,
} from "@/lib/types";

const id = () => text("id").primaryKey().$defaultFn(() => crypto.randomUUID());
const createdAt = () => text("created_at").notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`);
const updatedAt = () =>
  text("updated_at")
    .notNull()
    .default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`)
    .$onUpdateFn(() => new Date().toISOString());

// ───────────────────────────── Utenti e autenticazione ─────────────────────────────

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  homeAirport: text("home_airport"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    /** SHA-256 del token: il token in chiaro esiste solo nel cookie */
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: id(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  usedAt: text("used_at"),
  createdAt: createdAt(),
});

export const preferences = sqliteTable("preferences", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  pace: text("pace").$type<TripPace>().notNull().default("bilanciato"),
  interests: text("interests", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  budgetLevel: text("budget_level").$type<"basso" | "medio" | "alto">().notNull().default("medio"),
});

// ───────────────────────────── Viaggi ─────────────────────────────

export const trips = sqliteTable(
  "trips",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Snapshot della destinazione (il catalogo appartiene al DestinationProvider)
    destinationId: text("destination_id").notNull(),
    destinationName: text("destination_name").notNull(),
    country: text("country").notNull(),
    countryCode: text("country_code").notNull(),
    destinationLat: real("destination_lat").notNull(),
    destinationLng: real("destination_lng").notNull(),
    imageUrl: text("image_url").notNull(),
    originCode: text("origin_code"),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    travelersCount: integer("travelers_count").notNull().default(1),
    budgetPerPerson: integer("budget_per_person"),
    pace: text("pace").$type<TripPace>().notNull().default("bilanciato"),
    status: text("status").$type<TripStatus>().notNull().default("pianificazione"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("trips_user_idx").on(t.userId)],
);

export const travelers = sqliteTable("travelers", {
  id: id(),
  tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: text("email"),
  isOwner: integer("is_owner", { mode: "boolean" }).notNull().default(false),
});

/** Flight: snapshot dell'offerta scelta (andata o ritorno) */
export const tripFlights = sqliteTable("trip_flights", {
  id: id(),
  tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  direction: text("direction").$type<"andata" | "ritorno">().notNull(),
  provider: text("provider").notNull(),
  offerId: text("offer_id").notNull(),
  airline: text("airline").notNull(),
  airlineCode: text("airline_code").notNull(),
  flightNumber: text("flight_number").notNull(),
  fromCode: text("from_code").notNull(),
  toCode: text("to_code").notNull(),
  departAt: text("depart_at").notNull(),
  arriveAt: text("arrive_at").notNull(),
  durationMin: integer("duration_min").notNull(),
  stops: integer("stops").notNull(),
  pricePerPerson: integer("price_per_person").notNull(),
  baggage: text("baggage", { mode: "json" }).$type<{ cabin: boolean | null; checked: boolean | null }>().notNull(),
  conditions: text("conditions", { mode: "json" }).$type<string[]>().notNull(),
  /** Per riaprire i link di prenotazione dal viaggio salvato (può scadere lato provider) */
  bookingRef: text("booking_ref", { mode: "json" }).$type<BookingRef | null>(),
  createdAt: createdAt(),
});

/** Accommodation: snapshot dell'alloggio scelto */
export const tripAccommodations = sqliteTable("trip_accommodations", {
  id: id(),
  tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  offerId: text("offer_id").notNull(),
  name: text("name").notNull(),
  type: text("type").$type<AccommodationType>().notNull(),
  neighborhood: text("neighborhood").notNull(),
  lat: real("lat").notNull(),
  lng: real("lng").notNull(),
  rating: real("rating").notNull(),
  reviewsCount: integer("reviews_count").notNull(),
  pricePerNight: integer("price_per_night").notNull(),
  priceTotal: integer("price_total").notNull(),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  freeCancellation: integer("free_cancellation", { mode: "boolean" }).notNull(),
  imageUrl: text("image_url").notNull(),
  bookingRef: text("booking_ref", { mode: "json" }).$type<BookingRef | null>(),
  createdAt: createdAt(),
});

// ───────────────────────────── Itinerario ─────────────────────────────

export const itineraries = sqliteTable("itineraries", {
  id: id(),
  tripId: text("trip_id").notNull().unique().references(() => trips.id, { onDelete: "cascade" }),
  pace: text("pace").$type<TripPace>().notNull(),
  generatedAt: text("generated_at").notNull(),
});

export const itineraryDays = sqliteTable(
  "itinerary_days",
  {
    id: id(),
    itineraryId: text("itinerary_id").notNull().references(() => itineraries.id, { onDelete: "cascade" }),
    dayIndex: integer("day_index").notNull(),
    date: text("date").notNull(),
    title: text("title").notNull(),
    /** Giornata toccata a mano: la rigenerazione completa la lascia invariata */
    isUserModified: integer("is_user_modified", { mode: "boolean" }).notNull().default(false),
  },
  (t) => [uniqueIndex("days_itinerary_index_idx").on(t.itineraryId, t.dayIndex)],
);

export const activities = sqliteTable(
  "activities",
  {
    id: id(),
    dayId: text("day_id").notNull().references(() => itineraryDays.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    title: text("title").notNull(),
    category: text("category").$type<ActivityCategory>().notNull(),
    startTime: text("start_time").notNull(),
    durationMin: integer("duration_min").notNull(),
    placeName: text("place_name"),
    lat: real("lat"),
    lng: real("lng"),
    cost: real("cost").notNull().default(0),
    notes: text("notes"),
    poiId: text("poi_id"),
    source: text("source").$type<ActivitySource>().notNull().default("generated"),
    isUserModified: integer("is_user_modified", { mode: "boolean" }).notNull().default(false),
    /** Orario fissato a mano: il ricalcolo automatico non lo sposta */
    timeLocked: integer("time_locked", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index("activities_day_idx").on(t.dayId)],
);

// ───────────────────────────── Prenotazioni e spese ─────────────────────────────

export const bookings = sqliteTable("bookings", {
  id: id(),
  tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
  kind: text("kind").$type<"volo" | "alloggio" | "attivita">().notNull(),
  refId: text("ref_id").notNull(),
  status: text("status").$type<"da_prenotare" | "prenotato" | "annullato">().notNull().default("da_prenotare"),
  providerRef: text("provider_ref"),
  amount: integer("amount").notNull(),
  createdAt: createdAt(),
});

export const expenses = sqliteTable(
  "expenses",
  {
    id: id(),
    tripId: text("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" }),
    category: text("category").$type<ExpenseCategory>().notNull(),
    label: text("label").notNull(),
    amount: real("amount").notNull(),
    spentAt: text("spent_at"),
    createdAt: createdAt(),
  },
  (t) => [index("expenses_trip_idx").on(t.tripId)],
);

// ───────────────────────────── Provider esterni: cache e quota ─────────────────────────────

/**
 * Cache persistente delle risposte dei provider a pagamento (e delle offerte, per poterle rileggere
 * dopo il login). Sopravvive ai riavvii: ogni ricerca risparmiata è quota risparmiata.
 */
export const providerCache = sqliteTable("provider_cache", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: createdAt(),
});

/** Ricerche effettivamente inviate a un provider, per mese (es. "serpapi:2026-10"). */
export const providerUsage = sqliteTable("provider_usage", {
  period: text("period").primaryKey(),
  count: integer("count").notNull().default(0),
});

// ───────────────────────────── Relazioni ─────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  trips: many(trips),
  sessions: many(sessions),
  preferences: one(preferences),
}));

export const tripsRelations = relations(trips, ({ one, many }) => ({
  user: one(users, { fields: [trips.userId], references: [users.id] }),
  travelers: many(travelers),
  flights: many(tripFlights),
  accommodations: many(tripAccommodations),
  itinerary: one(itineraries),
  bookings: many(bookings),
  expenses: many(expenses),
}));

export const travelersRelations = relations(travelers, ({ one }) => ({
  trip: one(trips, { fields: [travelers.tripId], references: [trips.id] }),
}));
export const tripFlightsRelations = relations(tripFlights, ({ one }) => ({
  trip: one(trips, { fields: [tripFlights.tripId], references: [trips.id] }),
}));
export const tripAccommodationsRelations = relations(tripAccommodations, ({ one }) => ({
  trip: one(trips, { fields: [tripAccommodations.tripId], references: [trips.id] }),
}));
export const itinerariesRelations = relations(itineraries, ({ one, many }) => ({
  trip: one(trips, { fields: [itineraries.tripId], references: [trips.id] }),
  days: many(itineraryDays),
}));
export const itineraryDaysRelations = relations(itineraryDays, ({ one, many }) => ({
  itinerary: one(itineraries, { fields: [itineraryDays.itineraryId], references: [itineraries.id] }),
  activities: many(activities),
}));
export const activitiesRelations = relations(activities, ({ one }) => ({
  day: one(itineraryDays, { fields: [activities.dayId], references: [itineraryDays.id] }),
}));
export const bookingsRelations = relations(bookings, ({ one }) => ({
  trip: one(trips, { fields: [bookings.tripId], references: [trips.id] }),
}));
export const expensesRelations = relations(expenses, ({ one }) => ({
  trip: one(trips, { fields: [expenses.tripId], references: [trips.id] }),
}));
export const preferencesRelations = relations(preferences, ({ one }) => ({
  user: one(users, { fields: [preferences.userId], references: [users.id] }),
}));

export type UserRow = typeof users.$inferSelect;
export type TripRow = typeof trips.$inferSelect;
export type TripFlightRow = typeof tripFlights.$inferSelect;
export type TripAccommodationRow = typeof tripAccommodations.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type ExpenseRow = typeof expenses.$inferSelect;
