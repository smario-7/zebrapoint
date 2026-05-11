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

## Embeddingi i opisy soczewek (`generate_lens_embeddings`)

Wypełnia kolumny `description` (OpenAI `gpt-4o-mini`, po polsku) oraz `embedding` (model `paraphrase-multilingual-MiniLM-L12-v2`, 384D) dla tabeli `lenses`. Tekst do wektora: nazwa + opis (jeśli jest) + do 20 etykiet HPO z `hpo_terms` (dla soczewek z `hpo_cluster`).

**Wymagane w `.env`:** `DATABASE_URL`. Opisy: `OPENAI_API_KEY` oraz `HPO_EXTRACTION_ENABLED=true` (domyślnie włączone). Bez klucza API opisy zostaną pominięte (`description` = NULL), embedding i tak powstanie z nazwy (+ HPO).

**Zależności ML:** obraz Dockera backendu instaluje `requirements-heavy.txt` (m.in. `sentence-transformers`). Lokalnie bez tego pakietu enkoder się nie uruchomi.

```bash
cd backend
python -m scripts.v2.generate_lens_embeddings --dry-run
python -m scripts.v2.generate_lens_embeddings --dry-run --all
python -m scripts.v2.generate_lens_embeddings --no-llm
python -m scripts.v2.generate_lens_embeddings
python -m scripts.v2.generate_lens_embeddings --all
python -m scripts.v2.generate_lens_embeddings --lens-id <UUID>
```

Domyślnie (bez `--all` i bez `--lens-id`) skrypt bierze tylko **aktywne** soczewki z **`embedding IS NULL`**. Jeśli wszystkie mają już wektor, zobaczysz „0 soczewek” — wtedy `--dry-run --all` pokazuje pełną listę wg `is_active`, a `--all` pozwala je przeliczyć od zera.

### Flagi `generate_lens_embeddings`

| Flaga | Działanie |
|--------|-----------|
| `--dry-run` | Liczy soczewki wg filtra, wypisuje podział na `type`; bez zapisu do bazy i bez ładowania modelu ST. |
| `--no-llm` | Pomija wywołania OpenAI — tylko embedding (nazwa + ewent. etykiety HPO w tekście wejściowym). |
| `--all` | Uwzględnia też soczewki z już ustawionym `embedding` (pełna regeneracja listy spełniającej `is_active`). |
| `--lens-id UUID` | Jedna soczewka (debug); ignoruje warunek „brak embeddingu”. |

W Dockerze (z modelem ST w obrazie): `docker compose run --rm --no-deps backend python -m scripts.v2.generate_lens_embeddings …`

Zadanie Celery (ta sama logika wsadowa): `v2.generate_lens_embeddings` / `v2.generate_single_lens_embedding` w `app.workers.v2.embedding_tasks`.
