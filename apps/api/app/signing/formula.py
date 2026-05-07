"""Formula evaluation for formula-type fields.

Supports:
  - Field references in square brackets: [FieldLabel]
  - Basic arithmetic: +, -, *, /
  - Date functions: AddDays(date, n), AddMonths(date, n), AddYears(date, n),
                    DateDiff(date1, date2), Day(date), Days(date)
"""

from __future__ import annotations

import re
from datetime import date, timedelta
from typing import Union


def _parse_date(s: str) -> date | None:
    """Try to parse a date string in various common formats."""
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%B %d, %Y", "%b %d, %Y"):
        try:
            from datetime import datetime
            return datetime.strptime(s.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _substitute_fields(expr: str, values: dict[str, str]) -> str:
    """Replace [FieldLabel] references with their numeric values (or 0 if missing/non-numeric)."""
    def replacer(m: re.Match) -> str:
        label = m.group(1)
        raw = values.get(label, "")
        try:
            return str(float(raw))
        except (ValueError, TypeError):
            return "0"

    return re.sub(r"\[([^\]]+)\]", replacer, expr)


def _safe_eval_arithmetic(expr: str) -> float:
    """Evaluate a simple arithmetic expression containing only digits, spaces, and +-*/.()"""
    # Whitelist: only allow digits, decimal points, whitespace, and arithmetic operators/parens
    clean = expr.strip()
    if not re.match(r'^[\d\s+\-*/().]+$', clean):
        raise ValueError(f"Unsafe expression: {clean!r}")

    # Use Python's ast to evaluate safely
    import ast
    try:
        tree = ast.parse(clean, mode='eval')
    except SyntaxError as exc:
        raise ValueError(f"Syntax error in formula: {exc}") from exc

    # Only allow safe node types
    _SAFE_NODES = (
        ast.Expression, ast.BinOp, ast.UnaryOp,
        ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod, ast.Pow, ast.FloorDiv,
        ast.USub, ast.UAdd,
        ast.Constant, ast.Num,  # ast.Num for Python < 3.8 compat
    )
    for node in ast.walk(tree):
        if not isinstance(node, _SAFE_NODES):
            raise ValueError(f"Disallowed node type: {type(node).__name__}")

    return float(eval(compile(tree, "<formula>", "eval")))  # noqa: S307


def _apply_date_functions(expr: str, values: dict[str, str]) -> str:
    """
    Substitute date function calls with their computed results (as day-counts or date strings),
    then return the modified expression for arithmetic evaluation.
    """
    # AddDays([Field], N) or AddDays("2024-01-01", N)
    def _add_days(m: re.Match) -> str:
        date_arg = m.group(1).strip()
        n_arg = m.group(2).strip()
        raw_date = values.get(date_arg.strip("[]"), date_arg.strip('"\''))
        d = _parse_date(raw_date)
        if d is None:
            return "0"
        try:
            result = d + timedelta(days=float(n_arg))
            return result.isoformat()
        except Exception:
            return "0"

    def _add_months(m: re.Match) -> str:
        date_arg = m.group(1).strip()
        n_arg = m.group(2).strip()
        raw_date = values.get(date_arg.strip("[]"), date_arg.strip('"\''))
        d = _parse_date(raw_date)
        if d is None:
            return "0"
        try:
            n = int(float(n_arg))
            month = d.month - 1 + n
            year = d.year + month // 12
            month = month % 12 + 1
            import calendar
            day = min(d.day, calendar.monthrange(year, month)[1])
            return date(year, month, day).isoformat()
        except Exception:
            return "0"

    def _add_years(m: re.Match) -> str:
        date_arg = m.group(1).strip()
        n_arg = m.group(2).strip()
        raw_date = values.get(date_arg.strip("[]"), date_arg.strip('"\''))
        d = _parse_date(raw_date)
        if d is None:
            return "0"
        try:
            n = int(float(n_arg))
            return date(d.year + n, d.month, d.day).isoformat()
        except Exception:
            return "0"

    def _date_diff(m: re.Match) -> str:
        d1_arg = m.group(1).strip()
        d2_arg = m.group(2).strip()
        raw1 = values.get(d1_arg.strip("[]"), d1_arg.strip('"\''))
        raw2 = values.get(d2_arg.strip("[]"), d2_arg.strip('"\''))
        d1, d2 = _parse_date(raw1), _parse_date(raw2)
        if d1 is None or d2 is None:
            return "0"
        return str((d1 - d2).days)

    def _day(m: re.Match) -> str:
        date_arg = m.group(1).strip()
        raw_date = values.get(date_arg.strip("[]"), date_arg.strip('"\''))
        d = _parse_date(raw_date)
        return str(d.day) if d else "0"

    def _days(m: re.Match) -> str:
        date_arg = m.group(1).strip()
        raw_date = values.get(date_arg.strip("[]"), date_arg.strip('"\''))
        d = _parse_date(raw_date)
        if d is None:
            return "0"
        # Days since epoch (Jan 1 1970)
        return str((d - date(1970, 1, 1)).days)

    # Argument pattern: either [Label] or a quoted string or a number
    _arg = r'(\[[^\]]+\]|"[^"]*"|\'[^\']*\'|[\d.+-]+)'
    expr = re.sub(rf'AddDays\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _add_days, expr)
    expr = re.sub(rf'AddMonths\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _add_months, expr)
    expr = re.sub(rf'AddYears\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _add_years, expr)
    expr = re.sub(rf'DateDiff\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _date_diff, expr)
    expr = re.sub(rf'Day\s*\(\s*{_arg}\s*\)', _day, expr)
    expr = re.sub(rf'Days\s*\(\s*{_arg}\s*\)', _days, expr)
    return expr


def evaluate_formula(formula: str, field_values: dict[str, str]) -> Union[float, str]:
    """
    Evaluate a formula string and return the result.

    :param formula: The formula string, e.g. "[Price] * [Qty] + [Tax]"
    :param field_values: Mapping of field label -> current string value.
    :returns: Computed numeric float, or a string result for date operations.
    :raises: ValueError on parse/eval errors.
    """
    expr = formula.strip()

    # 1. Apply date functions first (before numeric substitution messes up labels)
    expr = _apply_date_functions(expr, field_values)

    # 2. Replace remaining [Label] references with numeric values
    expr = _substitute_fields(expr, field_values)

    # 3. Evaluate pure arithmetic
    return _safe_eval_arithmetic(expr)
