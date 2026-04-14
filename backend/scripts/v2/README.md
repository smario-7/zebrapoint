## HPO

```bash
cd backend
python -m scripts.v2.import_hpo --dry-run --no-translate
python -m scripts.v2.import_hpo --no-translate
python -m scripts.v2.import_hpo   # z tłumaczeniami — wymaga REDIS_CACHE_URL i limitów MyMemory
```

W Dockerze (tak jak przy teście): docker compose run --rm --no-deps backend python -m scripts.v2.import_hpo … (przy pełnym imporcie potrzebna działająca baza z DATABASE_URL w .env).

### Uruchamianie tłumaczenia

```bash
python -m scripts.v2.backfill_hpo_labels_pl --limit 400 --delay 0.3
```

### Przydatne flagi (`backfill_hpo_labels_pl`)

- `--dry-run` — tylko liczy brakujące `label_pl`, pokazuje do 5 przykładów, bez Redis, MyMemory i zapisów.
- `--limit 200` — mniejsza dzienna partia pod limit API.
- `--delay 0.5` — wolniej = mniej requestów na minutę.

## Orphanet (`seed_orphanet`)

Jednorazowy zapis chorób do `orpha_diseases` i soczewek diagnostycznych do `lenses` z plików **Orphadata** (product9 PL+EN, product4 HPO). Cache: `scripts/v2/cache/orphadata/`.

**Wymagane w `.env`:** `DATABASE_URL`. `ORPHANET_API_KEY` nie jest potrzebny do seedu z XML.

```bash
cd backend
python -m scripts.v2.seed_orphanet --dry-run --limit 50
python -m scripts.v2.seed_orphanet
python -m scripts.v2.seed_orphanet --lenses-all
```

### Flagi `seed_orphanet`

| Flaga | Działanie |
|--------|-----------|
| `--dry-run` | Parsuje XML, loguje statystyki HPO vs `hpo_terms` i 5 pierwszych wierszy; bez zapisu. |
| `--refresh-xml` | Ponowne pobranie trzech plików XML z orphadata.com. |
| `--limit N` | Po sortowaniu zapisuje tylko **N** pierwszych chorób (test). |
| `--lenses-limit N` | Maks. **N** soczewek w batchu; domyślnie **200**. |
| `--lenses-all` | Soczewka dla każdej choroby z batcha (ignoruje `--lenses-limit`). |

W Dockerze: `docker compose run --rm --no-deps backend python -m scripts.v2.seed_orphanet …` (jak przy HPO — potrzebna baza i `DATABASE_URL` w środowisku kontenera).
