# paperpress demo: Suffrage Press

**Live site: https://nealcaren.github.io/paperpress-demo/**

A small sample archive built with [paperpress](https://github.com/nealcaren/paperpress):
15 issues (160 pages) of three U.S. woman-suffrage periodicals from the Internet Archive.

- *The Revolution* (Stanton and Anthony's weekly), April 1870
- *The Woman's Journal*, February 1912
- *The Suffragist*, September 1914 and January 1917, when the Silent Sentinels began
  picketing the White House

Every page is OCR'd in reading order, searchable, and citable, and each issue has a
table of contents drafted by an LLM. This folder is the output of `paperpress build`;
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
paperpress build --base /paperpress-demo/
```

The scans are public domain, from the Internet Archive's copies. OCR text and the
tables of contents are machine-made and contain errors; check the page image before
quoting.
