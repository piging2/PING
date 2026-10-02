import sys
sys.path.insert(0, '/home/hatch/workspace/orca')
from model_router import parse_model_id


def test_parse_model_id_full_with_variant():
    result = parse_model_id("openai/gpt-4/turbo")
    assert result == {"provider": "openai", "model": "gpt-4", "variant": "turbo"}


def test_parse_model_id_without_variant():
    result = parse_model_id("anthropic/claude-3")
    assert result == {"provider": "anthropic", "model": "claude-3", "variant": None}


def test_parse_model_id_missing_slash_raises_value_error():
    try:
        parse_model_id("invalid-model-id")
        assert False, "Expected ValueError"
    except ValueError:
        pass