import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

export function parseArgs() {
  return yargs(hideBin(process.argv))
    .version('1.0.0')
    .help()
    .strict()
    .usage('Merge data from CSV files into GeoJSON Features')
    .option('feature-id', {
      alias: 'id',
      type: 'string',
      description:
        'A Feature property containing the ID used to match to CSV rows. If absent, an `id` field will be expected in each Feature',
    })
    .option('csv-id', {
      type: 'string',
      description:
        'A CSV column containing the ID to match to GeoJSON Features. If absent, the `feature-id` option is used if present.',
    })
    .option('filter', {
      type: 'array',
      description:
        'One or more Javascript boolean expressions that will be used to filter the CSV rows.',
    })
    .option('csv', {
      alias: 'c',
      type: 'array',
      description: 'The paths to one or more CSV files',
      demandOption: true,
    })
    .option('json', {
      alias: 'j',
      type: 'string',
      description: 'The path to a GeoJSON file',
      demandOption: true,
    })
    .option('autocoerce', {
      type: 'boolean',
      description: 'Attempt to convert all CSV values to numbers and booleans',
    })
    .option('delimiter', {
      type: 'string',
      alias: 'd',
      default: ',',
      description: 'The CSV column delimiter',
    })
    .option('include', {
      type: 'array',
      description: 'A list of CSV columns to include',
    })
    .option('exclude', {
      type: 'array',
      description: 'A list of CSV columns to exclude',
    })
    .option('coerce-columns', {
      type: 'array',
      description: 'Attempt to convert these CSV columns to numbers and booleans',
    })
    .option('strict', {
      type: 'boolean',
      description: 'Throw an error if a CSV row does not match a GeoJSON Feature',
    })
    .option('replace', {
      alias: 'r',
      type: 'boolean',
      description: 'Replace the input GeoJSON file with the merged output',
    })
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Write the output to this file instead of the terminal',
    }).argv;
}
