import html
import json
from pathlib import Path
import re
import subprocess
import sys

site = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1])
page = (site / 'rules.html').read_text()
revision = re.search(r'data-docs-revision="([a-f0-9]{40})"', page).group(1)
catalog_php = subprocess.check_output(['git', '-C', str(source), 'show', f'{revision}:resources/catalog.php'])
catalog = json.loads(subprocess.check_output(['php'], input=catalog_php.replace(b'return [', b'echo json_encode([', 1).rstrip().removesuffix(b'];') + b']);'))
index = json.loads(re.search(r'id="rule-index">(.*?)</script>', page, re.S).group(1))
rows = re.findall(r'<li class="rule".*?</li>', page, re.S)
assert set(index) == set(catalog), 'Catalog IDs differ from the documentation revision'
assert len(rows) == len(index), 'Catalog rows and metadata differ'
assert {rule_id for rule_id, metadata in index.items() if 'summary' in metadata} == {'no_unused_private_state', 'useless_variable'}
for row in rows:
    rule_id = re.search(r'<code>(.*?)</code>', row).group(1)
    definition = catalog[rule_id]
    metadata = index[rule_id]
    expected_set = 'standard' if definition.get('standard', True) else 'optional'
    assert metadata['set'] == expected_set, rule_id
    assert f'data-set="{expected_set}"' in row, rule_id
    assert metadata['category'] == definition['class'].split('\\')[3], rule_id
    assert metadata['research'] == ('research' in definition['label'].lower()), rule_id
    assert ('class="research"' in row) == metadata['research'], rule_id
    markdown = subprocess.check_output(['git', '-C', str(source), 'show', f'{revision}:docs/rules/{rule_id}.md']).decode()
    summary = re.search(r'^📝 (.+)$', markdown, re.M).group(1)
    summary = re.sub(r'`([^`]+)`', r'\1', summary)
    summary = metadata.get('summary', summary)
    assert html.escape(summary) in row, rule_id
standard = sum(entry['set'] == 'standard' for entry in index.values())
research = sum(entry['research'] for entry in index.values())
assert f'All {len(index)} checks' in page
assert f'Standard · {standard}' in page
assert f'Opt-in · {len(index) - standard}' in page
assert f'Includes {research} Research checks' in page
print(f'PASS {len(index)} checks match {revision[:7]}; {standard} standard, {len(index) - standard} opt-in, {research} Research')
