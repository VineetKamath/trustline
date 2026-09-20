/**
 * Service categories on the OneCity demo marketplace. Pure data — safe to
 * import from client components.
 *
 * Every category names both sides of the transaction in plain language
 * (a "Host" serves a "Guest", a "Tutor" teaches a "Student") and carries a
 * one-line gloss for each role, so no screen ever shows an unexplained word.
 */
export type Category =
  | "stays"
  | "hotels"
  | "car_rental"
  | "bikes"
  | "rides"
  | "flights"
  | "experiences"
  | "groceries"
  | "dining"
  | "it_projects"
  | "tutoring"
  | "home_services"
  | "beauty"
  | "healthcare"
  | "pet_care"
  | "courier"
  | "equipment"
  | "coworking"
  | "events";

export interface CategoryInfo {
  key: Category;
  label: string;
  /** One line explaining what this category is. */
  blurb: string;
  /** What the seller side is called. */
  provider: string;
  /** What the buyer side is called. */
  customer: string;
  /** Plain-English gloss for the provider role, shown in brackets. */
  providerMeans: string;
  /** Plain-English gloss for the customer role, shown in brackets. */
  customerMeans: string;
  unit: string;
  unitPlural: string;
  cta: string;
  /** Whether the customer picks a quantity (nights / days). */
  quantity: boolean;
  /** Headline nouns for provider and customer credentials. */
  providerNoun: string;
  customerNoun: string;
  /** Feedback wording. */
  customerAsks: { completed: string; accurate: string; cancelled: string };
  providerAsks: { showedUp: string; paid: string; cancelled: string };
}

export const CATEGORIES: Record<Category, CategoryInfo> = {
  stays: {
    key: "stays",
    label: "Stays",
    blurb: "Somebody's home, rented out by the night",
    provider: "Host",
    customer: "Guest",
    providerMeans: "the person who owns the home and rents it out",
    customerMeans: "the person staying in the home",
    unit: "night",
    unitPlural: "nights",
    cta: "Reserve",
    quantity: true,
    providerNoun: "completed bookings as host",
    customerNoun: "completed stays",
    customerAsks: { completed: "The stay went as booked", accurate: "The home matched the listing", cancelled: "The host cancelled" },
    providerAsks: { showedUp: "The guest showed up", paid: "Paid as agreed", cancelled: "The guest cancelled" },
  },
  hotels: {
    key: "hotels",
    label: "Hotels",
    blurb: "Rooms booked at a registered hotel business",
    provider: "Hotel",
    customer: "Guest",
    providerMeans: "the hotel business that provides the room",
    customerMeans: "the person checking in",
    unit: "night",
    unitPlural: "nights",
    cta: "Book room",
    quantity: true,
    providerNoun: "completed hotel bookings",
    customerNoun: "completed hotel stays",
    customerAsks: { completed: "The room was provided", accurate: "The room matched the listing", cancelled: "The hotel cancelled" },
    providerAsks: { showedUp: "The guest checked in", paid: "Paid as agreed", cancelled: "The guest cancelled" },
  },
  car_rental: {
    key: "car_rental",
    label: "Car rental",
    blurb: "Self-drive cars rented from their owners",
    provider: "Car owner",
    customer: "Renter",
    providerMeans: "the person who owns the car and hands over the keys",
    customerMeans: "the person driving the car away",
    unit: "day",
    unitPlural: "days",
    cta: "Rent car",
    quantity: true,
    providerNoun: "completed car rentals",
    customerNoun: "completed car rentals",
    customerAsks: { completed: "The car was handed over", accurate: "The car matched the listing", cancelled: "The owner cancelled" },
    providerAsks: { showedUp: "Picked up and returned on time", paid: "Paid as agreed", cancelled: "The renter cancelled" },
  },
  bikes: {
    key: "bikes",
    label: "Bikes & scooters",
    blurb: "Two-wheelers rented by the day",
    provider: "Owner",
    customer: "Rider",
    providerMeans: "the person who owns the bike or scooter",
    customerMeans: "the person renting and riding it",
    unit: "day",
    unitPlural: "days",
    cta: "Rent",
    quantity: true,
    providerNoun: "completed bike rentals",
    customerNoun: "completed bike rentals",
    customerAsks: { completed: "The bike was handed over", accurate: "The bike matched the listing", cancelled: "The owner cancelled" },
    providerAsks: { showedUp: "Picked up and returned on time", paid: "Paid as agreed", cancelled: "The rider cancelled" },
  },
  rides: {
    key: "rides",
    label: "Rides",
    blurb: "Cabs and outstation trips, booked per journey",
    provider: "Driver",
    customer: "Rider",
    providerMeans: "the person driving the vehicle",
    customerMeans: "the passenger being driven",
    unit: "ride",
    unitPlural: "rides",
    cta: "Book ride",
    quantity: false,
    providerNoun: "completed rides as driver",
    customerNoun: "completed rides as passenger",
    customerAsks: { completed: "The ride was completed", accurate: "The vehicle matched the booking", cancelled: "The driver cancelled" },
    providerAsks: { showedUp: "The rider was at the pickup point", paid: "Paid as agreed", cancelled: "The rider cancelled" },
  },
  flights: {
    key: "flights",
    label: "Flights",
    blurb: "Air tickets sold by airlines and travel agents",
    provider: "Airline",
    customer: "Traveller",
    providerMeans: "the airline or agent selling the seat",
    customerMeans: "the person flying",
    unit: "seat",
    unitPlural: "seats",
    cta: "Book seat",
    quantity: true,
    providerNoun: "flights flown as booked",
    customerNoun: "flights taken as booked",
    customerAsks: { completed: "The flight operated as booked", accurate: "The fare matched what was advertised", cancelled: "The airline cancelled" },
    providerAsks: { showedUp: "The traveller boarded", paid: "Paid as agreed", cancelled: "The traveller cancelled" },
  },
  experiences: {
    key: "experiences",
    label: "Tours & experiences",
    blurb: "Guided tours, treks and day experiences",
    provider: "Guide",
    customer: "Traveller",
    providerMeans: "the person running the tour",
    customerMeans: "the person joining the tour",
    unit: "seat",
    unitPlural: "seats",
    cta: "Join tour",
    quantity: true,
    providerNoun: "tours run as promised",
    customerNoun: "tours attended",
    customerAsks: { completed: "The tour ran", accurate: "The tour matched the description", cancelled: "The guide cancelled" },
    providerAsks: { showedUp: "The traveller turned up", paid: "Paid as agreed", cancelled: "The traveller cancelled" },
  },
  groceries: {
    key: "groceries",
    label: "Groceries",
    blurb: "Food and household orders delivered to the door",
    provider: "Store",
    customer: "Shopper",
    providerMeans: "the shop packing and sending the order",
    customerMeans: "the person who ordered and pays",
    unit: "order",
    unitPlural: "orders",
    cta: "Place order",
    quantity: false,
    providerNoun: "orders delivered",
    customerNoun: "orders completed",
    customerAsks: { completed: "The order was delivered", accurate: "The items matched the order", cancelled: "The store cancelled" },
    providerAsks: { showedUp: "Someone was there to receive it", paid: "Paid as agreed", cancelled: "The shopper cancelled" },
  },
  dining: {
    key: "dining",
    label: "Dining",
    blurb: "Restaurant tables held on a reservation",
    provider: "Restaurant",
    customer: "Diner",
    providerMeans: "the restaurant holding the table",
    customerMeans: "the person who reserved the table",
    unit: "table",
    unitPlural: "tables",
    cta: "Reserve table",
    quantity: false,
    providerNoun: "reservations honoured",
    customerNoun: "reservations honoured",
    customerAsks: { completed: "The table was held", accurate: "The menu matched the listing", cancelled: "The restaurant cancelled" },
    providerAsks: { showedUp: "The diner arrived", paid: "Paid the bill", cancelled: "The diner cancelled" },
  },
  it_projects: {
    key: "it_projects",
    label: "IT projects",
    blurb: "Software and design work delivered to a brief",
    provider: "Freelancer",
    customer: "Client",
    providerMeans: "the person doing the work",
    customerMeans: "the business paying for the work",
    unit: "project",
    unitPlural: "projects",
    cta: "Hire",
    quantity: false,
    providerNoun: "projects delivered",
    customerNoun: "projects completed as client",
    customerAsks: { completed: "The work was delivered", accurate: "Delivered what was agreed", cancelled: "The freelancer abandoned it" },
    providerAsks: { showedUp: "The client stayed responsive", paid: "Paid as agreed", cancelled: "The client cancelled" },
  },
  tutoring: {
    key: "tutoring",
    label: "Tutoring & classes",
    blurb: "Lessons taught one-to-one or in small batches",
    provider: "Tutor",
    customer: "Student",
    providerMeans: "the person teaching the class",
    customerMeans: "the person (or parent) paying for lessons",
    unit: "session",
    unitPlural: "sessions",
    cta: "Book session",
    quantity: true,
    providerNoun: "sessions taught as booked",
    customerNoun: "sessions attended",
    customerAsks: { completed: "The session was taught", accurate: "Matched the syllabus promised", cancelled: "The tutor cancelled" },
    providerAsks: { showedUp: "The student attended", paid: "Paid as agreed", cancelled: "The student cancelled" },
  },
  home_services: {
    key: "home_services",
    label: "Home services",
    blurb: "Cleaning, plumbing, electrical and repair visits",
    provider: "Professional",
    customer: "Homeowner",
    providerMeans: "the tradesperson who comes to the house",
    customerMeans: "the person whose home is being serviced",
    unit: "visit",
    unitPlural: "visits",
    cta: "Book visit",
    quantity: false,
    providerNoun: "jobs finished",
    customerNoun: "visits completed",
    customerAsks: { completed: "The job was finished", accurate: "The work matched the quote", cancelled: "The professional cancelled" },
    providerAsks: { showedUp: "Someone let them in", paid: "Paid as agreed", cancelled: "The homeowner cancelled" },
  },
  beauty: {
    key: "beauty",
    label: "Salon & wellness",
    blurb: "Salon chairs, spa slots and wellness appointments",
    provider: "Salon",
    customer: "Client",
    providerMeans: "the salon or therapist providing the service",
    customerMeans: "the person in the chair",
    unit: "appointment",
    unitPlural: "appointments",
    cta: "Book slot",
    quantity: false,
    providerNoun: "appointments honoured",
    customerNoun: "appointments attended",
    customerAsks: { completed: "The appointment happened", accurate: "The service matched the listing", cancelled: "The salon cancelled" },
    providerAsks: { showedUp: "The client arrived", paid: "Paid as agreed", cancelled: "The client cancelled" },
  },
  healthcare: {
    key: "healthcare",
    label: "Clinic appointments",
    blurb: "Doctor and diagnostic slots — attendance only, never health data",
    provider: "Clinic",
    customer: "Patient",
    providerMeans: "the clinic holding the slot",
    customerMeans: "the person who booked the slot",
    unit: "appointment",
    unitPlural: "appointments",
    cta: "Book appointment",
    quantity: false,
    providerNoun: "appointments honoured",
    customerNoun: "appointments attended",
    customerAsks: { completed: "The appointment happened", accurate: "The fee matched what was quoted", cancelled: "The clinic cancelled" },
    providerAsks: { showedUp: "The patient attended", paid: "Paid as agreed", cancelled: "The patient cancelled" },
  },
  pet_care: {
    key: "pet_care",
    label: "Pet care",
    blurb: "Boarding, walking and grooming for pets",
    provider: "Sitter",
    customer: "Pet owner",
    providerMeans: "the person looking after the animal",
    customerMeans: "the person who owns the pet",
    unit: "day",
    unitPlural: "days",
    cta: "Book sitter",
    quantity: true,
    providerNoun: "pet bookings completed",
    customerNoun: "pet bookings completed",
    customerAsks: { completed: "The pet was cared for", accurate: "Matched what was promised", cancelled: "The sitter cancelled" },
    providerAsks: { showedUp: "The pet was dropped off as planned", paid: "Paid as agreed", cancelled: "The owner cancelled" },
  },
  courier: {
    key: "courier",
    label: "Courier & delivery",
    blurb: "Parcels moved across the city or across states",
    provider: "Courier",
    customer: "Sender",
    providerMeans: "the company or rider carrying the parcel",
    customerMeans: "the person sending the parcel",
    unit: "parcel",
    unitPlural: "parcels",
    cta: "Send parcel",
    quantity: false,
    providerNoun: "parcels delivered",
    customerNoun: "shipments completed",
    customerAsks: { completed: "The parcel arrived", accurate: "Arrived intact and on time", cancelled: "The courier dropped the job" },
    providerAsks: { showedUp: "The parcel was ready for pickup", paid: "Paid as agreed", cancelled: "The sender cancelled" },
  },
  equipment: {
    key: "equipment",
    label: "Equipment rental",
    blurb: "Cameras, tools and gear rented by the day",
    provider: "Owner",
    customer: "Renter",
    providerMeans: "the person who owns the equipment",
    customerMeans: "the person borrowing it",
    unit: "day",
    unitPlural: "days",
    cta: "Rent gear",
    quantity: true,
    providerNoun: "equipment rentals completed",
    customerNoun: "equipment rentals completed",
    customerAsks: { completed: "The gear was handed over", accurate: "The gear matched the listing", cancelled: "The owner cancelled" },
    providerAsks: { showedUp: "Collected and returned on time", paid: "Paid as agreed", cancelled: "The renter cancelled" },
  },
  coworking: {
    key: "coworking",
    label: "Coworking",
    blurb: "Desks and meeting rooms booked by the day",
    provider: "Space",
    customer: "Member",
    providerMeans: "the coworking space providing the desk",
    customerMeans: "the person using the desk",
    unit: "day",
    unitPlural: "days",
    cta: "Book desk",
    quantity: true,
    providerNoun: "desk bookings honoured",
    customerNoun: "desk bookings used",
    customerAsks: { completed: "The desk was available", accurate: "The space matched the listing", cancelled: "The space cancelled" },
    providerAsks: { showedUp: "The member turned up", paid: "Paid as agreed", cancelled: "The member cancelled" },
  },
  events: {
    key: "events",
    label: "Events & venues",
    blurb: "Halls, studios and event spaces hired for a day",
    provider: "Venue",
    customer: "Organiser",
    providerMeans: "the venue being hired out",
    customerMeans: "the person organising the event",
    unit: "day",
    unitPlural: "days",
    cta: "Hold venue",
    quantity: true,
    providerNoun: "events hosted as booked",
    customerNoun: "events held as booked",
    customerAsks: { completed: "The venue was available", accurate: "The venue matched the listing", cancelled: "The venue cancelled" },
    providerAsks: { showedUp: "The organiser ran the event", paid: "Paid as agreed", cancelled: "The organiser cancelled" },
  },
};

export const CATEGORY_ORDER: Category[] = [
  "stays",
  "hotels",
  "flights",
  "experiences",
  "rides",
  "car_rental",
  "bikes",
  "dining",
  "groceries",
  "courier",
  "it_projects",
  "tutoring",
  "home_services",
  "beauty",
  "healthcare",
  "pet_care",
  "equipment",
  "coworking",
  "events",
];

/** "Host (the person who owns the home and rents it out)" */
export function providerRole(category: Category) {
  const c = CATEGORIES[category];
  return `${c.provider} (${c.providerMeans})`;
}

/** "Guest (the person staying in the home)" */
export function customerRole(category: Category) {
  const c = CATEGORIES[category];
  return `${c.customer} (${c.customerMeans})`;
}
