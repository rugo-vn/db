import temp from 'temp';
import { writeFileSync } from 'fs';
import { ObjectId } from 'mongodb';
import { Schema } from "@rugo-vn/schema";
import { buildQuery, mongodump, mongorestore, removeDefault } from "./utils.js";
import { FileCursor } from '@rugo-vn/service';
import { basename, dirname } from 'path';
import { NotFoundError } from '@rugo-vn/exception';

export const clearSchemas = async function() {
  this.registers = {};
}

export const setSchema = async function({ name, schema, collection }) {
  const nextSchema = new Schema(schema);
  const dbSchema = Schema.walk(nextSchema.toFinal(), removeDefault);

  this.registers[name] = nextSchema.toModel();

  // validator
  await this.db.command({
    collMod: name,
    validator: {
      $jsonSchema: dbSchema,
    }
  });

  // indexes
  const uniques = schema.uniques || [];

  const newIndexes = {};
  for (const property of uniques) {
    newIndexes[property] = {
      ...(newIndexes[property] || { dir: 1 }),
      unique: true
    };
  }

  // drop old indexes
  await collection.dropIndexes();

  // create new indexes
  for (const indexName in newIndexes) {
    const index = newIndexes[indexName];

    await collection.createIndex({ [indexName]: index.dir }, { name: indexName, unique: index.unique });
  }

  return this.registers[name];
}

export const getSchema = async function({ name }) {
  return this.registers[name];
}

export const get = async function({ collection, id }) {
  return await collection.findOne({ _id: ObjectId(id) });
}

export const create = async function ({ collection, data }) {
  const res = await collection.insertOne(data);

  return await get.bind(this)({ collection, id: res.insertedId });
};

export const find = async function (args) { 
  const { collection, sort } = args;
  const filters = buildQuery(args);
  let { skip, limit } = args;

  // find many
  let queryBuilder = collection.find(filters);

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

  return await queryBuilder.toArray();
};

export const count = async function (args) {
  const { collection } = args;
  const filters = buildQuery(args);

  return await collection.countDocuments(filters);
};

export const update = async function ({ collection, id, set = {}, unset = {}, inc = {} }) {
  delete set.version;

  const res = await collection.updateOne({
    _id: ObjectId(id)
  }, {
    $set: set,
    $unset: unset,
    $inc: inc
  });

  if (!res.matchedCount)
    return null;

  return await get.bind(this)({ collection, id });
};

export const remove = async function ({ collection, id }) {
  const row = await get.bind(this)({ collection, id });

  const res = await collection.deleteOne({
    _id: ObjectId(id),
  });

  if (!res.deletedCount)
    return null;

  return row;
};

export const backup = async function({ name }) {
  const filePath = temp.path({ suffix: '.bson', prefix: 'rugo-' });

  await mongodump({
    uri: this.mongoUri,
    collection: name,
    path: dirname(filePath),
    fileName: basename(filePath)
  });

  return FileCursor(filePath);
}

export const restore = async function({ name, from }) {
  await mongorestore({
    uri: this.mongoUri,
    collection: name,
    dropBeforeRestore: true,
    dumpFile: FileCursor(from).toPath(),
  });
  return true;
}