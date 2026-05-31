-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.


CREATE TABLE public.Cities (
  id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Cities_pkey PRIMARY KEY (id)
);
CREATE TABLE public.Districts (
  id integer GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying,
  lname character varying,
  city smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Districts_pkey PRIMARY KEY (id),
  CONSTRAINT Districts_city_fkey FOREIGN KEY (city) REFERENCES public.Cities(id)
);

CREATE TABLE public.Positions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  long real,
  lat real,
  type character varying,
  speed json,
  light smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Positions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.StreetPosition (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  pos_id bigint,
  street_id bigint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT StreetPosition_pkey PRIMARY KEY (id),
  CONSTRAINT StreetPosition_pos_id_fkey FOREIGN KEY (pos_id) REFERENCES public.Positions(id),
  CONSTRAINT StreetPosition_street_id_fkey FOREIGN KEY (street_id) REFERENCES public.Streets(id)
);
CREATE TABLE public.Streets (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name character varying,
  type character varying,
  district_id integer,
  city_id smallint,
  ban_id smallint,
  parking_id smallint,
  length smallint,
  direction smallint,
  speed smallint,
  lane_1 character varying,
  lane_2 character varying,
  lane_n smallint,
  toll smallint,
  flooding smallint,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT Streets_pkey PRIMARY KEY (id),
  CONSTRAINT Streets_city_id_fkey FOREIGN KEY (city_id) REFERENCES public.Cities(id),
  CONSTRAINT Streets_district_id_fkey FOREIGN KEY (district_id) REFERENCES public.Districts(id)
);