# Personal learning (not bulk scraping of copyrighted ads)

If your goal is **to learn what makes strong campaigns**—not to redistribute a commercial image corpus—you can still build a useful dataset **without** copying millions of protected creatives off the web.

## What “public” usually does *not* mean

- A campaign image on a **public webpage** is still usually **copyrighted**. “I’m only learning” does not automatically make bulk downloading and storage lawful.
- **Terms of service** on awards sites, social platforms, and libraries often **forbid automated scraping**, even for personal use.

So the framework uses **provenance** and **`rightsClass`** (including `metadata_only_learning`) so you stay intentional about what you store.

## Safer patterns for learning

1. **Metadata-only rows** (`rightsClass: metadata_only_learning`)  
   Store: brand, category, year, channel, headline/tagline *you transcribed*, awards, links, your own notes.  
   **No** stored image/video from third parties. You learn structure and patterns; ML can run on **text + labels** you add.

2. **Open-license media** (`open_license_media`)  
   Use assets from sources with a **clear license** (e.g. CC with attribution, public domain). Keep **attribution** in `provenance.licenseNotes`.

3. **Official APIs and datasets**  
   Wikipedia / Wikidata (metadata), **licensed** research datasets, partner exports — use connectors that respect rate limits and terms.

4. **Manual or small-batch curation**  
   For deep learning, **quality and rights clarity** beat raw volume. Hundreds of well-labeled rows often beat millions of noisy illegal copies.

5. **Case-study text**  
   Many analyses are available as **article text** (fair use context varies by jurisdiction); still prefer **summaries in your own words** + citation URL instead of pasting full articles.

## How this maps to the schema

- **`assets`**: optional empty array for metadata-only learning rows.
- **`provenance.canonicalUrl`**: link to the public reference (you still don’t need to mirror the image).
- **`copy`**: headlines/taglines you have rights to use (your transcription, licensed text, or short factual description).

## What we still don’t ship here

Automated scrapers that hammer third-party ad galleries or social platforms. Add **your own** connector for a source you’re allowed to use (API, CSV export, your Drive), not a generic “scrape the internet” tool.
