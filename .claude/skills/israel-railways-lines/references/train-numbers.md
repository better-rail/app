# Train numbers — how Israel Railways numbers its trains

*Rakevet Israel · 11/09/2026*

Everything below was **measured**, not quoted: the national GTFS of 10/09/2026 (validity window 10 Sep – 10 Oct 2026, **1 073 train numbers over 1 982 trips**) and the rail-API sweep of 23/06/2026 in `Output/rail_live_all.csv` (597 numbers). The counts in §10 say how firm each statement is

---

## 0. The short version

A train number is a **slot in the timetable**, not a route and not a train set. Four things are encoded in it:

| | |
|---|---|
| **parity** | the direction — odd one way, even the other, always |
| **the hundreds block** | the corridor it belongs to |
| **+2** | the next departure of that same service, one headway later |
| **a leading thousands digit** | a calendar variant — Friday, Saturday night, a single holiday date, the Wednesday reroute |

And one thing is *not* encoded: the stopping pattern. Two trains an hour apart on the same corridor share a number series and can still call at different stations

---

## 1. Where the number lives in our data

| source | field | note |
|---|---|---|
| national GTFS `trips.txt` | `trip_headsign` | **the field to read** — 1 982 rail trips carry it |
| national GTFS `routes.txt` | `route_desc` | one `route_id` per train number, 1 068 of them, and equal to the headsign wherever both exist (1 964 / 1 964) |
| national GTFS `routes.txt` | `route_long_name` | `origin<->destination`, e.g. `נהריה-נהריה<->מודיעין מרכז-מודיעין מכבים רעות` |
| rail API `searchTrain` | `trainNumber` | see `Scripts/fetch_rail_all.py` |
| our map | `D.lines[].trains[].num` | in `Output/Maps/Rail Lines Map.html`, parsed back by `Scripts/build_map.py` |

**Trap 1**: in the GTFS a rail `route_id` is a *train number*, not a line. Grouping by `route_id`
gives you 1 068 one-train "lines". The 15 lines the map draws are our own grouping, kept in
`D.lines` and matched by `classify_train()`

**Trap 2, and it bites silently**: **18 rail trips point at a `route_id` that `routes.txt` does not
contain** — 38978, 38768, 44274, 35505 and a few more. Join `trips.txt` to `routes.txt` and those
trips vanish without an error, taking five whole train numbers with them (8188, 8289, 8683, 8848,
8849) and, worse, the *second working* of six others — see §5. **Read the number off
`trip_headsign` and never inner-join to `routes.txt`.** `build_map.py` gets this right; my own
first pass over this feed did not

---

## 2. Rule 1 — parity is the direction

`number % 2` equals GTFS `direction_id` in **1 068 of 1 068** numbers: odd → `direction_id 1`, even → `0`. No number ever changes direction

Which way is odd:

- on the eight north–south corridors, **odd runs south** — Nahariya → Modiin, Karmiel → Beer Sheva, Herzliya → Jerusalem, Beer Sheva North → Dimona
- on the two east–west branches, **odd runs west** — Lod → Rishon LeZion HaRishonim (line 9) and Beit Shean → Atlit (line 11)

Those two branches are the only exceptions: of 715 weekday trains in the map, 640 have odd = southbound, and every one of the 75 that do not belongs to line 9 or line 11

**`n` and `n+1` are a counter-pair** — the same service in the opposite direction, usually crossing within the hour. True in 602 of 602 adjacent pairs

---

## 3. Rule 2 — the hundreds block is the corridor

Line numbers below are the ones the map puts on the badge — Daniel's numbering, saved in the
map's config. They are **not** the `id` in `D.lines`; see the warning under the table

| numbers | how many | line | corridor |
|---|---|---|---|
| 1–12 | 10 | 1 | Nahariya ↔ Modiin — **the permanent night block**, §3b |
| 19–56 | 37 | 3 | Beer Sheva ↔ Nahariya / Tel Aviv — **54 counted here**, see §3a |
| 59–99 | 40 | 11 | Beit Shean ↔ Atlit / Haifa |
| 100–186 | 72 | 1 | Nahariya ↔ Modiin |
| 217–296 | 75 | 2 | Binyamina ↔ Ashkelon / Rehovot |
| 300–347 | 38 | 6 | Herzliya ↔ Rishon LeZion Moshe Dayan / Ashdod |
| 400, 411–416, 427 | 6 | 4 | Carmiel ↔ Haifa Merkazit HaMifrats |
| 401–409, 418–429 | 18 | 34 | Carmiel ↔ Beer Sheva |
| 440–475 | 36 | 4 | Carmiel ↔ Haifa Hof HaCarmel |
| 501–535 | 35 | 5 | Netanya / Tel Aviv ↔ Beit Shemesh |
| 542–594 | 34 | 10 | Jerusalem ↔ Modiin |
| 609–690 | 73 | 6 | Herzliya ↔ Beer Sheva / Ashkelon |
| 700–710 | 11 | 7 | Jerusalem ↔ Herzliya — **the night service, hourly all night**, §3b |
| 713–785 | 73 | 7 | Jerusalem ↔ Herzliya — the day service |
| 824–881 | 56 | 8 | Rosh HaAyin North ↔ Hadera East |
| 900–933 | 34 | 9 | Lod ↔ Rishon LeZion HaRishonim |
| 950–985 | 23 | 25 | Netanya ↔ Rehovot |
| 990–999 | 8 | 12 | Beer Sheva North ↔ Dimona |

A block is a **corridor**, not a line, and the two do not map one to one:

- line 6 owns two blocks — 3xx (Herzliya ↔ Rishon / Ashdod) and 6xx (Herzliya ↔ Beer Sheva)
- **4xx is shared by two different lines, interleaved rather than split**: 34 takes 401–409 and
  418–429 through to Beer Sheva, 4 takes 400, 411–416 and 427 up to Merkazit HaMifrats, and then
  the whole run 440–475 back to line 4 for Hof HaCarmel
- 5xx is shared by line 5 (501–535) and line 10 (542–594)
- one-digit and two-digit numbers are simply the 0xx block — three corridors share it

> ⚠️ **The `id` in `D.lines` is an internal key, not the line number.** The number the map draws is
> `BAKED_CFG.lineBadges[id] || id`, applied in `effectiveLines()`, and the badges come from the last
> config Daniel saved (`Output/Savings/rail_config_2026-06-25_19-12.json`). Three of them differ, so
> reading `id` straight off `D` gives the wrong line for all three:
>
> | `D.lines[].id` | line on the badge | |
> |---|---|---|
> | `3X` | **34** | Carmiel – Beer Sheva |
> | `12` | **8** | Hadera – Rosh HaAyin |
> | `8` | **12** | Beer Sheva – Dimona |
>
> The displayed *name* comes the same way, from `lineNames2[id]`

---

## 3a. The lines themselves, and the blocks each one owns

The other half of the picture — the numbering of the **lines**, which is Daniel's, not the
operator's. Badge, name and colour are all read live from the config; the blocks are measured off
the delivered map

| line | name | שם | colour | trains | number blocks |
|---|---|---|---|---|---|
| **1** | Nahariya – Modiin | נהריה – מודיעין | `#B1DB1F` | 84 | 1–12, 100–186 |
| **2** | Binyamina – Ashkelon | בנימינה – אשקלון | `#0083CD` | 76 | 217–296 |
| **3** | Nahariya – Beer Sheva | נהריה – באר שבע | `#1BC741` | 36 + 54 | 19–56 |
| **4** | Carmiel – Haifa | כרמיאל – חיפה | `#FF0099` | 43 | 400, 411–416, 427, 440–475 |
| **5** | Netanya – Beit Shemesh | נתניה – בית שמש | `#37C3FF` | 36 | 501–535 |
| **6** | Herzliya – Beer Sheva | הרצליה – באר שבע | `#EC0000` | 111 | 300–347, 609–690 |
| **7** | Herzliya – Jerusalem | הרצליה – ירושלים | `#FF5FBF` | 107 | 700–785 |
| **8** | Hadera – Rosh HaAyin | חדרה – ראש העין | `#00A6A6` | 62 | 824–881 |
| **9** | Lod – Rishon LeZion | לוד – ראשון לציון | `#D176FF` | 35 | 900–933 |
| **10** | Modiin – Jerusalem | מודיעין – ירושלים | `#D176FF` | 34 | 542–594 |
| **11** | Beit Shean – Atlit | בית שאן – עתלית | `#D176FF` | 40 | 59–99 |
| **12** | Beer Sheva – Dimona | באר שבע – דימונה | `#D176FF` | 9 | 990–999 |
| *(15)* | *the map's one-train group for 54* | | `#EC0000` | 1 | 54 |
| **25** | Netanya – Rehovot | נתניה – רחובות | `#37C3FF` outline | 23 | 950–985 |
| **34** | Carmiel – Beer Sheva | כרמיאל – באר שבע | `#FF7A00` outline | 18 | 401–409, 418–429 |

- **54 belongs to line 3**, and this document counts it there. The map still shows it as a line of
  its own, badge **15**, and that is a fault in the data rather than a decision. 54 leaves Beer Sheva
  at 21:37, the last departure of the evening. Its neighbours 48 · 50 · 52 · 56 take the same inland
  route — Kiryat Gat, Kiryat Malachi, Ramla, Lod — and stop at Tel Aviv Savidor. The feed holds
  **two workings of 54**: the everyday one ending at Savidor with 11 stops, and a long one carrying
  on through Tel Aviv University, Bnei Brak, Petah Tikva, Rosh HaAyin North, Kfar Saba, Hod HaSharon
  and Raanana to **Herzliya at 00:02**, 21 stops. Only the long one carries a dated calendar
  (Wednesday 16/09 alone); the everyday one's service_ids are missing from `calendar.txt`, so
  `load_gtfs_trains()` scores them span 0 and picks the **long** working as canonical. Its endpoint
  pair matches no other train, so the grouper gives it a group of one. The repair is the canonical
  pick, not a pin on 54 — five other trains have the same fault (§5) — and it is open
- **25** and **34** are the two outline badges — a white pill with the line's colour as its text
- 9, 10, 11 and 12 share the same violet `#D176FF` — the four short shuttles

To print this table from the delivered file, badge and name included:

```python
import re, json
h   = open('Output/Maps/Rail Lines Map.html', encoding='utf-8').read()
cfg = json.loads(re.search(r'const BAKED_CFG=(\{.*?\});', h, re.DOTALL).group(1))
D   = json.loads(re.search(r'const D\s*=\s*(\{.*?"lines":\[.*?\]\s*\})\s*;', h, re.DOTALL).group(1))
for l in D['lines']:
    badge = cfg['lineBadges'].get(l['id'], l['id'])
    name  = cfg.get('lineNames2', {}).get(l['id'], {}).get('en') or l['name_en']
    print(badge, name, sorted(l['nums'])[:3], '…')
```

---

## 3b. The night, and why a night train changes its number at the weekend

Two lines run right through the night, and they number it in opposite ways

**Line 1 has a block of its own — 1 to 12.** Nahariya ↔ Modiin, 12 stops, roughly hourly in each
direction, Sunday to Thursday. It is the only service in the country whose night runs were given
their own numbers instead of a continuation of the day series, and the numbers are the smallest in
the timetable:

| | | |
|---|---|---|
| 1 · 3 · 5 · 7 | 00:54 · 01:54 · 02:51 · 03:48 | Nahariya → Modiin |
| 2 · 4 · 6 · 8 · 10 · 12 | 23:55 · 00:50 · 01:50 · 02:50 · 03:50 · 04:44 | Modiin → Nahariya |

`+2` works here exactly as it does by day — one number per hour, odd southbound

**Line 7 does the opposite: it keeps the day series.** 700 to 710 are the night, hourly on the
half-hour, and 713 onwards is the morning — one uninterrupted 7xx series from 00:32 to 23:32:

| | | |
|---|---|---|
| 700 · 702 · 704 · 706 · 708 · 710 | 00:32 · 01:32 · 02:32 · 03:32 · 04:32 · 05:35 | Jerusalem → Herzliya |
| 701 · 703 · 705 · 707 · 709 | 00:40 · 01:40 · 02:40 · 03:40 · 04:40 | Herzliya → Jerusalem |

so on this line the number reads as a clock: `n = 700 + 2·hour` for the whole night, which is where
the arithmetic of §4 is at its cleanest

### A day number does not stop at midnight

Every other line simply carries its day series past midnight. 112 departures fall between 23:00 and
04:59, and 37 of them carry an ordinary one-, two- or three-digit number — 294 out of Ashkelon at 23:00,
535 into Beit Shemesh at 23:02, 690 out of Beer Sheva at 23:12, 139 out of Nahariya at 23:54

A trip that crosses midnight does **not** change number and does not restart the clock. The feed
writes the hours past 24 instead: **53 leaves Tel Aviv at 23:09 and arrives 24:55**, 139 arrives
**26:06**, and the latest arrival in the feed is 7619 at **26:09**. Fifty-three numbers arrive at
24:00 or later, so any code that parses `HH:MM` with an hour range of 0–23 breaks on them

### At the edge of the weekend the same train changes its number

This is the case that looks like a mistake and is not. A service day runs to about 26:00, so a train
leaving late on Saturday still belongs to **Saturday**, and one leaving at 00:54 on Sunday morning
belongs to **Sunday**. The number follows the service day, not the clock — so the very same night
train takes a four-digit number on the nights that fall either side of the weekend:

| the train | Sun–Thu nights | at the weekend edge |
|---|---|---|
| 23:55 Modiin → Nahariya, 12 stops | **2** | **7002** — Saturday evening, the motzash series |
| 00:54 Nahariya → Modiin, 12 stops | **1** | **6001** — the night into Friday, the short-day series |
| 03:48 Nahariya → Modiin, 12 stops | **7** | **6007** — the same |

Nothing about the train changes — same origin, same destination, same minute, same 12 stops. Only
the service day it is filed under

### The four-digit number that is a copy, to the minute

Where a number is a true duplicate of a three-digit one, it matches on every field. Of the 394
four-digit numbers, **30 are exact copies** — same origin, destination, departure time and stop
count as their base:

| prefix | exact copies | examples |
|---|---|---|
| 6xxx | 17 | 6001 = 1 · 6003 = 3 · 6004 = 4 · 6005 = 5 · 6006 = 6 · 6007 = 7 |
| 8xxx | 11 | 8700 = 700 · 8701 = 701 · 8702 = 702 · … · 8710 = 710 |
| 7xxx | 1 | 7002 = 2 |
| 1xxx | 1 | 1501 = 501 |

The rest of the four-digit numbers only share the block, not the path: 8120 leaves Modiin at 06:11
where 120 leaves at 15:18, and 1161 is a different train from 161 altogether

### Extra trains after an event

The feed also carries one-off late trains laid on after something at the fairgrounds. They start at
**תל אביב האוניברסיטה - אקספו** rather than at a terminus, they leave within twenty minutes of each
other, and they fan out to three different corners:

| | | |
|---|---|---|
| **8683** | 23:00 → Beer Sheva Merkaz, 17 stops | line 6's series |
| **8289** | 23:01 → Ashkelon, 12 stops | line 2's series |
| **8188** | 23:20 → Nahariya, 16 stops | line 1's series |

The pattern is worth reading: each one is **8 followed by the number it would have carried on its
own line**, and each is pinned to a single date. On the same evening the ordinary 53 was also
started back at Expo instead of Tel Aviv Merkaz, five minutes earlier than usual — the timetable
absorbs the crowd by extending a train that was running anyway and adding three that were not

### One train a day, permanently, on line 7

**8718** is the exception that proves the four-digit rule is about the calendar. It runs
**Sunday to Thursday, every week**, Jerusalem Yitzhak Navon 07:24 → Tel Aviv Merkaz, 5 stops — the
only four-digit number in the feed with an ordinary weekday calendar. Its base, 718, is a different
train fifteen minutes earlier (07:09, Jerusalem → Herzliya, 7 stops), so 8718 is an **extra path
slipped into the morning peak** and never given a three-digit number of its own

It is not new: the same 8718 at the same 07:24 is in the API sweep of 23/06/2026, a timetable ago.
So a number that the scheme reserves for a one-off has been carrying a daily train for at least
three months — which is the reminder that **the thousands digit is a strong hint and not a
guarantee**; check the calendar, never the shape of the number

---

## 4. Rule 3 — `+2` is the next departure

Step two numbers up and you get the next train of the same service in the same direction. Over 462 such pairs the gap in departure time is **60 minutes in 250 cases and 30 minutes in 179** — the headway of the line, not a fixed hour

Where a corridor runs two paths per hour the block splits into two parallel series roughly 50 apart. Line 1 southbound, straight from the feed:

```
101 04:48  103 05:48  105 06:48 … 129 18:48  131 19:48      →  n = 93 + 2·hour
149 04:48  151 05:15  153 06:15 … 179 19:15  181 20:15      →  n = 141 + 2·hour
```

so within an hourly series you can read the departure hour off the number once you know the anchor. The arithmetic breaks where the headway is not hourly (the 2xx and 6xx blocks alternate 30 and 60) and at the end of the day, where the last few trains are squeezed in

---

## 5. Rule 4 — a number is a fixed slot

**1 067 of the 1 073** numbers are exactly that: every trip sharing the number has the same origin,
destination, departure time and stop list. The several trips per number are calendar splits — the
Israeli feed writes one `service_id` per week-block, so a number that runs all month appears three
to five times

**Six numbers carry two different workings**, and they are all the last trains of the evening. In
every case the second working hides behind one of the orphan `route_id`s of §1:

| number | the ordinary working | the second one |
|---|---|---|
| **53** | 23:09 Tel Aviv Merkaz → Beer Sheva, 11 stops | 23:04 from **Tel Aviv University**, 12 stops |
| **54** | 21:37 Beer Sheva → Tel Aviv Merkaz, 11 stops | the same 21:37, carried on to **Herzliya**, 21 stops |
| **186** | Modiin → Nahariya, 18 stops | the same, 23 stops |
| **687** | 23:49 Herzliya → Tel Aviv Merkaz, 11 stops | carried on to **Beer Sheva**, 26 stops |
| **780** | 22:32 Jerusalem → Herzliya, 7 stops | cut back to **Tel Aviv Merkaz**, 5 stops |
| **782** | 23:02 Jerusalem → Herzliya, 7 stops | carried on to **Binyamina**, 11 stops |

**Which days each working runs cannot be read from this feed.** Of the calendars involved, only one
is dated — `10020070`, **Wednesday 16/09/2026 alone** — and it is attached to the long working in
five of the six cases. The other five service_ids (`10020156`–`10020160`, 23 trips) are **missing
from `calendar.txt` altogether**, so the days of the ordinary working are simply not stated

What the other source says: in the API sweep of Tuesday 23/06 train 54 ran the short way, Beer Sheva
→ Tel Aviv Savidor with 11 stops. So the short one is the everyday working and the long one is the
exception — but that is an inference from a different timetable, not something this feed states

---

## 6. The thousands digit — which calendar

394 of the 1 073 numbers are four digits. The last three keep the ordinary structure of §2–§4; the leading digit says **when it runs**

| prefix | how many | runs on | what it is |
|---|---|---|---|
| **6xxx** | 231 | every Friday, and Sun 20/09 | the **short-day timetable** — last departure ~15:00. The Sunday is Yom Kippur eve, which is run as a Friday |
| **7xxx** | 84 | Saturdays, Sun 13/09, Mon 21/09 | the **motzash timetable** — first departure ~20:00. The extra dates are the ends of Rosh Hashana and Yom Kippur |
| **8xxx** | 58 | single dates: Fri 11/09 (42), Wed 16/09 (11), Sun 13/09 (4) — and 8718 every weekday | **one-off additions** pinned to one date — Fri 11/09 is Rosh Hashana eve. The one standing exception, 8718, is in §3b |
| **9xxx** | 11 | every Wednesday from 23/09 | the **Wednesday-night reroute** to Ben Gurion Airport |
| **1xxx** | 5 | Sundays, Mon 14/09, Tue 22/09 | the first runs **after Shabbat or a festival** — four just past midnight, one at 05:48 |

### The Wednesday night, worked through

This is the clearest example of the whole system, and it is the case the map's Journey tab has to answer:

| numbers | days | route | stops |
|---|---|---|---|
| 700–710 | Sun, Mon, Tue, Thu | Jerusalem Yitzhak Navon ↔ Herzliya | 4 |
| **9700–9710** | **Wednesdays** | **Ben Gurion Airport ↔ Herzliya** | 3 |
| 8700–8710 | Wed 16/09 only | Jerusalem Yitzhak Navon ↔ Herzliya | 4 |

The tunnel into Jerusalem is closed for maintenance on the night into Wednesday, so the night service turns back at the airport and takes a 9000 number. On the one Wednesday the tunnel stayed open, 16/09, the operator did not touch 700's calendar — it issued a parallel 8700 series for that date alone

Notice the times: the odd trains keep theirs (9701 leaves Herzliya at 00:40, exactly like 701) because they start at the far end; the even ones shift (9700 leaves the airport at 00:55, where 700 leaves Jerusalem at 00:32)

---

## 7. What a number does not tell you

- **the stopping pattern** — the map calls these *missions* (`A`, `B`, `C` … in `D.lines[].missions`) and derives them from the stop list, because the number carries nothing about them. Line 6 alone has ten
- **the published line** — see §3
- **the rolling stock, the platform or the operator** — none of these are in the number

---

## 8. Blocks move — never hard-code one

Between the June and the September timetable the whole Dimona shuttle was renumbered, keeping its times:

| | June 2026 | September 2026 |
|---|---|---|
| Dimona → Beer Sheva North, 06:03 | **830** | **990** |
| 830 today | — | Rosh HaAyin North → Hadera East, 07:57 |

So a script must resolve a number against the feed it came from. `classify_train()` in `Scripts/build_map.py` does it the safe way — it scores a number range *together with* the station overlap (Jaccard) and the endpoint pair, and anything scoring under 1.2 is parked in the `_new` line for a human to sort, instead of being filed by its digits

---

## 9. Caveats of the source

- **23 trips reference a `service_id` that is not in `calendar.txt`** (`10020156`–`10020160`), so
  their days cannot be read from the calendar at all. They are not marginal: they carry the everyday
  working of the six trains in §5, which is why the map shows the wrong one
- **18 trips reference a `route_id` that is not in `routes.txt`** — see §1, trap 2
- the June figures come from a corridor sweep of the live API, which does not guarantee full coverage — the Rosh HaAyin ↔ Hadera East service is missing from it. Use it for a spot check, not for a census
- holiday dates in §6 are those of the 10 Sep – 10 Oct 2026 window and will differ in the next feed; the *shape* of the rule does not

---

## 10. How each statement was measured

| claim | check | result |
|---|---|---|
| the number is in `trip_headsign` and `route_desc` | compare the two wherever the route row exists | 1 964 / 1 964 equal, and 18 trips have no route row |
| parity = direction | `int(num) % 2 == direction_id` | 1 073 / 1 073 |
| `n+1` is the opposite direction | adjacent numbers present in the feed | 932 / 932 |
| `+2` is the next departure | Δ departure over pairs with the same origin and destination | 462 pairs, 250 at +60 min, 179 at +30 min |
| a number is one slot | distinct origin / destination / departure / stop count per number | 1 067 / 1 073, the six of §5 |
| odd runs south | end-to-end Δlatitude against parity, on the map's 715 weekday trains | 640 agree, all 75 others on lines 9 and 11 |

Reproduce by streaming the rail rows out of the GTFS — 1 964 trips, about 30 s over the 1.5 GB `stop_times.txt`:

```python
import zipfile, csv, io
z = zipfile.ZipFile('Bus Connections/Input/generated/GTFS/israel-public-transportation.zip')
rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(n), encoding='utf-8-sig'))
trips = {r['trip_id']: (r['trip_headsign'], r['direction_id'], r['service_id'])
         for r in rd('trips.txt') if r['trip_headsign'].isdigit()}   # 1 982 — NOT a join on routes.txt
```

---

## See also

- `Rail Map — Journey tab, GTFS refresh, Aug 8 removed (2026-09-04).md` §3m — the night buses the planner offers when the Wednesday reroute leaves no train to Jerusalem
- `Scripts/build_map.py` — `load_gtfs_trains()` and `classify_train()`, where a number becomes a line
- `Scripts/fetch_rail_all.py` — the live-API sweep that produces `Output/rail_live_all.csv`
