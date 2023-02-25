#!/usr/bin/env node --loader ts-node/esm
import { test } from 'uvu';
import * as assert from 'uvu/assert';
import { mergeGeo } from '../src/index.js';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const csvPath = join(__dirname, 'cbsa.csv');
const jsonPath = join(__dirname, 'cbsa.json');

test('basic processing', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.equal(
    testFeature.properties.POPESTIMATE2020,
    '881628',
    'feature imported values from csv'
  );
});

test('include fields', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    include: ['STCOU', 'NPOPCHG2020', 'somethingelse'],
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.not.ok(testFeature.properties.POPESTIMATE2020, 'Unincluded values are absent');
  assert.equal(testFeature.properties.NPOPCHG2020, '1855', 'Included values are present');
});

test('exclude fields', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    exclude: ['CBSA', 'STCOU', 'NPOPCHG2020', 'somethingelse'],
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.not.ok(testFeature.properties.NPOPCHG2020, 'Excluded values are absent');
  assert.equal(testFeature.properties.POPESTIMATE2020, '881628', 'Unexcluded values are present');
});

test('prefix', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    prefix: 'CENSUS_',
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.equal(
    testFeature.properties.CENSUS_POPESTIMATE2020,
    '881628',
    'feature imported values from csv, with prefix'
  );
});

test('coerceColumns', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    filters: ['LSAD === "Metropolitan Statistical Area"'],
    coerceColumns: ['POPESTIMATE2020'],
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.type(testFeature.properties.POPESTIMATE2020, 'number', 'Values were coerced');
  assert.equal(
    testFeature.properties.POPESTIMATE2020,
    881628,
    'feature imported values from csv, with prefix'
  );
  assert.type(
    testFeature.properties.NPOPCHG2020,
    'string',
    'Columns not requested are not coerced'
  );
});

test('autoCoerce', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    filters: ['LSAD === "Metropolitan Statistical Area"'],
    autoCoerce: true,
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.type(testFeature.properties.POPESTIMATE2020, 'number', 'Values were coerced');
  assert.equal(
    testFeature.properties.POPESTIMATE2020,
    881628,
    'feature imported values from csv, with prefix'
  );
});

test('omitEmpty', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    omitEmpty: true,
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.type(testFeature.properties.MDIV, 'undefined', 'Empty values omitted');
});

test('filters', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    filters: ['LSAD === "Metropolitan Statistical Area"'],
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.equal(
    testFeature.properties.LSAD,
    'Metropolitan Statistical Area',
    'Only included the filtered row'
  );
  assert.not.ok(testFeature.properties.STCOU, 'Only included the filtered row');
  assert.equal(testFeature.properties.POPESTIMATE2020, '881628', 'Values were copied properly');
});

test('excluded rows still show up for filters', async () => {
  let result = await mergeGeo({
    csv: [csvPath],
    geojson: jsonPath,
    featureId: 'CBSAFP',
    csvId: 'CBSA',
    exclude: ['STCOU'],
    filters: ['!STCOU'],
  });

  let testFeature = result.features.find((f) => f.properties.CBSAFP === '28940');
  assert.ok(testFeature, 'feature should still be present in output');
  assert.not.ok(testFeature.properties.STCOU, 'Only included the filtered row');
  assert.equal(testFeature.properties.POPESTIMATE2020, '881628', 'Values were copied properly');
});

test.run();
