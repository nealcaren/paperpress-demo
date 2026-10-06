# paperpress demo: Suffrage Press

**Live site: https://nealcaren.github.io/paperpress-demo/**

A small sample archive built with [paperpress](https://github.com/nealcaren/paperpress):
15 issues (160 pages) of three U.S. woman-suffrage periodicals from the Internet Archive,
plus one issue of a Vietnamese paper to show translation.

- *The Revolution* (Stanton and Anthony's weekly), April 1870
- *The Woman's Journal*, February 1912
- *The Suffragist*, September 1914 and January 1917, when the Silent Sentinels began
  picketing the White House
- *Tranh Đấu* ("Struggle"), the Vietnamese-language paper of the La Lutte group in Saigon,
  13 July 1939: a special number for the 150th anniversary of the French Revolution

Every page is OCR'd in reading order, searchable, and citable, and each suffrage issue has
a table of contents drafted by an LLM. Every issue also has a IIIF manifest, e.g.
[The Suffragist, January 17, 1917 in Mirador](https://projectmirador.org/embed/?iiif-content=https://nealcaren.github.io/paperpress-demo/iiif/suffragist/1917-01-17/manifest.json);
the whole archive is the collection
`https://nealcaren.github.io/paperpress-demo/iiif/collection.json`. This folder is the output of `paperpress build`;
it was made with:

```bash
paperpress init suffrage-press && cd suffrage-press
paperpress title add revolution "The Revolution" --ia-query 'identifier:revolution-18*'
paperpress title add womans-journal "The Woman's Journal" --ia https://archive.org/details/pub_the-womans-journal
paperpress title add suffragist "The Suffragist" --ia https://archive.org/details/pub_the-suffragist
paperpress add ia suffragist --from 1917-01-01 --to 1917-01-31     # and so on for each run
paperpress ocr
paperpress profile suffragist      # and the other two titles
paperpress enrich
paperpress build --url https://nealcaren.github.io/paperpress-demo/
```

*Tranh Đấu* came from a PDF and was OCR'd on a GPU (UNC's Longleaf cluster) with
DocLayout-YOLO and GLM-OCR, which reads Vietnamese diacritics. Then an LLM translated it
into English region by region, so its reader can show the original, the English, or both
beside the scan, and search covers both:

```bash
paperpress title add tranh-dau "Tranh Đấu"
paperpress add pdf tranh-dau pdfs --date-format YYYYMMDD --ppi 400
paperpress ocr          # with [ocr] detector = "doclayout_yolo", recognizer = "glm-ocr",
                        # and [ocr.recognizer_options] mode = "local"
paperpress translate tranh-dau --source "Vietnamese" --model openai/gpt-5.6-luna
```

The suffrage scans are public domain, from the Internet Archive's copies. OCR text, the
tables of contents and the translation are machine-made and contain errors (the OCR often
gets Vietnamese tone marks wrong, and the translation sometimes smooths the original's
wording); check the page image before quoting.
