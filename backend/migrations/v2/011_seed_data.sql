INSERT INTO lenses (name, description, type, emoji, data_source, is_active) VALUES
    ('Diagnostyka — jak, gdzie, ile się czeka',
     'Doświadczenia rodziców w procesie diagnostycznym: lekarze, badania, czas oczekiwania.',
     'topical', '📋', 'admin', TRUE),
    ('Prawo — PFRON, orzeczenia, świadczenia',
     'Pomoc prawna, orzeczenia o niepełnosprawności, zasiłki i wsparcie finansowe.',
     'topical', '⚖️', 'admin', TRUE),
    ('Edukacja specjalna i szkoła',
     'Szkolnictwo specjalne, integracyjne, asystenci, IPETy i prawa dziecka w szkole.',
     'topical', '🏫', 'admin', TRUE),
    ('Terapie i rehabilitacja',
     'Metody terapeutyczne, rehabilitacja, fizjoterapia, terapia zajęciowa.',
     'topical', '💊', 'admin', TRUE),
    ('Polecani lekarze i szpitale',
     'Rekomendacje specjalistów, szpitali i ośrodków diagnostycznych.',
     'topical', '🏥', 'admin', TRUE),
    ('Za granicą — doświadczenia',
     'Diagnostyka i leczenie za granicą, kliniczne badania i programy pomocowe.',
     'topical', '🌍', 'admin', TRUE);

INSERT INTO lenses (name, description, type, emoji, data_source, is_active) VALUES
    ('Opóźnienie mowy u małego dziecka',
     'Rodzice dzieci z opóźnionym rozwojem mowy, zaburzeniami komunikacji i dysfazją.',
     'symptomatic', '💬', 'hpo_cluster', TRUE),
    ('Hipotonia — wiotkie mięśnie niemowlęcia',
     'Obniżone napięcie mięśniowe, problemy z siedzeniem, staniem i chodzeniem.',
     'symptomatic', '💬', 'hpo_cluster', TRUE),
    ('Napady drgawkowe i padaczka',
     'Różne rodzaje napadów, leczenie, monitorowanie i codzienne życie z padaczką.',
     'symptomatic', '💬', 'hpo_cluster', TRUE),
    ('Trudności z chodzeniem i koordynacją',
     'Ataksja, problemy z równowagą, chód i fizjoterapia neurologiczna.',
     'symptomatic', '💬', 'hpo_cluster', TRUE),
    ('Opóźniony rozwój psychomotoryczny',
     'Globalne opóźnienie rozwoju — motoryka, mowa i funkcje poznawcze.',
     'symptomatic', '💬', 'hpo_cluster', TRUE);

UPDATE lenses
SET embedding = ('[' || repeat('0,', 383) || '0]')::vector(384)
WHERE embedding IS NULL;
