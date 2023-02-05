import { NotFoundError, RugoException } from '@rugo-vn/exception';
import { ObjectId } from 'mongodb';
import { Schema } from '@rugo-vn/schema';
import { clone } from 'ramda';

export const prepareCollection = async function (args) {
  const { name } = args;

  if (!name) {
    throw new RugoException('spaceId and tableName is required');
  }

  // create collection
  const collection = (await this.db.listCollections().toArray()).map(i => i.name).indexOf(name) === -1
    ? await this.db.createCollection(name)
    : this.db.collection(name);

  args.collection = collection;
};

export const isSchema = async function ({ name, spaceId, tableName }) {
  if (!this.registers[name]) { throw new NotFoundError(`Table "${tableName}" is not found in "${spaceId}"`); }
};

export const buildQuery = function ({ filters = {}, name /*, search, searches, uniques */ }) {
  if (filters._id) { filters._id = ObjectId(filters._id); }
  if (filters.id) { filters._id = ObjectId(filters.id); }

  delete filters.id;

  const schema = clone(this.registers[name]);
  delete schema.required;

  const nextSchema = new Schema(schema);
  // if (search) {
  //   filters = {
  //     $and: [
  //       filters,
  //       {
  //         $or: union(searches, uniques)
  //           .map(v => ({ [v]: { $regex: new RegExp(search, 'i') } }))
  //       }
  //     ]
  //   };
  // }
  return nextSchema.validate(filters);
};
