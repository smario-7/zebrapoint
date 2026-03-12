"""
Uruchom: python test_embedding.py
Cel: weryfikacja że model działa i produkuje sensowne wyniki
"""
import sys
sys.path.insert(0, '/home/mario/workspace/zebrapoint/backend')

from app.services.embedding_service import generate_embedding
import numpy as np

desc_a = "Moje dziecko ma nawracające bóle stawów i stałe zmęczenie. Lekarze nie wiedzą co dolega."
desc_b = "Córka cierpi na przewlekłe bóle kończyn i jest ciągle osłabiona. Diagnozy brak."
desc_c = "Syn ma problemy z koncentracją i nadpobudliwość. Podejrzewamy ADHD lub spektrum autyzmu."

emb_a = generate_embedding(desc_a)
emb_b = generate_embedding(desc_b)
emb_c = generate_embedding(desc_c)

sim_ab = np.dot(emb_a, emb_b)
sim_ac = np.dot(emb_a, emb_c)
sim_bc = np.dot(emb_b, emb_c)

print(f"Długość wektora: {len(emb_a)}")
print(f"Similarity A-B (podobne):   {sim_ab:.4f}")
print(f"Similarity A-C (różne):     {sim_ac:.4f}")
print(f"Similarity B-C (różne):     {sim_bc:.4f}")

assert len(emb_a) == 384, "Błąd: zły rozmiar wektora!"
assert sim_ab > sim_ac, "Błąd: podobne opisy powinny być bliżej siebie!"
print("\nModel działa poprawnie")
