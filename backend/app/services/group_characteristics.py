import re
import logging
from collections import Counter
from sqlalchemy.orm import Session

from app.config import settings
from app.models.group import Group
from app.models.symptom_profile import SymptomProfile
from app.models.group_member import GroupMember
from app.services.group_ai_description import generate_group_ai_description

logger = logging.getLogger(__name__)

CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "Neurologiczne": [
        "mięśni", "napięcie", "drżenie", "drgawki", "epilepsja", "padaczka",
        "koordynacja", "chód", "równowaga", "ból głowy", "migrena", "omdlenie",
        "skurcz", "nerwowy", "mózg", "rdzeń", "nerw", "autyzm", "opóźnienie",
        "rozwój", "mowa", "motoryka", "koncentracja", "pamięć"
    ],
    "Metaboliczne": [
        "metabolizm", "cukier", "glukoza", "tarczyca", "hormon", "wzrost",
        "waga", "apetyt", "trawienie", "wątroba", "trzustka", "enzymy",
        "kwasy", "aminokwas", "tłuszcze", "cholesterol", "insulina", "cukrzyca"
    ],
    "Immunologiczne": [
        "immunologiczny", "autoimmun", "alergia", "zapalenie", "infekcja",
        "odporność", "przeciwciała", "limfocyt", "uczulenie", "wysypka",
        "pokrzywka", "egzema", "łuszczyca", "toczeń", "reumatyzm"
    ],
    "Genetyczne": [
        "genetyczny", "chromosom", "gen", "dziedziczny", "wrodzony", "mutacja",
        "syndrom", "zespół", "wada wrodzona", "aberracja", "delecja", "duplikacja"
    ],
    "Kardiologiczne": [
        "serce", "sercowy", "rytm", "tachykardia", "arytmia", "ciśnienie",
        "krążenie", "naczynia", "zawał", "wada serca", "kardiomiopatia"
    ],
    "Oddechowe": [
        "oddech", "płuca", "kaszel", "astma", "duszność", "oskrzela",
        "zwłóknienie", "mukowiscydoza", "chrypka", "bezdech"
    ],
    "Mięśniowo-szkieletowe": [
        "mięsień", "kość", "staw", "kręgosłup", "skolioza", "dystrofia",
        "myopatia", "artretyzm", "zanik", "przykurcz", "hipotonia"
    ],
}

STOPWORDS: frozenset[str] = frozenset({
    "jest", "nie", "się", "też", "już", "jak", "co", "to", "na", "do",
    "że", "ale", "lub", "oraz", "przez", "przy", "po", "od", "ma", "mam",
    "dziecko", "córka", "syn", "mama", "tata", "rodzic", "opiekun",
    "lekarz", "doktor", "szpital", "badanie", "wynik", "diagnoza",
    "objawy", "objaw", "problem", "który", "która", "tego", "więcej",
    "bardzo", "dużo", "trochę", "ciągle", "często", "zawsze", "nigdy",
    "mamy", "mają", "miał", "miała", "było", "była", "kiedy",
    "gdzie", "dlaczego", "ponieważ", "jednak", "chociaż", "właśnie",
    "tylko", "jeszcze", "teraz", "potem", "przed", "roku",
    "miesięcy", "tygodni", "dobrze", "źle", "więc", "temu",
    "jego", "jej", "ich", "nam", "nas", "pan", "pani",
})


def extract_keywords(texts: list[str], top_n: int = 5) -> list[str]:
    """
    Ekstrahuje top N słów kluczowych z listy tekstów przez TF-IDF.
    """
    if not texts:
        return []

    all_words: list[str] = []
    doc_word_sets: list[set[str]] = []

    for text in texts:
        raw_words = re.findall(
            r'\b[a-ząćęłńóśźżA-ZĄĆĘŁŃÓŚŹŻ]{4,}\b',
            text.lower()
        )
        clean_words = [w for w in raw_words if w not in STOPWORDS]
        doc_word_sets.append(set(clean_words))
        all_words.extend(clean_words)

    if not all_words:
        return []

    tf = Counter(all_words)
    n_docs = len(texts)
    tfidf_scores: dict[str, float] = {}
    for word, freq in tf.items():
        df = sum(1 for doc in doc_word_sets if word in doc)
        idf = n_docs / (df + 1)
        tfidf_scores[word] = freq * idf

    return [
        word for word, _ in sorted(
            tfidf_scores.items(),
            key=lambda x: -x[1]
        )[:top_n]
    ]


def detect_category(texts: list[str]) -> str:
    """
    Wykrywa dominującą kategorię objawów przez dopasowanie słownikowe.
    """
    if not texts:
        return "Inne"

    combined = " ".join(texts).lower()
    scores: dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in combined)
        if score > 0:
            scores[category] = score

    if not scores:
        return "Inne"

    return max(scores, key=lambda k: scores[k])


def detect_age_range(db: Session, group_id: str) -> str | None:
    """
    Wykrywa dominujący przedział wiekowy na podstawie pola age_range
    członków grupy (z tabeli users).
    """
    from uuid import UUID
    from app.models.user import User

    gid = UUID(group_id) if isinstance(group_id, str) else group_id
    users = (
        db.query(User.age_range)
        .join(GroupMember, GroupMember.user_id == User.id)
        .filter(
            GroupMember.group_id == gid,
            User.age_range.isnot(None)
        )
        .all()
    )

    ranges = [u.age_range for u in users if u.age_range]
    if not ranges:
        return None

    counter = Counter(ranges)
    return counter.most_common(1)[0][0]


def update_group_characteristics(db: Session, group_id: str) -> None:
    """
    Przelicza i zapisuje wszystkie charakterystyki grupy.
    Wołana po przypisaniu użytkownika do grupy i po retrain HDBSCAN.
    """
    from uuid import UUID
    gid = UUID(group_id) if isinstance(group_id, str) else group_id

    profiles = (
        db.query(SymptomProfile)
        .join(GroupMember, GroupMember.user_id == SymptomProfile.user_id)
        .filter(GroupMember.group_id == gid)
        .all()
    )

    if not profiles:
        logger.warning("Brak profili dla grupy %s — pomijam", group_id)
        return

    group = db.query(Group).filter(Group.id == gid).first()
    if not group:
        logger.error("Grupa %s nie istnieje", group_id)
        return

    texts = [p.description for p in profiles if p.description]

    group.keywords = extract_keywords(texts, top_n=5)
    group.symptom_category = detect_category(texts)
    group.age_range = detect_age_range(db, str(group_id))

    scores = [p.match_score for p in profiles if p.match_score is not None]
    group.avg_match_score = (
        round(sum(scores) / len(scores), 3) if scores else None
    )

    # Od 1 członka — w dev i małych grupach też generujemy opis AI (wymaga OPENAI_API_KEY).
    if len(profiles) >= 1 and settings.openai_api_key:
        ai_desc, ai_category = generate_group_ai_description(
            group.keywords,
            texts[:10],
            group.symptom_category,
        )
        if ai_desc:
            group.ai_description = ai_desc
        if ai_category:
            group.symptom_category = ai_category

    db.commit()

    logger.info(
        "Charakterystyki grupy %s zaktualizowane: keywords=%s, "
        "category=%s, age_range=%s, avg_score=%s, ai_description=%s",
        group_id, group.keywords, group.symptom_category,
        group.age_range, group.avg_match_score,
        "tak" if group.ai_description else "nie",
    )
