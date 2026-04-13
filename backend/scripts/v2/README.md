```bash
cd backend
python -m scripts.v2.import_hpo --dry-run --no-translate
python -m scripts.v2.import_hpo --no-translate
python -m scripts.v2.import_hpo   # z tłumaczeniami — wymaga REDIS_CACHE_URL i limitów MyMemory
```

W Dockerze (tak jak przy teście): docker compose run --rm --no-deps backend python -m scripts.v2.import_hpo … (przy pełnym imporcie potrzebna działająca baza z DATABASE_URL w .env).

### Uruchamanie tłumaczenia 

```bash
python -m scripts.v2.backfill_hpo_labels_pl --limit 400 --delay 0.3
```

### Przydatne flagi 

- dry-run — tylko liczy brakujące label_pl, pokazuje do 5 przykładów, bez Redis, MyMemory i zapisów.
- limit 200 — mniejsza dzienna partia pod limit API.
- delay 0.5 — wolniej = mniej requestów na minutę.