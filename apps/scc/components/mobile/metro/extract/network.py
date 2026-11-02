"""Build the 수도권 전철 network (stations, lines, adjacency) from OpenStreetMap.

Inputs are two Overpass responses (see README.md in this folder):
  routes.json  route relations in the capital-area bbox, with members
  detail.json  stop nodes, stop_area relations, station nodes, track ways

Run:  python3 -I network.py routes.json detail.json > network.json

Topology comes only from all-stop route variants: express, limited and
direct services skip stations and would add false adjacencies.
"""

import json
import math
import re
import sys
from collections import defaultdict

# Line id, OSM route ref, official Korean name, short badge, colour.
# Colours follow 서울시's 2023 서울 지하철 노선도 (sampled from the legend of
# the press-release map, 2023-09-14); GTX-A, absent there, keeps its own.
LINES = [
    ("1", "1", "1호선", "1", "#33508A"),
    ("2", "2", "2호선", "2", "#00A84D"),
    ("3", "3", "3호선", "3", "#F96D24"),
    ("4", "4", "4호선", "4", "#2FA3C7"),
    ("5", "5", "5호선", "5", "#854B95"),
    ("6", "6", "6호선", "6", "#6C4232"),
    ("7", "7", "7호선", "7", "#6F772C"),
    ("8", "8", "8호선", "8", "#D7366C"),
    ("9", "9", "9호선", "9", "#A6947C"),
    ("suin-bundang", "수인·분당", "수인분당선", "수인분당", "#E6A230"),
    ("shinbundang", "신분당", "신분당선", "신분당", "#C8323A"),
    ("gyeongui-jungang", "경의·중앙", "경의중앙선", "경의중앙", "#79C4A9"),
    ("gyeongchun", "경춘", "경춘선", "경춘", "#007C58"),
    ("airport", "공항철도", "공항철도", "공항철도", "#037386"),
    ("gyeonggang", "경강", "경강선", "경강", "#3B2D84"),
    ("seohae", "서해", "서해선", "서해", "#75B024"),
    ("gtx-a", "GTX-A", "GTX-A", "GTXA", "#9A6292"),
    ("incheon-1", "인천1", "인천 1호선", "인천1", "#94A9DA"),
    ("incheon-2", "I2", "인천 2호선", "인천2", "#F7995A"),
    ("uijeongbu", "U", "의정부경전철", "의정부", "#F77E2E"),
    ("everline", "용인", "용인에버라인", "용인에버", "#7EAA4F"),
    ("ui-sinseol", "W", "우이신설선", "우이신설", "#B1C13C"),
    ("gimpo-gold", "김포 골드라인", "김포골드라인", "김포골드", "#A58A4F"),
    ("sillim", "Silim", "신림선", "신림", "#657FB2"),
]
REF_TO_LINE = {ref: lid for lid, ref, *_ in LINES}

SKIP_ROUTE = re.compile(r"(?<!광역)급행|특급|직통|KTX|무궁화|새마을|ITX|셔틀트레인|자기부상|월미")
# 의정부경전철 temporary depot platform variants.
SKIP_IDS = {13738410, 13738411}

# Adjacencies OSM's route stop lists get wrong (checked against the
# operators' station lists): the 지평 shuttle lists only 지평 and 원덕, though
# 용문 lies between (경의·중앙, 2017); GTX-A's 수서–동탄 routes run through
# 성남 (2024-03-30) without a stop member.
REMOVE_EDGES = {
    "gyeongui-jungang": [("지평", "원덕")],
}
ADD_EDGES = {
    "gyeongui-jungang": [("용문", "지평")],
}
INSERT_STOPS = {
    "gtx-a": [("수서", "성남", "구성")],
}

# Distinct stations that share a name across lines but are not transfers.
# Merging is name + distance; these keep same-name pairs apart.
MERGE_RADIUS_M = 700


def haversine(a, b):
    r = 6371000.0
    p1, p2 = math.radians(a[0]), math.radians(b[0])
    dp = p2 - p1
    dl = math.radians(b[1] - a[1])
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(h))


def base_name(name):
    name = re.sub(r"\s*\(.*?\)\s*", "", name or "").strip()
    name = re.sub(r"역$", "", name)
    return name


# Names whose OSM base form differs between operators at one transfer station.
ALIASES = {
    "이수": "총신대입구",
    "서울": "서울역",
}

# Official display names where OSM's per-line names differ.
DISPLAY = {
    "총신대입구": "총신대입구(이수)",
}


def drop_skips(edges, stations):
    """Remove a skip edge: a route that omitted a stop member links a and b
    directly although the line also runs a–m–b or a–m–n–b. In each such
    short cycle the skip is the longest edge. No line has a genuine cycle of
    four or fewer stations (6호선's 응암 loop has six)."""
    def length(e):
        a, b = stations[e[0]], stations[e[1]]
        return haversine((a["lat"], a["lon"]), (b["lat"], b["lon"]))

    und = {tuple(sorted(e)) for e in edges}
    while True:
        adj = defaultdict(set)
        for a, b in und:
            adj[a].add(b)
            adj[b].add(a)
        cycle = None
        for a, b in sorted(und):
            for m in adj[a] - {b}:
                if b in adj[m]:
                    cycle = [(a, b), (a, m), (m, b)]
                    break
                for n in adj[m] - {a, b}:
                    if b in adj[n]:
                        cycle = [(a, b), (a, m), (m, n), (n, b)]
                        break
                if cycle:
                    break
            if cycle:
                break
        if not cycle:
            break
        longest = tuple(sorted(max(cycle, key=length)))
        und.discard(longest)
    return {e for e in edges if tuple(sorted(e)) in und}


def main():
    routes = json.load(open(sys.argv[1]))["elements"]
    detail = [e for path in sys.argv[2:] for e in json.load(open(path))["elements"]]

    nodes = {e["id"]: e for e in detail if e["type"] == "node"}
    stop_area_of = {}
    station_in_area = {}
    for e in detail:
        if e["type"] != "relation" or e["tags"].get("public_transport") != "stop_area":
            continue
        members = [m["ref"] for m in e["members"] if m["type"] == "node"]
        stations = [r for r in members if nodes.get(r, {}).get("tags", {}).get("railway") == "station"]
        for r in members:
            stop_area_of.setdefault(r, e["id"])
        if stations:
            station_in_area[e["id"]] = stations[0]

    def station_node_for(stop_id):
        area = stop_area_of.get(stop_id)
        if area in station_in_area:
            return station_in_area[area]
        stop = nodes[stop_id]
        name = base_name(stop["tags"].get("name"))
        best, best_d = None, 400
        for n in nodes.values():
            t = n.get("tags", {})
            if t.get("railway") != "station":
                continue
            dist = haversine((stop["lat"], stop["lon"]), (n["lat"], n["lon"]))
            if dist < best_d and base_name(t.get("name")) == name:
                best, best_d = n["id"], dist
        return best if best is not None else stop_id

    # Ordered station-node sequences per line.
    sequences = defaultdict(list)
    used_routes = defaultdict(list)
    for e in routes:
        t = e["tags"]
        if t.get("type") != "route" or e["id"] in SKIP_IDS:
            continue
        name = t.get("name") or ""
        if SKIP_ROUTE.search(name):
            continue
        line = REF_TO_LINE.get(t.get("ref") or "")
        if line is None and "광역급행철도 A" in name:
            line = "gtx-a"
        if line is None and t.get("colour", "").upper() == "#957326":
            line = "gimpo-gold"
        if line is None:
            continue
        stops = [m["ref"] for m in e["members"] if m["type"] == "node" and m["role"].startswith("stop")]
        stops = [s for s in stops if s in nodes]
        if len(stops) < 2:
            continue
        seq = []
        for s in stops:
            st = station_node_for(s)
            if not seq or seq[-1] != st:
                seq.append(st)
        sequences[line].append(seq)
        used_routes[line].append((e["id"], name))

    # Merge station nodes into stations: same base name within the radius.
    station_nodes = sorted({s for seqs in sequences.values() for seq in seqs for s in seq})
    def nm(n):
        t = nodes[n]["tags"]
        b = base_name(t.get("name:ko") or t.get("name"))
        return ALIASES.get(b, b)

    parent = {n: n for n in station_nodes}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    by_name = defaultdict(list)
    for n in station_nodes:
        by_name[nm(n)].append(n)
    for name, group in by_name.items():
        for i, a in enumerate(group):
            for b in group[i + 1:]:
                pa = (nodes[a]["lat"], nodes[a]["lon"])
                pb = (nodes[b]["lat"], nodes[b]["lon"])
                if haversine(pa, pb) <= MERGE_RADIUS_M:
                    parent[find(a)] = find(b)

    clusters = defaultdict(list)
    for n in station_nodes:
        clusters[find(n)].append(n)

    stations = {}
    node_to_station = {}
    for root, members in clusters.items():
        name = nm(members[0])
        lat = sum(nodes[m]["lat"] for m in members) / len(members)
        lon = sum(nodes[m]["lon"] for m in members) / len(members)
        en = None
        for m in members:
            t = nodes[m]["tags"]
            if t.get("name:en"):
                en = re.sub(r"\s*\(.*?\)\s*", "", t["name:en"]).strip()
                break
        sid = f"s{min(members)}"
        stations[sid] = {"id": sid, "name": DISPLAY.get(name, name), "en": en, "lat": round(lat, 6), "lon": round(lon, 6), "osm": sorted(members)}
        for m in members:
            node_to_station[m] = sid

    lines_out = []
    for lid, ref, name, badge, colour in LINES:
        edges = set()
        for seq in sequences.get(lid, []):
            ss = [node_to_station[s] for s in seq]
            for a, b in zip(ss, ss[1:]):
                if a != b:
                    edges.add((a, b))
        by_name_on_line = {}
        for a, b in edges:
            by_name_on_line[stations[a]["name"]] = a
            by_name_on_line[stations[b]["name"]] = b
        for before, middle, after in INSERT_STOPS.get(lid, []):
            a, c = by_name_on_line[before], by_name_on_line[after]
            mid = next(s for s in stations.values() if s["name"] == middle and haversine((s["lat"], s["lon"]), (stations[a]["lat"], stations[a]["lon"])) < 20000)
            edges -= {(a, c), (c, a)}
            edges |= {(a, mid["id"]), (mid["id"], c), (c, mid["id"]), (mid["id"], a)}
        for x, y in REMOVE_EDGES.get(lid, []):
            a, b = by_name_on_line[x], by_name_on_line[y]
            edges -= {(a, b), (b, a)}
        for x, y in ADD_EDGES.get(lid, []):
            a, b = by_name_on_line[x], by_name_on_line[y]
            edges |= {(a, b), (b, a)}
        edges = drop_skips(edges, stations)
        lines_out.append({
            "id": lid, "name": name, "badge": badge, "colour": colour,
            "edges": sorted(edges),
            "routes": used_routes.get(lid, []),
        })

    used = {s for line in lines_out for e in line["edges"] for s in e}
    out = {
        "source": "OpenStreetMap contributors, ODbL",
        "stations": [stations[s] for s in sorted(used)],
        "lines": lines_out,
    }
    json.dump(out, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
