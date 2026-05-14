-- Grounds table: UK cricket clubs
create table grounds (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  club text,
  city text,
  county text,
  lat decimal(9,6) not null,
  lng decimal(9,6) not null,
  pitch_type text,
  created_at timestamp with time zone default now()
);

-- Reports table: every pitch analysis ever run
create table reports (
  id uuid default gen_random_uuid() primary key,
  ground_id uuid references grounds(id),
  ground_name text,
  photo_url text,
  weather jsonb,
  prediction jsonb,
  overs integer default 40,
  match_date date default current_date,
  feedback jsonb,
  created_at timestamp with time zone default now()
);

-- Seed 5 real UK grounds
insert into grounds (name, club, city, county, lat, lng, pitch_type) values
  ('Old Trafford CC', 'Old Trafford CC', 'Manchester', 'Lancashire', 53.4572, -2.2920, 'seam friendly'),
  ('Headingley CC', 'Headingley CC', 'Leeds', 'Yorkshire', 53.8175, -1.5796, 'seam and bounce'),
  ('Lords CC', 'Lords CC', 'London', 'Middlesex', 51.5294, -0.1725, 'true batting track'),
  ('Edgbaston CC', 'Edgbaston CC', 'Birmingham', 'Warwickshire', 52.4558, -1.9022, 'spin friendly later'),
  ('The Oval CC', 'The Oval CC', 'London', 'Surrey', 51.4816, -0.1149, 'good batting surface');
