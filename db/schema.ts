import {sqliteTable,text,index} from "drizzle-orm/sqlite-core";
export const analysisUsage=sqliteTable("analysis_usage",{
  id:text("id").primaryKey(),day:text("day").notNull(),ipHash:text("ip_hash").notNull(),browserHash:text("browser_hash").notNull(),sessionHash:text("session_hash").notNull(),
},t=>[index("usage_ip").on(t.day,t.ipHash),index("usage_browser").on(t.day,t.browserHash),index("usage_session").on(t.day,t.sessionHash)]);
