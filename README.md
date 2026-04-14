# HiveToons Paperback 0.8

This folder is a Paperback 0.8 repository for `hivetoons.org`.

## Files

- `versioning.json`: Paperback repo manifest
- `HiveToons/source.js`: source implementation
- `HiveToons/includes/icon.webp`: source icon
- `index.html`: small repo landing page with a dynamic Add to Paperback link

## How to use it

1. Host the contents of this folder on any static host.
2. Open the hosted `index.html` page on your iPhone/iPad and tap `Add to Paperback`, or paste the hosted folder URL into Paperback's repo add flow.

## Notes

- Search/archive pages use HiveToons' public `api/query` endpoint.
- Series details and chapter pages are parsed from the site-rendered HTML so the source still works even if those API routes are private or change.
- Locked chapters are filtered out of the chapter list because HiveToons marks some latest releases as inaccessible.
