#!/usr/bin/env python3
"""
siri_sm.py — build valid Israel MOT SIRI-SM (v2.8) Stop Monitoring request URLs,
and format/parse the protocol's unusual StartTime value.

The SIRI-SM API is SIRI-Lite (HTTP GET). Two rules are easy to violate and the
server simply rejects the request, so this builder enforces them:

  1. Only ONE parameter in a request may carry multiple (comma-separated) values.
     MonitoringRef=1,2 & LineRef=5      -> OK
     MonitoringRef=1,2 & LineRef=5,6    -> rejected
  2. Snapshot filters in MonitoringRef have extra constraints:
       - 'AllActiveTripsFilter' / 'AllPlannedTripsFilter': JSON only, and must NOT
         include PreviewInterval, StartTime, LineRef, MaximumStopVisits,
         MaximumStopVisitsPerLine, MaximumNumberOfCallsOnwards. Poll >= 15s apart.
       - 'all': requires a LineRef (XML allowed).

StartTime format: YYYYMMDDTHHmmSSPzz, where T and P are literal separators and zz
is the GMT offset in whole hours. E.g. 20181125T214953P02 == 2018-11-25T21:49:53+02:00.

Run `python siri_sm.py` for a self-test / demo.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

__all__ = [
    "format_start_time",
    "parse_start_time",
    "build_sm_url",
    "SNAPSHOT_FILTERS",
]

# MonitoringRef snapshot/whole-network filter values.
SNAPSHOT_FILTERS = {"AllActiveTripsFilter", "AllPlannedTripsFilter"}
_PREDEFINED = SNAPSHOT_FILTERS | {"all"}

# Parameters forbidden when using a true snapshot filter.
_SNAPSHOT_FORBIDDEN = {
    "PreviewInterval",
    "StartTime",
    "LineRef",
    "MaximumStopVisits",
    "MaximumStopVisitsPerLine",
    "MaximumNumberOfCallsOnwards",
}


# --------------------------------------------------------------------------- #
# StartTime                                                                    #
# --------------------------------------------------------------------------- #
def format_start_time(dt: datetime) -> str:
    """Format a timezone-aware datetime as SIRI StartTime 'YYYYMMDDTHHmmSSPzz'.

    The offset must be a non-negative whole number of hours (Israel is +02/+03).
    """
    if dt.tzinfo is None or dt.utcoffset() is None:
        raise ValueError("datetime must be timezone-aware")
    off = dt.utcoffset()
    secs = int(off.total_seconds())
    if secs < 0 or secs % 3600 != 0:
        raise ValueError(f"offset must be a non-negative whole hour, got {off}")
    return f"{dt:%Y%m%dT%H%M%S}P{secs // 3600:02d}"


def parse_start_time(s: str) -> datetime:
    """Parse a SIRI StartTime 'YYYYMMDDTHHmmSSPzz' into a tz-aware datetime."""
    s = s.strip()
    if "T" not in s or "P" not in s:
        raise ValueError(f"Not a SIRI StartTime: {s!r}")
    date_part, rest = s.split("T", 1)
    time_part, off_part = rest.split("P", 1)
    if len(date_part) != 8 or len(time_part) != 6 or not off_part:
        raise ValueError(f"Malformed SIRI StartTime: {s!r}")
    dt = datetime.strptime(date_part + time_part, "%Y%m%d%H%M%S")
    tz = timezone(timedelta(hours=int(off_part)))
    return dt.replace(tzinfo=tz)


# --------------------------------------------------------------------------- #
# Request URL builder                                                          #
# --------------------------------------------------------------------------- #
def _as_value(v) -> str:
    """Render a parameter value, joining lists/tuples with commas."""
    if isinstance(v, (list, tuple)):
        return ",".join(str(x) for x in v)
    return str(v)


def _is_multivalued(v) -> bool:
    return isinstance(v, (list, tuple)) and len(v) > 1


def build_sm_url(
    base_address: str,
    key: str,
    monitoring_ref,
    *,
    response_format: str = "xml",
    line_ref=None,
    preview_interval: str | None = None,
    start_time: str | None = None,
    maximum_stop_visits: int | None = None,
    maximum_stop_visits_per_line: int | None = None,
    stop_visit_detail_level: str | None = None,
    maximum_number_of_calls_onwards: int | None = None,
) -> str:
    """Build a validated SIRI-SM request URL.

    monitoring_ref / line_ref accept a single value or a list of values.
    Raises ValueError if the request would be rejected by the server.
    """
    response_format = response_format.lower()
    if response_format not in {"xml", "json"}:
        raise ValueError("response_format must be 'xml' or 'json'")

    # Assemble optional params (skip None).
    params: dict[str, object] = {"MonitoringRef": monitoring_ref}
    optional = {
        "PreviewInterval": preview_interval,
        "StartTime": start_time,
        "LineRef": line_ref,
        "MaximumStopVisits": maximum_stop_visits,
        "MaximumStopVisitsPerLine": maximum_stop_visits_per_line,
        "StopVisitDetailLevel": stop_visit_detail_level,
        "MaximumNumberOfCallsOnwards": maximum_number_of_calls_onwards,
    }
    params.update({k: v for k, v in optional.items() if v is not None})

    if stop_visit_detail_level not in (None, "normal", "calls"):
        raise ValueError("StopVisitDetailLevel must be 'normal' or 'calls'")

    # Snapshot / predefined-filter rules.
    mref_single = None if isinstance(monitoring_ref, (list, tuple)) else str(monitoring_ref)
    if mref_single in SNAPSHOT_FILTERS:
        if response_format != "json":
            raise ValueError(f"{mref_single} is JSON-only (XML not supported)")
        bad = _SNAPSHOT_FORBIDDEN & params.keys()
        if bad:
            raise ValueError(
                f"{mref_single} must not include: {', '.join(sorted(bad))} "
                "(and poll no faster than every 15s)"
            )
    elif mref_single == "all":
        if "LineRef" not in params:
            raise ValueError("MonitoringRef=all requires a LineRef")

    # Rule: at most one multi-valued parameter.
    multi = [k for k, v in params.items() if _is_multivalued(v)]
    if len(multi) > 1:
        raise ValueError(
            "Only one parameter may have multiple values; got multiple: "
            + ", ".join(multi)
        )

    # Build URL. Key first by convention; remaining order is irrelevant.
    base = base_address.rstrip("/")
    query = [f"Key={key}"] + [f"{k}={_as_value(v)}" for k, v in params.items()]
    return f"{base}/2.8/{response_format}?" + "&".join(query)


def _selftest() -> None:
    # StartTime round-trip against the spec example.
    assert parse_start_time("20181125T214953P02") == datetime(
        2018, 11, 25, 21, 49, 53, tzinfo=timezone(timedelta(hours=2))
    )
    assert format_start_time(
        datetime(2018, 11, 25, 21, 49, 53, tzinfo=timezone(timedelta(hours=2)))
    ) == "20181125T214953P02"

    # Basic + multi-stop + filter.
    assert build_sm_url("http://x", "DM1234", 32902).endswith(
        "/2.8/xml?Key=DM1234&MonitoringRef=32902"
    )
    assert build_sm_url("http://x/", "DM1234", [32901, 32902], line_ref=5).endswith(
        "MonitoringRef=32901,32902&LineRef=5"
    )

    # Two multi-valued params -> rejected.
    try:
        build_sm_url("http://x", "DM1234", [1, 2], line_ref=[5, 6])
        raise AssertionError("expected rejection")
    except ValueError:
        pass

    # 'all' needs LineRef.
    try:
        build_sm_url("http://x", "DM1234", "all")
        raise AssertionError("expected rejection")
    except ValueError:
        pass
    assert "MonitoringRef=all&LineRef=5" in build_sm_url("http://x", "DM1234", "all", line_ref=5)

    # Snapshot: JSON only, and no forbidden params.
    try:
        build_sm_url("http://x", "DM1234", "AllActiveTripsFilter", response_format="xml")
        raise AssertionError("expected JSON-only rejection")
    except ValueError:
        pass
    try:
        build_sm_url("http://x", "DM1234", "AllActiveTripsFilter",
                     response_format="json", line_ref=5)
        raise AssertionError("expected forbidden-param rejection")
    except ValueError:
        pass
    ok = build_sm_url("http://x", "DM1234", "AllActiveTripsFilter",
                      response_format="json", stop_visit_detail_level="normal")
    assert ok.endswith("MonitoringRef=AllActiveTripsFilter&StopVisitDetailLevel=normal")

    print("All siri_sm self-tests passed.")
    print("Example:", build_sm_url("http://x", "DM1234", 32902,
                                    preview_interval="PT45M",
                                    stop_visit_detail_level="calls"))


if __name__ == "__main__":
    _selftest()
