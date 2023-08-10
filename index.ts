/// Replacer

const replace = require("replace-in-file");
const util = require("util");
const { promises: fs } = require("fs");
const path = require("path");

interface myArgs {
  h: boolean | undefined;
  dir: string | undefined;
  in: string | undefined;
  all: boolean | undefined;
  ext: string | undefined;
  notext: string | undefined;
  d: boolean | undefined;
  dry: boolean | undefined;
}
interface replaced {
  file: string;
  numMatches: number;
  numReplacements: number;
  hasChanged: boolean;
}

/// Recursively finds all files in a directory.
const walk = async (
  dir: string,
  showHidden: boolean,
  allowedExtensions: string[],
  disallowedExtensions: string[]
) => {
  let entries = await fs.readdir(dir);

  if (showHidden) {
    /// Removes hidden files / folders
    entries = entries.filter((item) => !/(^|\/)\.[^\/\.]/g.test(item));
  }

  let ret: string[] = [];

  /// Loop through all items found in current dir
  for (const entry of entries) {
    const fullpath: string = path.resolve(dir, entry);
    const info = await fs.stat(fullpath);
    if (info.isDirectory()) {
      /// If item is directory, recurse.
      ret = [
        ...ret,
        ...(await walk(
          fullpath,
          showHidden,
          allowedExtensions,
          disallowedExtensions
        )),
      ];
    } else if (
      checkExtAllowed(fullpath, allowedExtensions) &&
      checkExtDisallowed(fullpath, disallowedExtensions)
    ) {
      /// Checks if file name is allowed (or not disallowed)
      ret = [...ret, fullpath];
    }
  }
  return ret;
};

/// True if file extension is on allowed list, or if list is empty.
const checkExtAllowed = (name: string, extensions: string[]): boolean => {
  const ext: string = path.extname(name).substring(1);

  return extensions.includes(ext) || extensions.length == 0;
};

/// True if file extension is not on disallowed list, or if list is empty.
const checkExtDisallowed = (name: string, extensions: string[]): boolean => {
  const ext = path.extname(name).substring(1);

  return !extensions.includes(ext) || extensions.length == 0;
};

/// Runs replacement.
const runReplacer = async (
  dir: string,
  from: RegExp[],
  to: string[],
  showHidden: boolean,
  allowedExtensions: string[],
  disallowedExtensions: string[],
  dry: boolean
) => {
  /// Recursive function to find all files to be searched.
  const allFiles = await walk(
    dir,
    showHidden,
    allowedExtensions,
    disallowedExtensions
  );

  /// Config object for replace-in-file.
  const options = {
    files: allFiles,
    from: from,
    to: to,
    countMatches: true,
    dry: dry,
  };

  /// Make the replacements.
  const x: replaced[] = replace.sync(options);

  /// Changed file counter.
  let count = 0;

  /// Format string output
  const output: string = x
    .map((e: replaced) => {
      const str = e.hasChanged
        ? `\n${e.file.split("/").at(-1)}: ${e.numReplacements} replacements`
        : undefined;
      if (str) count++;

      return str;
    })
    .join("");

  process.stdout.write(output);
  if (dry) {
    process.stdout.write(`\n\n${count} files to be changed\n\n`);
  } else {
    process.stdout.write(`\n\n${count} files changed\n\n`);
  }
};

/// Prints helps to console.
const showHelp = () => {
  process.stdout.write("\n\nreplacer \n \n\n");
  process.stdout.write("params: \n \n\n");
  process.stdout.write("--dir          directory for replacements \n");
  process.stdout.write(
    "--in           json of replacement key value pairs. either direct json or path to file\n"
  );
  process.stdout.write(
    "--a            search all, including hidden files and folders\n"
  );
  process.stdout.write(
    "--ext          comma seperated list of allowed extensions\n"
  );
  process.stdout.write(
    "--notext       comma seperated list of disallowed extensions\n"
  );
  process.stdout.write("--dry          perform a dry-run\n");
  process.stdout.write("--d            run in debug mode\n");
  process.stdout.write(
    "--h            show this small and not very useful help screen \n"
  );
  process.stdout.write("\n\n\n\n");
};

// ------------------------------------------------------------

/// Load cmd line args.
const argv: myArgs = require("minimist")(process.argv.slice(2));

if (argv.h) {
  showHelp();
} else {
  /// Load variables
  const dir: string = argv.dir ?? ".";
  const showHidden: boolean = argv.all ?? false;
  let allowedExtensions: string[];
  let disallowedExtensions: string[];
  let from: RegExp[];
  let to: string[];

  try {
    allowedExtensions = argv.ext != undefined ? argv.ext.split(",") : [];
  } catch (err) {
    process.stdout.write("Error: allowed extensions bad format");
    if (argv.d) process.stdout.write(`\n\n${err}`);
  }
  try {
    disallowedExtensions =
      argv.notext != undefined ? argv.notext.split(",") : [];
  } catch (err) {
    process.stdout.write("Error: disallowed extensions bad format");
    if (argv.d) process.stdout.write(`\n\n${err}`);
  }

  if (argv.in != undefined && argv.in.includes(".json")) {
    try {
      const variables = require(argv.in);

      from = Object.keys(variables).map((w) => {
        w = w.replaceAll("(", "\\(");
        w = w.replaceAll(")", "\\)");
        w = w.replaceAll("[", "\\[");
        w = w.replaceAll("]", "\\]");
        return RegExp(w, "g");
      });
      to = Object.values(variables);
    } catch (err) {
      process.stdout.write("Error: Input file error");
      if (argv.d) process.stdout.write(`\n\n${err}`);
    }

    if (argv.d) {
      process.stdout.write(
        `\n\ndirectory: ${dir}\n\nshowHidden: ${showHidden}\n\nextensions: ${allowedExtensions}\n\ndisallowed extensions: ${disallowedExtensions}\n\nparams from: ${from}\n\nparams to: ${to}`
      );
    }

    runReplacer(
      dir,
      from,
      to,
      showHidden,
      allowedExtensions,
      disallowedExtensions,
      argv.dry ?? false
    );
  } else {
    process.stdout.write("Error: Input file error");
  }
}
