# merge-geo

A utility to read CSV data about geographic locations and merge it into a GeoJSON FeatureCollection.

## Example

```bash
$ npm -g install merge-geo
$ merge-geo
  --feature-id CBSAFP # The property containing the feature ID, if not present as `id` \
  --csv-id CBSA # CSV column containing the ID \
  --filter '!STCOU' # Javascript expression to filter CSV rows  \
   -c cbsa-est2021-alldata.csv # Input CSV data \
   -j cbsa.json # Input GeoJSON \
  --autocoerce # Automatically convert strings to numbers when possible \
> cbsa_new.json
```

## Usage

```
Merge data from CSV files into GeoJSON Features

Options:
      --version           Show version number                                                                                                          [boolean]
      --help              Show help                                                                                                                    [boolean]
      --feature-id, --id  A Feature property containing the ID used to match to CSV rows.
                          If absent, an `id` field will be expected in each Feature     [string]
      --csv-id            A CSV column containing the ID to match to GeoJSON Features. 
                          If absent, the `feature-id` option is used if present.           [string]
      --filter            One or more Javascript boolean expressions that will be used to filter the CSV rows.                                           [array]
  -c, --csv               The paths to one or more CSV files                                                                                  [array] [required]
  -j, --json              The path to a GeoJSON file                                                                                         [string] [required]
      --autocoerce, --ac  Attempt to convert all CSV values to numbers and booleans                                                                    [boolean]
  -c, --coerce            Attempt to convert these CSV columns to numbers and booleans                                                                   [array]
  -d, --delimiter         The CSV column delimiter                                                                                       [string] [default: ","]
      --include           A list of CSV columns to include                                                                                               [array]
      --exclude           A list of CSV columns to exclude                                                                                               [array]
      --strict            Throw an error if a CSV row does not match a GeoJSON Feature                                                                 [boolean]
  -r, --replace           Replace the input GeoJSON file with the merged output                                                                        [boolean]
  -o, --output            Write the output to this file instead of the terminal                                                                         [string]
      --prefix            A prefix to add to all CSV column names when adding them to Features                                                          [string]
      --omit-empty        Ignore empty values in the CSV instead of adding empty strings                                                               [boolean]
```
