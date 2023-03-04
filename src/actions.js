import temp from 'temp';
import { basename, dirname } from 'path';
import { FileCursor } from '@rugo-vn/service';
import { extractSchema } from '@rugo-vn/schema';

import { Schema } from './mongoose.next.js';
import { mongodump, mongorestore /*, cleanSchema*/ } from './utils.js';

export const clearSchemas = async function () {
  for (const name in this.registers) this.client.deleteModel(name);
  this.registers = {};
};

export const setSchema = async function ({ name, schema: rawSchema }) {
  const [_, schema] = extractSchema(rawSchema);
  const nextSchema = new Schema(schema, {
    timestamps: true,
    versionKey: 'version',
  });
  // const dbSchema = RugoSchema(nextSchema.jsonSchema()).walk(cleanSchema);
  const model = this.client.model(name, nextSchema, null, {
    overwriteModels: true,
  });
  // const { collectionName } = model.collection;

  this.registers[name] = model;

  // @todo: applided jsonSchema
  // await model.init();

  // await this.db.command({
  //   collMod: collectionName,
  //   validator: {
  //     $jsonSchema: dbSchema,
  //   },
  // });

  return this.registers[name];
};

export const getSchema = async function ({ name }) {
  return this.registers[name];
};

export const get = async function ({ model, id }) {
  return await model.findById(id);
};

export const create = async function ({ model, data }) {
  return await model.create(data);
};

export const find = async function (args) {
  const { model, sort } = args;
  const filters = this.buildQuery(args);
  let { skip, limit } = args;

  // find many
  let queryBuilder = model.find(filters);

  if (sort) {
    queryBuilder = queryBuilder.sort(sort);
  }

  skip = parseInt(skip);
  if (skip) {
    queryBuilder = queryBuilder.skip(parseInt(skip));
  }

  limit = parseInt(limit);
  if (!isNaN(limit)) {
    queryBuilder = queryBuilder.limit(parseInt(limit));
  }

  return await queryBuilder.exec();
};

export const count = async function (args) {
  const { model } = args;
  const filters = this.buildQuery(args);

  return await model.countDocuments(filters);
};

export const update = async function ({
  model,
  id,
  set = {},
  unset = {},
  inc = {},
}) {
  delete set.version;

  return await model.findByIdAndUpdate(
    id,
    {
      $set: set,
      $inc: inc,
      $unset: unset,
    },
    { returnDocument: 'after', runValidators: true }
  );
};

export const remove = async function ({ model, id }) {
  return await model.findByIdAndDelete(id);
};

export const backup = async function ({ collectionName }) {
  const filePath = temp.path({ suffix: '.bson', prefix: 'rugo-' });

  await mongodump({
    uri: this.mongoUri,
    collection: collectionName,
    path: dirname(filePath),
    fileName: basename(filePath),
  });

  return FileCursor(filePath);
};

export const restore = async function ({ collectionName, from }) {
  await mongorestore({
    uri: this.mongoUri,
    collection: collectionName,
    dropBeforeRestore: true,
    dumpFile: FileCursor(from).toPath(),
  });
  return true;
};
