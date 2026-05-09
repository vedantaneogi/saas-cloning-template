"""Formula evaluation for formula-type fields.

Supports:
  - Field references in square brackets: [FieldLabel]
  - Basic arithmetic: +, -, *, /
  - Math functions: Floor(n), Round(n, places), Abs(n), min(a,b,...), max(a,b,...),
                    sum(a,b,...), average(a,b,...)
  - Date functions: AddDays(date, n), AddMonths(date, n), AddYears(date, n),
                    DateDiff(date1, date2), Day(date), Days(date), Today(), Now()
  - Conditional: if(condition, true_value, false_value)
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
        ast.Constant,
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
    def _resolve_arg(arg: str) -> str:
        """Resolve [Label] references in function arguments."""
        a = arg.strip()
        if a.startswith("[") and a.endswith("]"):
            return values.get(a[1:-1], a.strip('"\''))
        return a.strip('"\'')

    # AddDays([Field], N) or AddDays("2024-01-01", N)
    def _add_days(m: re.Match) -> str:
        date_arg = m.group(1).strip()
        n_arg = _resolve_arg(m.group(2))
        raw_date = _resolve_arg(date_arg)
        d = _parse_date(raw_date)
        if d is None:
            return "0"
        try:
            result = d + timedelta(days=float(n_arg))
            return result.isoformat()
        except Exception:
            return "0"

    def _add_months(m: re.Match) -> str:
        n_arg = _resolve_arg(m.group(2))
        raw_date = _resolve_arg(m.group(1))
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
        n_arg = _resolve_arg(m.group(2))
        raw_date = _resolve_arg(m.group(1))
        d = _parse_date(raw_date)
        if d is None:
            return "0"
        try:
            n = int(float(n_arg))
            return date(d.year + n, d.month, d.day).isoformat()
        except Exception:
            return "0"

    def _date_diff(m: re.Match) -> str:
        raw1 = _resolve_arg(m.group(1))
        raw2 = _resolve_arg(m.group(2))
        d1, d2 = _parse_date(raw1), _parse_date(raw2)
        if d1 is None or d2 is None:
            return "0"
        return str((d1 - d2).days)

    def _day(m: re.Match) -> str:
        raw_date = _resolve_arg(m.group(1))
        d = _parse_date(raw_date)
        return str(d.day) if d else "0"

    def _days(m: re.Match) -> str:
        raw_date = _resolve_arg(m.group(1))
        d = _parse_date(raw_date)
        if d is None:
            return "0"
        import calendar
        return str(calendar.monthrange(d.year, d.month)[1])

    def _today(m: re.Match) -> str:
        return date.today().isoformat()

    def _now(m: re.Match) -> str:
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Zero-arg date functions — must be substituted BEFORE AddDays/etc so they see the date string
    expr = re.sub(r'Today\s*\(\s*\)', _today, expr, flags=re.IGNORECASE)
    expr = re.sub(r'Now\s*\(\s*\)', _now, expr, flags=re.IGNORECASE)
    # Argument pattern: either [Label] or a quoted string or a number or a date-like string (YYYY-MM-DD)
    _arg = r'(\[[^\]]+\]|"[^"]*"|\'[^\']*\'|[\d][\d.:\-]+[\d]|[\d.+-]+)'
    expr = re.sub(rf'AddDays\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _add_days, expr)
    expr = re.sub(rf'AddMonths\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _add_months, expr)
    expr = re.sub(rf'AddYears\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _add_years, expr)
    expr = re.sub(rf'DateDiff\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _date_diff, expr)
    expr = re.sub(rf'Day\s*\(\s*{_arg}\s*\)', _day, expr)
    expr = re.sub(rf'Days\s*\(\s*{_arg}\s*\)', _days, expr)
    return expr


def _apply_math_functions(expr: str) -> str:
    """Apply math functions (Floor, Round, Abs, min, max, sum, average, if) after field substitution."""

    def _floor(m: re.Match) -> str:
        try:
            import math
            return str(math.floor(float(m.group(1).strip())))
        except (ValueError, TypeError):
            return "0"

    def _round(m: re.Match) -> str:
        try:
            return str(round(float(m.group(1).strip()), int(float(m.group(2).strip()))))
        except (ValueError, TypeError):
            return "0"

    def _abs(m: re.Match) -> str:
        try:
            return str(abs(float(m.group(1).strip())))
        except (ValueError, TypeError):
            return "0"

    def _min_func(m: re.Match) -> str:
        nums = []
        for part in re.split(r'\s*,\s*', m.group(1).strip()):
            try:
                nums.append(float(part.strip()))
            except (ValueError, TypeError):
                pass
        return str(min(nums)) if nums else "0"

    def _max_func(m: re.Match) -> str:
        nums = []
        for part in re.split(r'\s*,\s*', m.group(1).strip()):
            try:
                nums.append(float(part.strip()))
            except (ValueError, TypeError):
                pass
        return str(max(nums)) if nums else "0"

    def _sum_func(m: re.Match) -> str:
        total = 0.0
        for part in re.split(r'\s*,\s*', m.group(1).strip()):
            try:
                total += float(part.strip())
            except (ValueError, TypeError):
                pass
        return str(total)

    def _average_func(m: re.Match) -> str:
        nums = []
        for part in re.split(r'\s*,\s*', m.group(1).strip()):
            try:
                nums.append(float(part.strip()))
            except (ValueError, TypeError):
                pass
        return str(sum(nums) / len(nums)) if nums else "0"

    def _eval_comparison(cond_str: str) -> bool:
        for op, fn in [(">=", lambda a, b: a >= b), ("<=", lambda a, b: a <= b),
                        ("!=", lambda a, b: a != b), ("==", lambda a, b: a == b),
                        (">", lambda a, b: a > b), ("<", lambda a, b: a < b)]:
            if op in cond_str:
                parts = cond_str.split(op, 1)
                try:
                    return fn(float(parts[0].strip()), float(parts[1].strip()))
                except (ValueError, IndexError):
                    return False
        try:
            return float(cond_str.strip()) != 0
        except (ValueError, TypeError):
            return False

    def _if_func(m: re.Match) -> str:
        return m.group(2).strip() if _eval_comparison(m.group(1).strip()) else m.group(3).strip()

    _arg = r'([\d.+-]+)'
    _if_arg = r'([^,]+)'
    _varargs = r'([\d.+-]+(?:\s*,\s*[\d.+-]+)*)'
    expr = re.sub(rf'Floor\s*\(\s*{_arg}\s*\)', _floor, expr, flags=re.IGNORECASE)
    expr = re.sub(rf'Round\s*\(\s*{_arg}\s*,\s*{_arg}\s*\)', _round, expr, flags=re.IGNORECASE)
    expr = re.sub(rf'Abs\s*\(\s*{_arg}\s*\)', _abs, expr, flags=re.IGNORECASE)
    expr = re.sub(rf'min\s*\(\s*{_varargs}\s*\)', _min_func, expr, flags=re.IGNORECASE)
    expr = re.sub(rf'max\s*\(\s*{_varargs}\s*\)', _max_func, expr, flags=re.IGNORECASE)
    expr = re.sub(rf'sum\s*\(\s*{_varargs}\s*\)', _sum_func, expr, flags=re.IGNORECASE)
    expr = re.sub(rf'average\s*\(\s*{_varargs}\s*\)', _average_func, expr, flags=re.IGNORECASE)
    expr = re.sub(rf'if\s*\(\s*{_if_arg}\s*,\s*{_if_arg}\s*,\s*{_if_arg}\s*\)', _if_func, expr, flags=re.IGNORECASE)
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

    # 3. Apply math functions that operate on numeric values (after field substitution)
    expr = _apply_math_functions(expr)

    # 4. If the result is a date/datetime string, return it directly
    clean = expr.strip()
    if re.match(r'^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$', clean):
        return clean

    # 5. Evaluate pure arithmetic
    return _safe_eval_arithmetic(clean)
