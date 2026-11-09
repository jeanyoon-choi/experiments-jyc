import re
NUM = {'1': 'il', '2': 'i', '3': 'sam', '4': 'sa', '5': 'o', '6': 'yuk', '7': 'chil', '8': 'pal', '9': 'gu'}
def official_en(en):
    if not en: return en
    en = re.sub(r'\bUniversity\b', 'Univ.', en)
    en = re.sub(r'\b(\d)-ga\b', lambda m: f"{m.group(1)}({NUM[m.group(1)]})-ga", en)
    return en
