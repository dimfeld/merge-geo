#!/usr/bin/env node
import { createReadStream } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import type { Feature, GeoJSON } from 'geojson';
import esMain from 'es-main';
import { parseArgs } from './args.js';
import csv from 'csv-parser';
import { finished } from 'stream/promises';

export interface MergeGeoOptions {
  /** A list of paths to CSV files */
  csv: string[];
  /** The path to a JSON file */
  geojson: string;
  /** Javascript expressions used to filter the CSV rows. */
  filters?: string[];
  /** The name of the GeoJSON Feature property used to match to CSV rows. */
  featureId?: string;
  /** The name of the CSV column used to match to GeoJSON Features. If absent, the value of `featureId` is used. */
  csvId?: string;
  /** Throw an error if a CSV row does not match a GeoJSON Feature */
  strict?: boolean;
  /** Omit empty values from the CSV instead of adding an empty string */
  omitEmpty?: boolean;
  /** A prefix to add to each column name before adding to the GeoJSON Feature */
  prefix?: string;
  /** A list of columns to include from the CSV */
  include?: string[];
  /** A list of columns to exclude from the CSV */
  exclude?: string[];
  /** Attempt to convert all CSV values to numbers and booleans */
  autoCoerce?: boolean;
  /** Convert these columns to numbers and booleans. In strict mode, fail if it can not be coerced. */
  coerceColumns?: string[];
}

function tryCoerce(s: string, mustSucceed?: boolean): string | boolean | number {
  if (!s.length) {
    return s;
  } else if (s === 'true') {
    return true;
  } else if (s === 'false') {
    return false;
  }

  let possibleNumber = Number(s);
  if (!Number.isNaN(possibleNumber)) {
    return possibleNumber;
  }

  if (mustSucceed) {
    throw new Error(`Could not coerce ${s} to a number or boolean`);
  }

  return s;
}

async function parseOneCsv(
  options: MergeGeoOptions,
  features: Map<string, Feature>,
  csvPath: string
) {
  let filters: Function[] = [];
  let headers: string[] = [];
  let propHeaders: { input: string; output: string; coerce: boolean }[] = [];
  let csvId: string;
  let line = 0;

  function handleHeaders(headerList: string[]) {
    headers = headerList;
    if (options.filters) {
      // Create a function where each header is an argument to the function.
      filters = options.filters.map((f) => new Function(...headers, `return ${f}`));
    }

    csvId = options.csvId || options.featureId! || headers[0];
    if (!headers.includes(csvId)) {
      throw new Error(`Could not find CSV column ${csvId} in file ${csvPath}`);
    }

    propHeaders = headers.map((h) => ({
      input: h,
      output: options.prefix ? `${options.prefix}${h}` : h,
      coerce: options.coerceColumns?.includes(h) ?? false,
    }));

    if (options.include) {
      propHeaders = propHeaders.filter((h) => options.include!.includes(h.input));
    }

    if (options.exclude) {
      propHeaders = propHeaders.filter((h) => !options.exclude!.includes(h.input));
    }
  }

  function handleData(data: Record<string, string>) {
    line++;

    if (filters.some((f) => !f(...headers.map((h) => data[h])))) {
      return;
    }

    let featureId = data[csvId];
    let feature = features.get(featureId.toString());
    if (!feature) {
      if (options.strict) {
        throw new Error(`Could not find feature '${featureId}' from CSV ${csvPath} line ${line}`);
      } else {
        return;
      }
    }

    if (!feature.properties) {
      feature.properties = {};
    }

    for (let { input, output, coerce } of propHeaders) {
      let value: string | number | boolean = data[input];

      if (!value.length && options.omitEmpty) {
        continue;
      } else if (coerce || options.autoCoerce) {
        value = tryCoerce(value, coerce && options.strict);
      }

      feature.properties[output] = value;
    }
  }

  let stream = createReadStream(csvPath)
    .pipe(csv())
    .on('headers', handleHeaders)
    .on('data', handleData);

  return finished(stream);
}

async function readGeoJson(file: string) {
  let data = await readFile(file);
  let json = JSON.parse(data.toString()) as GeoJSON;
  if (json.type !== 'FeatureCollection') {
    throw new Error('GeoJSON must be a FeatureCollection');
  }

  return json;
}

export async function mergeGeo(options: MergeGeoOptions) {
  const json = await readGeoJson(options.geojson);
  const features = new Map(
    json.features.map((f) => {
      const id = options.featureId ? f.properties?.[options.featureId] : f.id;
      if (!id) {
        throw new Error(`Could not find ID for feature:\n${JSON.stringify(f, null, 2)}`);
      }
      return [id.toString(), f];
    })
  );

  for (let file of options.csv) {
    await parseOneCsv(options, features, file);
  }

  return json;
}

if (esMain(import.meta)) {
  const args = await parseArgs();
  const options: MergeGeoOptions = {
    csv: args.csv as string[],
    geojson: args.json,
    filters: args.filter as string[],
    featureId: args.featureId,
    csvId: args.csvId ?? args.featureId,
    strict: args.strict,
    include: args.include as string[],
    exclude: args.exclude as string[],
    coerceColumns: args.coerceColumns as string[],
    autoCoerce: args['autocoerce'],
    omitEmpty: args.omitEmpty,
    prefix: args.prefix,
  };

  let result = await mergeGeo(options).catch((e) => {
    console.error(e);
    process.exit(1);
  });

  if (args.replace) {
    args.output = args.json;
  }

  const output = JSON.stringify(result, null, 2);
  if (args.output) {
    await writeFile(args.output, output);
  } else {
    console.log(output);
  }
}
