# Engineering brief (LaTeX)

**`GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex`** — in-depth briefing for electrical and software engineers, including equations, software architecture, GBA-0002 compliance matrix, and client communication guidance.

## Build PDF

Requires [TeX Live](https://tug.org/texlive/) or [MiKTeX](https://miktex.org/).

```bash
cd fuse-tool/docs/engineering
pdflatex GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex
pdflatex GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex
```

Output: `GBA_FUSE_TOOL_ENGINEERING_BRIEF.pdf`

On Windows with MiKTeX installed:

```powershell
cd "d:\GB Engineering\fuse-tool\docs\engineering"
pdflatex -interaction=nonstopmode GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex
pdflatex -interaction=nonstopmode GBA_FUSE_TOOL_ENGINEERING_BRIEF.tex
```

## Audience

- Electrical engineers — theory, equations, assumptions, gaps
- Software engineers — module map, API, tests, UI boundaries
- Project leads — Chapter 6 client communication templates

For end-user instructions see [`../CLIENT_V0.md`](../CLIENT_V0.md) (client/v0) or [`../USER_GUIDE.md`](../USER_GUIDE.md) on main / client/v1–v2.

For project status vs GBA-0002 see Chapter 5 (compliance matrix) and Chapter 6 (client communication) in the brief.
