import { pgTable, text, jsonb, timestamp, serial } from "drizzle-orm/pg-core";

export const schoolMapData = pgTable("school_map_data", {
  key:     text("key").primaryKey().default("main"),
  schools: jsonb("schools").notNull().default([]),
  tobacco: jsonb("tobacco").notNull().default([]),
  savedAt: timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
});

export const schoolMapChangelog = pgTable("school_map_changelog", {
  id:              serial("id").primaryKey(),
  savedAt:         timestamp("saved_at", { withTimezone: true }).notNull().defaultNow(),
  adminName:       text("admin_name"),
  schoolsAdded:    text("schools_added").array().default([]),
  schoolsRemoved:  text("schools_removed").array().default([]),
  tobaccoAdded:    text("tobacco_added").array().default([]),
  tobaccoRemoved:  text("tobacco_removed").array().default([]),
});

export type SchoolMapRow = typeof schoolMapData.$inferSelect;
export type ChangelogRow = typeof schoolMapChangelog.$inferSelect;
