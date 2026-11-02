# 수도권 전철 extraction

Rebuilds `../1/model/network.json` from OpenStreetMap (ODbL). Raw Overpass
responses are not committed; fetch them into a scratch folder.

1. `routes.json` — route relations in the capital-area bbox, with members:
   `[out:json][timeout:240];(relation["type"="route"]["route"~"^(subway|light_rail|monorail|train|tram)$"](36.70,126.30,38.05,127.85);)->.r;.r out body;rel(br.r)["type"="route_master"];out tags;`
2. `detail.json` — for the all-stop routes of the 24 lines in `network.py`
   (ids: every route whose name has no 급행/특급/직통/KTX/무궁화/새마을/ITX, except
   광역급행 = GTX-A): `rel(id:…)->.r;node(r.r)->.n;.n out body;rel(bn.n)["public_transport"="stop_area"]->.sa;.sa out body;node(r.sa)["railway"="station"];out body;`
   Several responses can be passed; GTX-A was fetched separately.
3. `python3 -I network.py routes.json detail.json [gtx.json …] > network.json`
4. `node layout.mjs network.json ../1/model/network.json` (writes atomically;
   never redirect into the model file while the dev server runs)

`network.py` holds the hand corrections OSM needed on 2026-11-02 (지평 shuttle,
GTX-A 성남, skip edges from routes missing a stop member) and the official
line colours. `layout.mjs` is deterministic.
