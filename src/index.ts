import { createReadStream } from 'fs';
import { readFile } from 'fs/promises';
import yargs from 'yargs';
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
  /** A list of columns to include from the CSV */
  include?: string[];
  /** A list of columns to exclude from the CSV */
  exclude?: string[];
}

async function parseOneCsv(
  options: MergeGeoOptions,
  features: Map<string, Feature>,
  csvPath: string
) {
  let filters: Function[] = [];
  let headers: string[] = [];
  let propHeaders: string[] = [];
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

    propHeaders = headers;
    if (options.include) {
      propHeaders = propHeaders.filter((h) => options.include!.includes(h));
    }

    if (options.exclude) {
      propHeaders = propHeaders.filter((h) => !options.exclude!.includes(h));
    }
  }

  function handleData(data: Record<string, string | number>) {
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

    for (let column of propHeaders) {
      feature.properties[column] = data[column];
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
  };

  let output = await mergeGeo(options).catch((e) => {
    console.error(e);
    process.exit(1);
  });

  console.log(JSON.stringify(output, null, 2));
}
