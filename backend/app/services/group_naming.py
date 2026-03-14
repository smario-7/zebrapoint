import hashlib

COLORS = [
    "Błękitny", "Złoty", "Zielony", "Srebrny", "Różowy",
    "Fioletowy", "Turkusowy", "Bursztynowy", "Kryształowy", "Perłowy",
    "Szafirowy", "Szmaragdowy", "Rubinowy", "Miedziany", "Lazurowy",
    "Kremowy", "Indygo", "Koralowy", "Oliwkowy", "Jadeitowy"
]

NATURE = [
    "Żuraw", "Dąb", "Sosna", "Rzeka", "Gwiazda", "Kamień", "Liść",
    "Chmura", "Świerk", "Brzoza", "Mgła", "Łąka", "Zatoka", "Wzgórze",
    "Strumień", "Wydma", "Ostoja", "Polana", "Szczyt", "Dolina",
    "Jezioro", "Jodła", "Modrzew", "Wierzba", "Grab", "Wiąz",
    "Klon", "Lipa", "Leszczyna", "Głóg", "Kalina", "Jarząb",
    "Storczyk", "Fiołek", "Szałwia", "Tymianek", "Lawenda", "Mięta",
    "Bursztyn", "Agat", "Kwarc", "Opal", "Topaz", "Granat",
    "Horyzont", "Przełom", "Meandr", "Cypel", "Przylądek"
]


def generate_group_name(seed: str) -> str:
    """
    Generuje deterministyczną nazwę grupy na podstawie seeda (np. UUID grupy).
    Ta sama grupa zawsze dostaje tę samą nazwę.
    """
    h = int(hashlib.sha256(seed.encode()).hexdigest(), 16)
    color = COLORS[h % len(COLORS)]
    nature = NATURE[(h // len(COLORS)) % len(NATURE)]
    return f"{color} {nature}"


def generate_group_color(seed: str) -> str:
    """
    Kolor akcentu UI dla karty grupy (hex).
    Deterministyczny — ta sama grupa zawsze ma ten sam kolor.
    """
    PALETTE = [
        "#0d9488", "#f59e0b", "#8b5cf6", "#06b6d4", "#10b981",
        "#f97316", "#ec4899", "#6366f1",
    ]
    h = int(hashlib.sha256(seed.encode()).hexdigest(), 16)
    return PALETTE[h % len(PALETTE)]
