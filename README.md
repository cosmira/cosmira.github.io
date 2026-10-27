# Soda website

Static website for Soda. The files in this directory are published from the repository root.

Open `index.html` through GitHub Pages. The rules catalog fetches rule Markdown from the Soda GitHub repository, so visitors need an internet connection.

The catalog and rule Markdown target Soda v1.1.2, commit `b6334afde96c2ae42a4f7bb7a2eed799bcf7c90f`. The reader uses immutable GitHub URLs. Update the catalog rows, rule index, totals and `data-docs-revision` in `rules.html` together when changing the documentation version. The catalog contains 122 checks, including 108 standard and 14 opt-in checks. Two checks are marked Research; representation churn reports evidence without failing the quality gate, while cognitive complexity can report violations.

Run `python3 scripts/check-catalog.py /path/to/soda` against a Soda checkout containing that commit to verify IDs, rule sets, descriptions, research labels and totals. The check uses Git and PHP.

Two rule summaries have local editorial corrections in the rule index. The reader uses those summaries in both the catalog and rule details. Run `node scripts/check-reader.cjs` to check these summaries and skip-link keyboard navigation.
