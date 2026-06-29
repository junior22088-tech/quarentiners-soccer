-- =============================================
-- Quarentiners Soccer - Copa do Mundo 2026
-- Schema Completo + Dados
-- =============================================

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_emoji text default '⚽',
  is_admin boolean default false,
  onboarding_done boolean default false,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "profiles_select_all" on public.profiles for select using (true);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- TEAMS
-- =============================================
create table public.teams (
  id serial primary key,
  name text not null,
  flag text not null,
  eliminated boolean default false
);

insert into public.teams (id, name, flag) values
  (1,  'Brasil',               '🇧🇷'),
  (2,  'Japão',                '🇯🇵'),
  (3,  'Alemanha',             '🇩🇪'),
  (4,  'Paraguai',             '🇵🇾'),
  (5,  'Holanda',              '🇳🇱'),
  (6,  'Marrocos',             '🇲🇦'),
  (7,  'Costa do Marfim',      '🇨🇮'),
  (8,  'Noruega',              '🇳🇴'),
  (9,  'França',               '🇫🇷'),
  (10, 'Suécia',               '🇸🇪'),
  (11, 'México',               '🇲🇽'),
  (12, 'Equador',              '🇪🇨'),
  (13, 'Inglaterra',           '🏴󠁧󠁢󠁥󠁮󠁧󠁿'),
  (14, 'RD Congo',             '🇨🇩'),
  (15, 'Bélgica',              '🇧🇪'),
  (16, 'Senegal',              '🇸🇳'),
  (17, 'Estados Unidos',       '🇺🇸'),
  (18, 'Bósnia e Herzegovina', '🇧🇦'),
  (19, 'Espanha',              '🇪🇸'),
  (20, 'Áustria',              '🇦🇹'),
  (21, 'Portugal',             '🇵🇹'),
  (22, 'Croácia',              '🇭🇷'),
  (23, 'Suíça',                '🇨🇭'),
  (24, 'Argélia',              '🇩🇿'),
  (25, 'Austrália',            '🇦🇺'),
  (26, 'Egito',                '🇪🇬'),
  (27, 'Argentina',            '🇦🇷'),
  (28, 'Cabo Verde',           '🇨🇻'),
  (29, 'Colômbia',             '🇨🇴'),
  (30, 'Gana',                 '🇬🇭'),
  (31, 'Canadá',               '🇨🇦'),
  (32, 'África do Sul',        '🇿🇦');

-- =============================================
-- MATCHES
-- =============================================
create table public.matches (
  id serial primary key,
  phase text not null check (phase in ('16avos','oitavas','quartas','semi','final')),
  match_label text,
  home_team_id integer references public.teams(id),
  away_team_id integer references public.teams(id),
  scheduled_at timestamptz,
  location text,
  home_score integer,
  away_score integer,
  went_to_penalties boolean default false,
  winner_id integer references public.teams(id),
  is_finished boolean default false,
  is_locked boolean default false,
  display_order integer default 0,
  next_match_id integer,
  next_match_position text check (next_match_position in ('home','away'))
);

-- =============================================
-- 16avos de Final (todos os horários em UTC)
-- BRT = UTC-3
-- =============================================
insert into public.matches (phase, match_label, home_team_id, away_team_id, scheduled_at, location,
  home_score, away_score, winner_id, is_finished, is_locked, display_order) values

-- 28/jun (16h BRT = 19h UTC) — ENCERRADO
('16avos','Jogo 1',  32, 31, '2026-06-28T19:00:00Z', 'Los Angeles',
  0, 1, 31, true, true, 1),

-- 29/jun
('16avos','Jogo 2',   1,  2, '2026-06-29T17:00:00Z', 'Houston',
  null, null, null, false, true, 2),   -- Brasil × Japão — lockado (já joga)

('16avos','Jogo 3',   3,  4, '2026-06-29T20:30:00Z', 'Boston',
  null, null, null, false, false, 3),  -- Alemanha × Paraguai

('16avos','Jogo 4',   5,  6, '2026-06-30T01:00:00Z', 'Monterrey',
  null, null, null, false, false, 4),  -- Holanda × Marrocos

-- 30/jun
('16avos','Jogo 5',   7,  8, '2026-06-30T17:00:00Z', 'Dallas',
  null, null, null, false, false, 5),  -- Costa do Marfim × Noruega

('16avos','Jogo 6',   9, 10, '2026-06-30T21:00:00Z', 'Kansas City',
  null, null, null, false, false, 6),  -- França × Suécia

('16avos','Jogo 7',  11, 12, '2026-07-01T01:00:00Z', 'Cidade do México',
  null, null, null, false, false, 7),  -- México × Equador

-- 01/jul
('16avos','Jogo 8',  13, 14, '2026-07-01T16:00:00Z', 'Atlanta',
  null, null, null, false, false, 8),  -- Inglaterra × RD Congo

('16avos','Jogo 9',  15, 16, '2026-07-01T20:00:00Z', 'Seattle',
  null, null, null, false, false, 9),  -- Bélgica × Senegal

('16avos','Jogo 10', 17, 18, '2026-07-02T00:00:00Z', 'New York/NJ',
  null, null, null, false, false, 10), -- EUA × Bósnia

-- 02/jul
('16avos','Jogo 11', 19, 20, '2026-07-02T19:00:00Z', 'Los Angeles',
  null, null, null, false, false, 11), -- Espanha × Áustria

('16avos','Jogo 12', 21, 22, '2026-07-02T23:00:00Z', 'Toronto',
  null, null, null, false, false, 12), -- Portugal × Croácia

-- 03/jul
('16avos','Jogo 13', 23, 24, '2026-07-03T03:00:00Z', 'Vancouver',
  null, null, null, false, false, 13), -- Suíça × Argélia

('16avos','Jogo 14', 25, 26, '2026-07-03T18:00:00Z', 'Dallas',
  null, null, null, false, false, 14), -- Austrália × Egito

('16avos','Jogo 15', 27, 28, '2026-07-03T22:00:00Z', 'Miami',
  null, null, null, false, false, 15), -- Argentina × Cabo Verde

('16avos','Jogo 16', 29, 30, '2026-07-04T01:30:00Z', 'Kansas City',
  null, null, null, false, false, 16); -- Colômbia × Gana

-- =============================================
-- Oitavas (TBD — serão preenchidas conforme avançam os jogos)
-- =============================================
insert into public.matches (phase, match_label, home_team_id, away_team_id, scheduled_at, is_locked, display_order) values
('oitavas', 'Oitavas A', null, null, '2026-07-04T00:00:00Z', true, 17),
('oitavas', 'Oitavas B', null, null, '2026-07-04T00:00:00Z', true, 18),
('oitavas', 'Oitavas C', null, null, '2026-07-05T00:00:00Z', true, 19),
('oitavas', 'Oitavas D', null, null, '2026-07-05T00:00:00Z', true, 20),
('oitavas', 'Oitavas E', null, null, '2026-07-06T00:00:00Z', true, 21),
('oitavas', 'Oitavas F', null, null, '2026-07-06T00:00:00Z', true, 22),
('oitavas', 'Oitavas G', null, null, '2026-07-07T00:00:00Z', true, 23),
('oitavas', 'Oitavas H', null, null, '2026-07-07T00:00:00Z', true, 24);

insert into public.matches (phase, match_label, home_team_id, away_team_id, scheduled_at, is_locked, display_order) values
('quartas', 'Quartas A', null, null, '2026-07-09T00:00:00Z', true, 25),
('quartas', 'Quartas B', null, null, '2026-07-10T00:00:00Z', true, 26),
('quartas', 'Quartas C', null, null, '2026-07-10T00:00:00Z', true, 27),
('quartas', 'Quartas D', null, null, '2026-07-11T00:00:00Z', true, 28);

insert into public.matches (phase, match_label, home_team_id, away_team_id, scheduled_at, is_locked, display_order) values
('semi', 'Semi 1', null, null, '2026-07-14T00:00:00Z', true, 29),
('semi', 'Semi 2', null, null, '2026-07-15T00:00:00Z', true, 30);

insert into public.matches (phase, match_label, home_team_id, away_team_id, scheduled_at, is_locked, display_order) values
('final', 'Final 🏆', null, null, '2026-07-19T19:00:00Z', true, 31);

-- =============================================
-- PREDICTIONS
-- =============================================
create table public.predictions (
  id serial primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  match_id integer references public.matches(id) on delete cascade not null,
  predicted_home_score integer,
  predicted_away_score integer,
  predicted_winner_id integer references public.teams(id),
  predicted_penalties boolean default false,
  is_updated boolean default false,
  points_earned numeric(6,2) default 0,
  breakdown text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, match_id)
);

alter table public.predictions enable row level security;
create policy "predictions_select" on public.predictions for select using (true);
create policy "predictions_insert" on public.predictions for insert
  with check (auth.uid() = user_id);
create policy "predictions_update_own" on public.predictions for update
  using (auth.uid() = user_id);

-- Admin pode atualizar pontos
create policy "predictions_admin_update" on public.predictions for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- =============================================
-- LEADERBOARD VIEW
-- =============================================
create or replace view public.leaderboard as
select
  p.id,
  p.username,
  p.avatar_emoji,
  coalesce(sum(pr.points_earned), 0)::numeric(10,2) as total_points,
  count(case when pr.points_earned > 0 then 1 end)::integer as correct_count,
  count(pr.id)::integer as total_predictions
from public.profiles p
left join public.predictions pr on p.id = pr.user_id
group by p.id, p.username, p.avatar_emoji
order by total_points desc, p.username asc;

-- =============================================
-- FUNÇÃO: Calcular e salvar pontos
-- Chamada pelo admin após entrar o resultado
-- =============================================
create or replace function public.calculate_match_points(p_match_id integer)
returns void language plpgsql security definer as $$
declare
  v_match record;
  v_pred record;
  v_base numeric := 0;
  v_bonus numeric := 0;
  v_multiplier numeric := 1;
  v_total numeric := 0;
  v_breakdown text := '';
  v_pred_diff integer;
  v_actual_diff integer;
begin
  select * into v_match from public.matches where id = p_match_id;
  if not found or not v_match.is_finished then return; end if;

  -- Multiplicador por fase
  v_multiplier := case v_match.phase
    when '16avos'  then 1.0
    when 'oitavas' then 1.5
    when 'quartas' then 2.0
    when 'semi'    then 3.0
    when 'final'   then 4.0
    else 1.0
  end;

  for v_pred in select * from public.predictions where match_id = p_match_id loop
    v_base := 0; v_bonus := 0; v_breakdown := '';

    -- Calcula diferença
    v_pred_diff   := coalesce(v_pred.predicted_home_score,0) - coalesce(v_pred.predicted_away_score,0);
    v_actual_diff := v_match.home_score - v_match.away_score;

    -- Placar exato
    if v_pred.predicted_home_score = v_match.home_score
       and v_pred.predicted_away_score = v_match.away_score then
      v_base := case when v_pred.is_updated then 6 else 10 end;
      v_breakdown := case when v_pred.is_updated then '🎯 Placar exato (atualizado)' else '🎯 Placar exato (original)' end;

    -- Vencedor + diferença
    elsif v_pred.predicted_winner_id = v_match.winner_id
       and v_pred_diff = v_actual_diff then
      v_base := case when v_pred.is_updated then 4 else 7 end;
      v_breakdown := case when v_pred.is_updated then '⚖️ Diferença certa (atualizado)' else '⚖️ Diferença certa (original)' end;

    -- Só o classificado
    elsif v_pred.predicted_winner_id = v_match.winner_id then
      v_base := case when v_pred.is_updated then 2 else 4 end;
      v_breakdown := case when v_pred.is_updated then '✅ Classificado certo (atualizado)' else '✅ Classificado certo (original)' end;
    end if;

    -- Bônus pênaltis
    if v_pred.predicted_penalties = true and v_match.went_to_penalties = true then
      v_bonus := 2;
      v_breakdown := v_breakdown || ' + 🟡 Pênaltis';
    end if;

    v_total := (v_base + v_bonus) * v_multiplier;

    update public.predictions
    set points_earned = v_total, breakdown = v_breakdown
    where id = v_pred.id;
  end loop;
end;
$$;
