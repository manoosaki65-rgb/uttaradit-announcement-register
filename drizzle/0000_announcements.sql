CREATE TABLE announcements (
 id text PRIMARY KEY,
 announcement_no text NOT NULL DEFAULT '',
 announcement_date text,
 subject text NOT NULL,
 amount double precision,
 budget_year integer,
 project_no text,
 note text,
 inventory_no text,
 inventory_date text,
 department text,
 status text,
 deleted boolean NOT NULL DEFAULT false,
 created_at text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
 updated_at text NOT NULL DEFAULT (to_char(now() AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')),
 created_order bigserial NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX number_year ON announcements(announcement_no,substring(announcement_date,1,4)) WHERE deleted=false AND announcement_no NOT IN ('','000','001');
