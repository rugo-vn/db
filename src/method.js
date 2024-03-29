import { Schema } from '@rugo-vn/schema';
import { ObjectId } from 'mongodb';
import { clone, equals } from 'ramda';
import { DEFAULT_LIMIT, INVALID_PROPS } from './constants.js';

const cache = {};

export function prepare(client, opts) {
  const schema = opts.schema;
  if (!schema || !schema.name) throw new Error(`Invalid schema`);

  const hit = cache[schema.name];

  if (hit && equals(schema, hit.schema)) return hit;

  delete cache[schema.name];

  const nextSchema = new Schema(schema).toMongoose();

  for (const key in nextSchema.properties) {
    if (INVALID_PROPS.indexOf(key) !== -1)
      throw new Error(`Schema must not have top property ${key}`);
  }

  const model = client.model(schema.name, nextSchema, schema.name, {
    overwriteModels: true,
  });

  cache[schema.name] = { schema, model };
  return cache[schema.name];
}

export function resp(data) {
  if (data.constructor.name === 'model') {
    data = data.toObject();
  }

  data.id = data._id;
  delete data._id;

  return data;
}

export function buildQuery({ id, cond }) {
  id ||= cond?.id || cond?._id;

  // filters maker
  const filters = clone(cond || {});
  for (const key of INVALID_PROPS) delete filters[key];
  if (id) filters._id = ObjectId(id);

  // sorts
  const sort = cond?.sort || {};
  for (const name in sort) sort[name] = parseInt(sort[name]);

  // pagination
  let limit = parseInt(cond?.limit);
  if (isNaN(limit)) {
    limit = DEFAULT_LIMIT;
  }

  // pagination: start from 1
  let page = parseInt(cond?.page);
  let skip = parseInt(cond?.skip);
  if (limit === -1) {
    page = 1;
  } else if (limit === 0) {
    page = 0; // no pagination
  } else {
    const skipPage = Math.floor((skip || 0) / limit) + 1;
    if (!isNaN(page) && skipPage !== page) {
      // page priority
      skip = (page - 1) * limit;
    } else {
      page = skipPage;
    }
  }

  // default skip
  skip ||= 0;

  return {
    filters,
    sort,
    skip,
    limit,
  };
}

export function pagination({ skip, limit, total, page }) {
  // over skip
  if (skip > total) {
    skip = total;
  }

  // total page
  let npage;
  if (limit === -1) {
    npage = 1;
  } else if (limit === 0) {
    npage = 0;
  } else {
    npage = Math.floor(total / limit) + (total % limit === 0 ? 0 : 1);
  }

  if (limit === -1) {
    page = 1;
  } else if (limit === 0) {
    page = 0; // no pagination
  } else {
    const skipPage = Math.floor((skip || 0) / limit) + 1;
    if (!isNaN(page) && skipPage !== page) {
      // page priority
      skip = (page - 1) * limit;
    } else {
      page = skipPage;
    }
  }

  // over skip > page
  if (skip === total) {
    page = npage;
  }

  return { skip, limit, total, page, npage };
}
