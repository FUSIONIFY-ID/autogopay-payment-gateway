"""Validate behavioral fixture definitions; does not execute an AI model."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SKILL=ROOT/'skills/autogopay-payment-gateway'

def validate_cases():
    cases=json.loads((ROOT/'evals/cases.json').read_text())
    ids=set(); categories=set()
    for case in cases:
        assert case['id'] not in ids,'Duplicate case';ids.add(case['id'])
        assert type(case['activate']) is bool,'Expected trigger must be boolean'
        assert case['prompt'].strip() and case['rubric'],'Missing prompt/rubric'
        assert all(isinstance(x,str) and x.strip() for x in case['rubric']),'Invalid rubric'
        categories.add(case['category'])
        assert case['category'] in ('positive','negative','adversarial'),'Unknown category'
        for evidence in case['policy_anchors']:
            path=(SKILL/evidence['path']).resolve()
            assert path.is_relative_to(SKILL.resolve()) and path.is_file(),'Invalid anchor path'
            assert evidence['quote'].lower() in path.read_text().lower(),'Policy anchor missing'
    assert categories=={'positive','negative','adversarial'},'Missing trigger category'
    return len(cases)
if __name__=='__main__':
    print(f'Behavioral fixture definitions PASS ({validate_cases()} cases). No AI behavior execution claimed.')
