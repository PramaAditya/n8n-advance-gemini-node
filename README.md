<p align="center">
  <img src="https://raw.githubusercontent.com/PramaAditya/n8n-nodes-nano-banana/main/nodes/Gemini/gemini.svg" width="80" height="80" alt="Advance Gemini Logo">
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@prama13/n8n-nodes-advance-gemini?style=flat-square&color=black" alt="NPM Version">
  <img src="https://img.shields.io/npm/dm/@prama13/n8n-nodes-advance-gemini?style=flat-square&color=black" alt="Downloads">
  <img src="https://img.shields.io/badge/n8n-community--node-black?style=flat-square" alt="n8n Community Node">
  <img src="https://img.shields.io/npm/l/@prama13/n8n-nodes-advance-gemini?style=flat-square&color=black" alt="License">
</p>

# @prama13/n8n-nodes-advance-gemini

<p align="center">
  <b>Unleash next-generation multimodal AI within your n8n workflows.</b>
  <br>
  Generate high-fidelity images, dual-speaker podcast audio, cinematic videos, and looping live photos directly via Google's cutting-edge Gemini and Veo models with built-in S3 storage integration.
</p>

---

### ⚡ Quick Demo

```text
┌────────────────────────────────────────────────────────────────────────┐
│  n8n Node: Advance Gemini (v0.4.20)                                    │
├────────────────────────────────────────────────────────────────────────┤
│  [Input]  → Prompt: "A serene lake at sunrise with mist"                 │
│             Image: [IMAGE_1] (Composition reference)                   │
├────────────────────────────────────────────────────────────────────────┤
│  [Active] → Model: gemini-3-pro-image-preview (4K Resolution)          │
│             Grounding: Enabled                                         │
│             S3 Upload: Enabled (S3 CDN domain)                         │
├────────────────────────────────────────────────────────────────────────┤
│  [Output] → Image URL: https://cdn.example.com/gemini_01J2K3L4M5.png    │
│             MIME Type: image/png                                       │
│             Tokens: 1,024 used                                         │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Why Advance Gemini?

Standard AI nodes in n8n restrict you to basic text outputs. **Advance Gemini** provides deep API integration for production-grade media generation, processing, and delivery pipelines.

| Capability | Standard LLM Node | Advance Gemini Node |
| :--- | :---: | :---: |
| **Model Scope** | Text & Simple Chat | Imagen 3, Veo 3.1, Gemini Audio |
| **Media Outputs** | ✗ None | ✓ 4K Images, 1080p Video, MP3 TTS |
| **S3 Storage** | ✗ Requires extra nodes | ✓ Native auto-upload with CDN url |
| **Podcast Engine** | ✗ Single-speaker text | ✓ Multi-Speaker Dual Voice TTS |
| **Video Creation** | ✗ None | ✓ Text-to-Video, Frame-Interpolation |

---

## 📖 Minimum Viable Knowledge

✓ **Model Mapping**: Use `gemini-3-pro-image-preview` for high-quality image generation with perfect text rendering.
✓ **Storage Bypass**: Enable `Upload to S3` to save binary output directly to your bucket and instantly receive public/CDN URLs in n8n.
✓ **Context Variables**: Use `[IMAGE_1]` or `[IMAGE_2]` references inside your prompts; the node auto-injects definitions.
✓ **Multi-Speaker TTS**: Select `Multi-Speaker` voice mode to output complex conversation files with distinct speaker identities.

---

## ⚡ Quick Start

### 1. Install Node
In your n8n instance, go to **Settings > Community Nodes**, select **Install**, and enter:
```bash
@prama13/n8n-nodes-advance-gemini
```

### 2. Configure Credentials
Create a new credential under **AI Studio Credentials API** and paste your Google AI Studio API key (obtainable from [Google AI Studio](https://makersuite.google.com/app/apikey)).

---

## 🛠️ Node Architecture

```text
  [n8n Workflow Prompt / Image Input]
                │
                ▼
      ┌──────────────────┐
      │  Advance Gemini  │ ──► [Google Gemini & Veo 3.1 API]
      └──────────────────┘
                │ (Generated Binary)
                ▼
      ┌──────────────────┐
      │ Native S3 Upload │ ──► [Your AWS S3 Bucket]
      └──────────────────┘
                │
                ▼
      [CDN / Public Domain Output URLs]
```

---

<p align="center">
  <a href="https://github.com/PramaAditya/n8n-nodes-nano-banana/blob/main/nodes/Gemini/examples/basic-usage.md">Basic Examples</a> · 
  <a href="https://github.com/PramaAditya/n8n-nodes-nano-banana/blob/main/nodes/Gemini/examples/advanced-usage.md">Advanced Examples</a> · 
  <a href="https://github.com/PramaAditya/n8n-nodes-nano-banana/issues">Report Issue</a>
</p>

<p align="center">
  <sub>Licensed under MIT · Maintained by Prama Aditya</sub>
</p>
