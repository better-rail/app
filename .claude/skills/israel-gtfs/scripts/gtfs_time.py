#!/usr/bin/env python3
"""
gtfs_time.py — handle the Israel GTFS 28-hour ("extended") service-day time format.

In this feed, stop_times.arrival_time / departure_time are clock times measured
from the start of a *service day*, and can exceed 24:00:00 (e.g. "25:30:00").
A naive datetime.strptime("%H:%M:%S") raises on hours >= 24, so post-midnight
trips silently break. This module converts correctly in both directions.

Service-day rules (see SKILL.md gotcha #2):

* Non-rail operators: the service day runs 04:00 -> 03:59 the next calendar day.
  Trips after midnight belong to the PREVIOUS service date and are written with
  extended times (24:00:00..27:59:59). The date stored in calendar_dates for the
  trip's service_id already reflects this shift, so converting a (service_date,
  clock_time) pair to a real timestamp is simply: midnight(service_date) + offset.

* Israel Railways (route_type == 2): the service day equals the calendar day
  (00:00..24:00). Only trips that start before midnight and end after it use
  extended times. A rail trip starting 00:00..04:00 belongs to the day it starts,
  NOT the previous service day.

Because the date in calendar_dates is already the correct service/calendar date
for each operator, `to_datetime(service_date, clock)` works uniformly for both:
add the parsed offset to midnight of the given date. The rail/non-rail
distinction matters when going the OTHER way — deciding which service day a real
wall-clock datetime belongs to — which `service_day_of` handles.

Run `python gtfs_time.py` for a self-test / demo.
"""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

__all__ = [
    "parse_offset",
    "format_offset",
    "to_datetime",
    "to_clock_time",
    "service_day_of",
    "NONRAIL_DAY_START_HOUR",
]

# Non-rail service day begins at 04:00.
NONRAIL_DAY_START_HOUR = 4


def parse_offset(clock: str) -> timedelta:
    """Parse an extended "H:MM:SS" (or "HH:MM:SS") string into a timedelta.

    Hours may be >= 24. Examples: "25:30:00" -> 25h30m, "08:05" -> 8h5m.
    """
    parts = clock.strip().split(":")
    if len(parts) == 2:
        h, m = parts
        s = "0"
    elif len(parts) == 3:
        h, m, s = parts
    else:
        raise ValueError(f"Not a GTFS time string: {clock!r}")
    h, m, s = int(h), int(m), int(s)
    if not (0 <= m < 60 and 0 <= s < 60 and h >= 0):
        raise ValueError(f"Out-of-range GTFS time: {clock!r}")
    return timedelta(hours=h, minutes=m, seconds=s)


def format_offset(offset: timedelta) -> str:
    """Format a timedelta back to extended "HH:MM:SS" (hours can exceed 23)."""
    if offset < timedelta(0):
        raise ValueError("GTFS time offsets are non-negative")
    total = int(offset.total_seconds())
    h, rem = divmod(total, 3600)
    m, s = divmod(rem, 60)
    return f"{h:02d}:{m:02d}:{s:02d}"


def to_datetime(service_date: date, clock: str) -> datetime:
    """Convert a (service_date, extended clock time) pair to a real datetime.

    `service_date` is the value from calendar_dates for the trip's service_id.
    Works for both rail and non-rail because that date already encodes the
    correct operator service/calendar day.
    """
    return datetime.combine(service_date, time()) + parse_offset(clock)


def to_clock_time(service_date: date, dt: datetime) -> str:
    """Inverse of to_datetime: express a real datetime as an extended clock time
    relative to midnight of the given service_date (hours may exceed 23)."""
    return format_offset(dt - datetime.combine(service_date, time()))


def service_day_of(dt: datetime, is_rail: bool = False) -> date:
    """Which service day does a real wall-clock datetime belong to?

    Non-rail: times from 00:00 up to (but not including) 04:00 belong to the
    PREVIOUS calendar day's service day. Rail: always the calendar day it falls on.
    """
    if is_rail:
        return dt.date()
    if dt.hour < NONRAIL_DAY_START_HOUR:
        return (dt - timedelta(days=1)).date()
    return dt.date()


def _selftest() -> None:
    d = date(2025, 4, 14)

    # Spec example: trip at 01:30 on 15/04/2025 -> service date 14/04, time 25:30:00.
    assert format_offset(parse_offset("25:30:00")) == "25:30:00"
    got = to_datetime(d, "25:30:00")
    assert got == datetime(2025, 4, 15, 1, 30), got
    assert to_clock_time(d, datetime(2025, 4, 15, 1, 30)) == "25:30:00"

    # Plain times round-trip.
    assert to_datetime(d, "08:05:00") == datetime(2025, 4, 14, 8, 5)
    assert to_clock_time(d, datetime(2025, 4, 14, 8, 5)) == "08:05:00"
    assert parse_offset("8:05") == timedelta(hours=8, minutes=5)

    # Service-day assignment.
    assert service_day_of(datetime(2025, 4, 15, 1, 30)) == date(2025, 4, 14)   # non-rail -> prev
    assert service_day_of(datetime(2025, 4, 15, 4, 0)) == date(2025, 4, 15)    # 04:00 -> same
    assert service_day_of(datetime(2025, 4, 15, 1, 30), is_rail=True) == date(2025, 4, 15)

    print("All gtfs_time self-tests passed.")
    print('parse_offset("27:59:59") ->', parse_offset("27:59:59"))
    print("to_datetime(2025-04-14, 26:15:00) ->", to_datetime(d, "26:15:00"))


if __name__ == "__main__":
    _selftest()
