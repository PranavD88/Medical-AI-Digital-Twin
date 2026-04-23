from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any


_SEVERITY_ORDER = {
    "none": 0,
    "low": 1,
    "moderate": 2,
    "high": 3,
    "contraindicated": 4,
}


def _norm(text: str | None) -> str:
    return (text or "").strip().lower()


def _contains_any(haystack: str, needles: list[str]) -> bool:
    h = _norm(haystack)
    return any(_norm(n) in h for n in needles if _norm(n))


def _to_float(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except Exception:
        return None


def _parse_ckd_stage(stage: str | None) -> int | None:
    s = _norm(stage)
    if not s.startswith("g") or len(s) < 2:
        return None
    try:
        return int(s[1])
    except Exception:
        return None


@lru_cache(maxsize=1)
def _load_rules() -> dict[str, Any]:
    path = Path(__file__).resolve().parent / "data" / "medication_safety_rules.json"
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"version": 1, "drugs": []}


def _find_drug_rule(med_name: str) -> dict[str, Any] | None:
    rules = _load_rules()
    name = _norm(med_name)
    entries = rules.get("drugs", [])

    # Prefer exact alias/name matches first.
    for entry in entries:
        aliases = [_norm(entry.get("name"))] + [_norm(a) for a in entry.get("aliases", [])]
        if any(a and a == name for a in aliases):
            return entry

    # Fallback to loose containment so minor naming variants still match.
    for entry in entries:
        aliases = [_norm(entry.get("name"))] + [_norm(a) for a in entry.get("aliases", [])]
        if any(a and (a in name or name in a) for a in aliases):
            return entry
    return None


def screen_medication_safety(med_name: str, patient_context: dict[str, Any]) -> dict[str, Any]:
    rule = _find_drug_rule(med_name)
    findings: list[dict[str, Any]] = []
    alerts: list[str] = []
    highest = "none"

    def add_finding(category: str, severity: str, message: str, matched: str) -> None:
        nonlocal highest
        sev = _norm(severity) or "moderate"
        findings.append(
            {
                "category": category,
                "severity": sev,
                "matched": matched,
                "message": message,
            }
        )
        alerts.append(f"{sev.upper()}: {message} ({matched})")
        if _SEVERITY_ORDER.get(sev, 0) > _SEVERITY_ORDER.get(highest, 0):
            highest = sev

    if not rule:
        return {
            "medication": med_name,
            "matched_rule": False,
            "risk_level": "none",
            "findings": [],
            "alerts": [],
        }

    is_pregnant = patient_context.get("is_pregnant")
    if is_pregnant is True and isinstance(rule.get("pregnancy"), dict):
        pregnancy_rule = rule["pregnancy"]
        add_finding(
            category="pregnancy",
            severity=str(pregnancy_rule.get("severity", "high")),
            message=str(pregnancy_rule.get("message", "Pregnancy caution for this medication.")),
            matched="is_pregnant=true",
        )

    is_breastfeeding = patient_context.get("is_breastfeeding")
    if is_breastfeeding is True and isinstance(rule.get("breastfeeding"), dict):
        bf_rule = rule["breastfeeding"]
        add_finding(
            category="breastfeeding",
            severity=str(bf_rule.get("severity", "moderate")),
            message=str(bf_rule.get("message", "Breastfeeding caution for this medication.")),
            matched="is_breastfeeding=true",
        )

    conditions = [str(c) for c in (patient_context.get("conditions") or [])]
    for c in conditions:
        for c_rule in rule.get("condition_rules", []):
            keys = [str(k) for k in c_rule.get("match_any", [])]
            if _contains_any(c, keys):
                base_message = str(c_rule.get("message", "Condition-based caution."))
                add_finding(
                    category="condition",
                    severity=str(c_rule.get("severity", "moderate")),
                    message=f"{med_name} caution with condition '{c}': {base_message}",
                    matched=f"condition={c}",
                )

    liver_status = str(patient_context.get("liver_disease_status") or "").strip()
    if liver_status:
        for c_rule in rule.get("condition_rules", []):
            keys = [str(k) for k in c_rule.get("match_any", [])]
            if _contains_any(liver_status, keys):
                base_message = str(c_rule.get("message", "Condition-based caution."))
                add_finding(
                    category="condition",
                    severity=str(c_rule.get("severity", "moderate")),
                    message=f"{med_name} caution with liver status '{liver_status}': {base_message}",
                    matched=f"liver_disease_status={liver_status}",
                )

    ckd_rule = rule.get("ckd_stage_at_least")
    if isinstance(ckd_rule, dict):
        patient_ckd = _parse_ckd_stage(str(patient_context.get("ckd_stage")))
        min_ckd = _parse_ckd_stage(str(ckd_rule.get("stage")))
        if patient_ckd is not None and min_ckd is not None and patient_ckd >= min_ckd:
            base_message = str(ckd_rule.get("message", "Renal function caution."))
            add_finding(
                category="renal",
                severity=str(ckd_rule.get("severity", "high")),
                message=f"{med_name} caution with CKD stage {patient_context.get('ckd_stage')}: {base_message}",
                matched=f"ckd_stage={patient_context.get('ckd_stage')}",
            )

    crcl_rule = rule.get("creatinine_clearance_below_ml_min")
    if isinstance(crcl_rule, dict):
        patient_crcl = _to_float(patient_context.get("creatinine_clearance_ml_min"))
        threshold = _to_float(crcl_rule.get("threshold"))
        if patient_crcl is not None and threshold is not None and patient_crcl < threshold:
            base_message = str(crcl_rule.get("message", "Reduced renal clearance caution."))
            add_finding(
                category="renal",
                severity=str(crcl_rule.get("severity", "high")),
                message=f"{med_name} caution with CrCl {patient_crcl:.1f} mL/min: {base_message}",
                matched=f"creatinine_clearance_ml_min<{threshold}",
            )

    albumin_rule = rule.get("albumin_below_g_dl")
    if isinstance(albumin_rule, dict):
        patient_albumin = _to_float(patient_context.get("albumin_g_dl"))
        threshold = _to_float(albumin_rule.get("threshold"))
        if patient_albumin is not None and threshold is not None and patient_albumin < threshold:
            base_message = str(albumin_rule.get("message", "Low albumin caution."))
            add_finding(
                category="protein_binding",
                severity=str(albumin_rule.get("severity", "moderate")),
                message=f"{med_name} caution with albumin {patient_albumin:.2f} g/dL: {base_message}",
                matched=f"albumin_g_dl<{threshold}",
            )

    current_meds = [str(m) for m in (patient_context.get("current_medications") or [])]
    for current in current_meds:
        for i_rule in rule.get("interaction_rules", []):
            with_any = [str(k) for k in i_rule.get("with_any", [])]
            if _contains_any(current, with_any):
                base_message = str(i_rule.get("message", "Potential interaction."))
                add_finding(
                    category="interaction",
                    severity=str(i_rule.get("severity", "moderate")),
                    message=(
                        f"Interaction detected: {med_name} with current medication '{current}'. "
                        f"{base_message}"
                    ),
                    matched=f"current_medication={current}",
                )

    # Deduplicate same rendered alert lines while preserving order.
    deduped_alerts = list(dict.fromkeys(alerts))

    return {
        "medication": med_name,
        "matched_rule": True,
        "risk_level": highest,
        "findings": findings,
        "alerts": deduped_alerts,
    }
