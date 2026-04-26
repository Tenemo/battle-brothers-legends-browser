# Social image fonts

These TTF files are used by `scripts/generate-root-social-image.mjs` because `@resvg/resvg-js` needs TTF/OTF font files to render text reliably in generated PNGs.

- Source Sans 3 is from `adobe-fonts/source-sans`, release TTF files.
- `Cinzel.ttf` is from `google/fonts`, `ofl/cinzel/Cinzel[wght].ttf`.
- `Cinzel-Bold.ttf` is converted from the same Cinzel 700 asset shipped by `@fontsource/cinzel`, so generated social images match the browser heading weight.

Both families are distributed under the SIL Open Font License. The copied license files are kept in this directory.
