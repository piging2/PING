# Nolan Voice: 8-Emotion A/B (2026-10-04)

Two engines, eight emotions, sixteen clips. One folder per emotion.

Judge two things separately for each clip:
1. Voice similarity: does this sound like Nolan?
2. Performance similarity: does this speak like Nolan?

## The engines

- Files ending `_A_vc.wav`: Alibaba cloud, Qwen3-TTS VC cloned Nolan voice. This is the fidelity baseline. Plain text, no emotion instruction.
- Files ending `_D_local.wav`: local Pig Qwen3-TTS (1.7B Base) cloned Nolan voice. Plain text, no emotion instruction.

## About the missing B and C engines

Two more engines were planned (Alibaba Plus voice with restrained and strong
emotion instructions). The Plus voice enrolled fine, but every synthesis call
is rejected with "Access denied by API-Key restrictions": the API key may call
the VC model but not the Plus model. That is a console permission to widen,
then the B and C legs can be generated with one command. The instruction texts
are saved in index.json so nothing is lost.

## The eight emotions

neutral, warm, curious, excited, serious, reflective, amused, dramatic.
Each folder has the A clip and the D clip for that emotion, reading the same text.

Full details (texts, instructions, byte sizes, checksums, Drive IDs) are in index.json.
