# Colab — PDF Extraction

This directory holds the one-off Colab notebook that extracts the textbook PDFs into markdown + images using [marker-pdf](https://github.com/datalab-to/marker).

## Why this exists

Marker-pdf runs a stack of ML models (layout detection, text recognition, OCR error correction, table recognition). These need **~5 GB of working memory** at peak. An 8 GB M1 Air cannot run this without swap-thrashing the SSD — a single chapter doesn't finish in hours. Google Colab's free tier gives us a Tesla T4 GPU + 12 GB RAM and runs the full book in ~15–20 min.

We only run this when the source PDFs change (rare — the professor publishes new chapters infrequently). The resulting markdown is post-processed by `scripts/split-sections.ts` and the section MDX files are checked into `content/mlbook/` — so **regular development does not need Colab at all**.

## Files

| Path | Purpose | Committed? |
|------|---------|------------|
| `extract_pdfs.ipynb` | The notebook itself. | ✅ yes |
| `README.md` | This file. | ✅ yes |
| `output/` | Downloaded `mlbook-extracted.zip` from Colab runs. | ❌ gitignored |

## How to use

1. Open `extract_pdfs.ipynb` in [Google Colab](https://colab.research.google.com/) (File → Upload notebook, or once pushed to GitHub, open directly from the repo).
2. Runtime → Change runtime type → **T4 GPU**.
3. Run all cells. Upload the 5 chapter PDFs when prompted.
4. Download the resulting `mlbook-extracted.zip`.
5. On your Mac:
   ```bash
   cd ~/ml-book-reader
   rm -rf tmp/extracted
   mkdir -p tmp
   unzip ~/Downloads/mlbook-extracted.zip -d tmp/
   npx tsx scripts/split-sections.ts     # splits into per-section MDX + stages images
   bash scripts/upload-r2.sh              # uploads images/PDFs to mlbook-assets bucket
   npx tsx scripts/index-book.ts          # embeds + upserts into Supabase pgvector
   ```

## Chapter → PDF mapping

Keep in sync with `scripts/extract-pdfs.sh`:

| Chapter ID | PDF filename |
|------------|--------------|
| `ch3`  | `Chapter 3_Probability and Statistics.pdf` |
| `ch8`  | `Chapter 8 -Regressions.pdf` |
| `ch9`  | `Chapter 9- Classification Algorithms.pdf` |
| `ch10` | `Chapter 10-Artificial Neural Network.pdf` |
| `ch11` | `Chapter 11-Self-supervised Deep Learning.pdf` |

## Source of the PDFs

The PDFs live in `~/MLBook/` on the author's machine (cloned from https://github.com/Amith71965/MLBook). They are **not checked into this repo** — we host them on R2 (`pdfs/` prefix of the `mlbook-assets` bucket) so students can download them without cloning the 689 MB source repository.
