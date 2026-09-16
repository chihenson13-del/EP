import type { EventType } from "@prisma/client"

/**
 * Single source of truth for how each event type changes the product's
 * terminology, suggested content, seating presets, and checklist.
 * Nothing else in the app should hard-code wedding-specific language —
 * everything reads from here based on the event's selected type.
 */

export type SeatingPreset = {
  key: string
  label: string
}

export type EventTypeConfig = {
  key: EventType
  label: string
  shortLabel: string
  emoji: string
  hostLabel: string
  hostLabelPlural: string
  celebrantLabel: string
  description: string
  defaultRsvpQuestions: Array<{
    label: string
    type: "YES_NO" | "MULTIPLE_CHOICE" | "SHORT_TEXT"
    options?: string[]
  }>
  suggestedSections: string[]
  seatingPresets: SeatingPreset[]
  checklist: string[]
}

export const EVENT_TYPE_CONFIG: Record<EventType, EventTypeConfig> = {
  BIRTHDAY: {
    key: "BIRTHDAY",
    label: "Birthday",
    shortLabel: "Birthday",
    emoji: "🎂",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Celebrant",
    description: "A birthday celebration for any age.",
    defaultRsvpQuestions: [
      { label: "Any allergies we should know about?", type: "SHORT_TEXT" },
    ],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "family", label: "Family" },
      { key: "friends", label: "Friends" },
      { key: "kids", label: "Kids Area" },
      { key: "cake_table", label: "Cake Table" },
      { key: "gift_table", label: "Gift Table" },
    ],
    checklist: ["Set date & venue", "Pick a theme", "Build guest list", "Send invitations", "Plan seating", "Order cake", "Confirm RSVPs", "Prepare check-in"],
  },
  KIDS_PARTY: {
    key: "KIDS_PARTY",
    label: "Kids Party",
    shortLabel: "Kids Party",
    emoji: "🎈",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Guest of Honor",
    description: "A party for kids — playful, colorful, fun.",
    defaultRsvpQuestions: [
      { label: "Child's age", type: "SHORT_TEXT" },
      { label: "Any allergies?", type: "SHORT_TEXT" },
    ],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "kids", label: "Kids Area" },
      { key: "parents", label: "Parents" },
      { key: "cake_table", label: "Cake Table" },
      { key: "gift_table", label: "Gift Table" },
      { key: "activity_area", label: "Activity Area" },
    ],
    checklist: ["Set date & venue", "Pick a theme", "Build guest list", "Send invitations", "Plan activities", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  WEDDING: {
    key: "WEDDING",
    label: "Wedding",
    shortLabel: "Wedding",
    emoji: "💍",
    hostLabel: "Couple",
    hostLabelPlural: "Couple",
    celebrantLabel: "Couple",
    description: "A wedding celebration.",
    defaultRsvpQuestions: [
      { label: "Meal preference", type: "MULTIPLE_CHOICE", options: ["Chicken", "Beef", "Vegetarian"] },
      { label: "Song request", type: "SHORT_TEXT" },
    ],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "DESCRIPTION", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "DRESS_CODE", "GIFT_INFO", "FOOTER"],
    seatingPresets: [
      { key: "bride_side", label: "Bride's Side" },
      { key: "groom_side", label: "Groom's Side" },
      { key: "head_table", label: "Head Table" },
      { key: "dance_floor", label: "Dance Floor" },
    ],
    checklist: ["Set date & venue", "Pick a theme", "Build guest list", "Send save-the-dates", "Send invitations", "Track RSVPs", "Plan seating", "Confirm meal counts", "Prepare check-in"],
  },
  DEBUT: {
    key: "DEBUT",
    label: "Debut",
    shortLabel: "Debut",
    emoji: "👑",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Debutante/Debutant",
    description: "An 18th birthday debut celebration.",
    defaultRsvpQuestions: [{ label: "Are you one of the 18 Roses/Candles/Stars?", type: "YES_NO" }],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "family", label: "Family" },
      { key: "eighteen_roses", label: "18 Roses" },
      { key: "eighteen_candles", label: "18 Candles" },
      { key: "eighteen_stars", label: "18 Treasures/Stars" },
    ],
    checklist: ["Set date & venue", "Pick a theme", "Assign 18 roses/candles/stars", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  BAPTISM: {
    key: "BAPTISM",
    label: "Baptism",
    shortLabel: "Baptism",
    emoji: "🕊️",
    hostLabel: "Parents",
    hostLabelPlural: "Parents",
    celebrantLabel: "Child",
    description: "A baptism / christening celebration.",
    defaultRsvpQuestions: [{ label: "Are you a godparent?", type: "YES_NO" }],
    suggestedSections: ["HERO", "HOST", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "family", label: "Family" },
      { key: "godparents", label: "Godparents" },
      { key: "friends", label: "Friends" },
    ],
    checklist: ["Set date & venue", "Confirm godparents", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  GRADUATION: {
    key: "GRADUATION",
    label: "Graduation",
    shortLabel: "Graduation",
    emoji: "🎓",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Graduate",
    description: "A graduation celebration.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "stage", label: "Stage" },
      { key: "registration", label: "Registration" },
      { key: "audience", label: "Audience" },
      { key: "family", label: "Family" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  ANNIVERSARY: {
    key: "ANNIVERSARY",
    label: "Anniversary",
    shortLabel: "Anniversary",
    emoji: "💐",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Celebrants",
    description: "An anniversary celebration.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "family", label: "Family" },
      { key: "friends", label: "Friends" },
      { key: "head_table", label: "Head Table" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  BABY_SHOWER: {
    key: "BABY_SHOWER",
    label: "Baby Shower",
    shortLabel: "Baby Shower",
    emoji: "🍼",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Parent(s)-to-be",
    description: "A baby shower celebration.",
    defaultRsvpQuestions: [{ label: "Boy, girl, or surprise guess?", type: "SHORT_TEXT" }],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "GIFT_INFO", "FOOTER"],
    seatingPresets: [
      { key: "family", label: "Family" },
      { key: "friends", label: "Friends" },
      { key: "gift_table", label: "Gift Table" },
      { key: "games_area", label: "Games Area" },
    ],
    checklist: ["Set date & venue", "Create registry", "Send invitations", "Plan games", "Plan seating", "Confirm RSVPs"],
  },
  BRIDAL_SHOWER: {
    key: "BRIDAL_SHOWER",
    label: "Bridal Shower",
    shortLabel: "Bridal Shower",
    emoji: "💐",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Bride-to-be",
    description: "A bridal shower celebration.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "GIFT_INFO", "FOOTER"],
    seatingPresets: [
      { key: "family", label: "Family" },
      { key: "friends", label: "Friends" },
      { key: "gift_table", label: "Gift Table" },
    ],
    checklist: ["Set date & venue", "Create registry", "Send invitations", "Plan games", "Plan seating", "Confirm RSVPs"],
  },
  CORPORATE: {
    key: "CORPORATE",
    label: "Corporate Event",
    shortLabel: "Corporate",
    emoji: "🏢",
    hostLabel: "Organizer",
    hostLabelPlural: "Organizers",
    celebrantLabel: "Guest of Honor",
    description: "A corporate event, party, or celebration.",
    defaultRsvpQuestions: [{ label: "Company / department", type: "SHORT_TEXT" }],
    suggestedSections: ["HERO", "HOST", "VENUE", "DESCRIPTION", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "vip", label: "VIP" },
      { key: "employees", label: "Employees" },
      { key: "clients", label: "Clients" },
      { key: "registration", label: "Registration" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan agenda", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  CONFERENCE: {
    key: "CONFERENCE",
    label: "Conference",
    shortLabel: "Conference",
    emoji: "🎤",
    hostLabel: "Organizer",
    hostLabelPlural: "Organizers",
    celebrantLabel: "Keynote Speaker",
    description: "A conference or summit.",
    defaultRsvpQuestions: [{ label: "Which sessions will you attend?", type: "SHORT_TEXT" }],
    suggestedSections: ["HERO", "HOST", "VENUE", "DESCRIPTION", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "stage", label: "Stage" },
      { key: "audience", label: "Audience" },
      { key: "registration", label: "Registration" },
      { key: "booths", label: "Booths" },
    ],
    checklist: ["Set date & venue", "Build agenda", "Open registration", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  SEMINAR: {
    key: "SEMINAR",
    label: "Seminar",
    shortLabel: "Seminar",
    emoji: "📋",
    hostLabel: "Organizer",
    hostLabelPlural: "Organizers",
    celebrantLabel: "Speaker",
    description: "A seminar or training session.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "VENUE", "DESCRIPTION", "SCHEDULE", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "stage", label: "Stage" },
      { key: "audience", label: "Audience" },
      { key: "registration", label: "Registration" },
    ],
    checklist: ["Set date & venue", "Build agenda", "Open registration", "Send invitations", "Plan seating", "Confirm RSVPs"],
  },
  SCHOOL_EVENT: {
    key: "SCHOOL_EVENT",
    label: "School Event",
    shortLabel: "School Event",
    emoji: "🏫",
    hostLabel: "Organizer",
    hostLabelPlural: "Organizers",
    celebrantLabel: "Honoree",
    description: "A school event, program, or ceremony.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "stage", label: "Stage" },
      { key: "audience", label: "Audience" },
      { key: "registration", label: "Registration" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  FAMILY_REUNION: {
    key: "FAMILY_REUNION",
    label: "Family Reunion",
    shortLabel: "Family Reunion",
    emoji: "👨‍👩‍👧‍👦",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Family",
    description: "A family reunion gathering.",
    defaultRsvpQuestions: [{ label: "Which family branch are you from?", type: "SHORT_TEXT" }],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "family_branch_1", label: "Family Branch A" },
      { key: "family_branch_2", label: "Family Branch B" },
      { key: "kids", label: "Kids Area" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan activities", "Plan seating", "Confirm RSVPs"],
  },
  DINNER: {
    key: "DINNER",
    label: "Dinner",
    shortLabel: "Dinner",
    emoji: "🍽️",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Guest of Honor",
    description: "A dinner event.",
    defaultRsvpQuestions: [{ label: "Meal preference", type: "MULTIPLE_CHOICE", options: ["Chicken", "Beef", "Vegetarian"] }],
    suggestedSections: ["HERO", "HOST", "VENUE", "SCHEDULE", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "vip", label: "VIP" },
      { key: "guests", label: "Guests" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan menu", "Plan seating", "Confirm RSVPs"],
  },
  PARTY: {
    key: "PARTY",
    label: "Party",
    shortLabel: "Party",
    emoji: "🎉",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Guest of Honor",
    description: "A general party.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "guests", label: "Guests" },
      { key: "dance_floor", label: "Dance Floor" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan seating", "Confirm RSVPs"],
  },
  COMMUNITY_EVENT: {
    key: "COMMUNITY_EVENT",
    label: "Community Event",
    shortLabel: "Community",
    emoji: "🤝",
    hostLabel: "Organizer",
    hostLabelPlural: "Organizers",
    celebrantLabel: "Guest of Honor",
    description: "A community gathering or event.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "VENUE", "DESCRIPTION", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "registration", label: "Registration" },
      { key: "audience", label: "Audience" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  PRODUCT_LAUNCH: {
    key: "PRODUCT_LAUNCH",
    label: "Product Launch",
    shortLabel: "Product Launch",
    emoji: "🚀",
    hostLabel: "Organizer",
    hostLabelPlural: "Organizers",
    celebrantLabel: "Product",
    description: "A product launch event.",
    defaultRsvpQuestions: [{ label: "Company / media outlet", type: "SHORT_TEXT" }],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "DESCRIPTION", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "press", label: "Press" },
      { key: "vip", label: "VIP" },
      { key: "guests", label: "Guests" },
      { key: "registration", label: "Registration" },
    ],
    checklist: ["Set date & venue", "Build press/guest list", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  COMPANY_CELEBRATION: {
    key: "COMPANY_CELEBRATION",
    label: "Company Celebration",
    shortLabel: "Company Event",
    emoji: "🎊",
    hostLabel: "Organizer",
    hostLabelPlural: "Organizers",
    celebrantLabel: "Company",
    description: "A company milestone celebration.",
    defaultRsvpQuestions: [{ label: "Department", type: "SHORT_TEXT" }],
    suggestedSections: ["HERO", "HOST", "COUNTDOWN", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [
      { key: "leadership", label: "Leadership" },
      { key: "employees", label: "Employees" },
      { key: "registration", label: "Registration" },
    ],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan seating", "Confirm RSVPs", "Prepare check-in"],
  },
  CUSTOM: {
    key: "CUSTOM",
    label: "Custom Event",
    shortLabel: "Custom",
    emoji: "✨",
    hostLabel: "Host",
    hostLabelPlural: "Hosts",
    celebrantLabel: "Guest of Honor",
    description: "Any other type of event.",
    defaultRsvpQuestions: [],
    suggestedSections: ["HERO", "HOST", "VENUE", "SCHEDULE", "GALLERY", "RSVP", "FAQ", "FOOTER"],
    seatingPresets: [{ key: "guests", label: "Guests" }],
    checklist: ["Set date & venue", "Build guest list", "Send invitations", "Plan seating", "Confirm RSVPs"],
  },
}

export function getEventTypeConfig(type: EventType): EventTypeConfig {
  return EVENT_TYPE_CONFIG[type] ?? EVENT_TYPE_CONFIG.CUSTOM
}

export const EVENT_TYPE_OPTIONS: Array<{ value: EventType; label: string; emoji: string }> =
  Object.values(EVENT_TYPE_CONFIG).map((c) => ({ value: c.key, label: c.label, emoji: c.emoji }))
