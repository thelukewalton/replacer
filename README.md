# replacer

Simple command line tool to bulk replace multiple strings across multiple files.

Will search through all files in a directory recursively, and can replace multiple strings at once, as defined in a JSON object.

## Example

```
replacer --dir ./ all --ext dart,ts --notext js,json --dry --in var.json
```

- `--dir ./` is the directory to search.
- `all` includes all hidden files and folders in search.
- `--ext dart,ts` is a comma separated list of file extensions to include.
- `--notext js,json` is a comma separated list of file extensions to exclude.
- `--dry` performs a dry run
- `--in var.json` is a set of key value pairs, where the key is the old and the value is new.

  var.json

  ```json
  {
    "old": "new",
    "dog": "cat",
    "giraffe": "zebra"
  }
  ```

  This will replace all instances of old, dog and giraffe, with new, cat and zebra respectively.
