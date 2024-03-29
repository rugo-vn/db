import { defineAction } from '@rugo-vn/service';
import { MongoServerError } from 'mongodb';
import { ValidationError } from './exceptions.js';
import { buildQuery, pagination, prepare, resp } from './method.js';
import { createConnection } from './mongoose.next.js';

let mongoUri, client;

// @todo: invalid id check
defineAction('start', async function (settings) {
  mongoUri = settings.uri;

  if (!mongoUri) {
    throw new Error('Mongo settings was not defined.');
  }

  client = await createConnection(mongoUri).asPromise();
  client.getClient().db();
});

defineAction('stop', async function () {
  await client.close();
});

defineAction('except', async function (ecpt) {
  if (!ecpt instanceof Error) throw ecpt;

  switch (ecpt.name) {
    case 'MongoServerError':
    case 'ValidationError':
      throw new ValidationError(ecpt);
  }

  throw ecpt;
});

// actions
defineAction('create', async function ({ data }, opts) {
  const { model } = prepare(client, opts);
  return resp(await model.create(data));
});

defineAction('find', async function (args, opts) {
  const { model } = prepare(client, opts);
  let { filters, sort, skip, limit, page } = buildQuery(args);
  let queryBuilder = filters._id ? model.findOne(filters) : model.find(filters);

  // filter
  if (Object.keys(sort).length > 0) {
    queryBuilder = queryBuilder.sort(sort);
  }

  if (skip) {
    queryBuilder = queryBuilder.skip(skip);
  }

  if (limit !== -1) {
    queryBuilder = queryBuilder.limit(limit);
  }

  // request data
  const data = await queryBuilder.exec();
  const nextData = Array.isArray(data) ? data : [data];

  // response
  const total = await model.countDocuments(filters);
  const meta = pagination({ skip, limit, total, page });

  return {
    data: nextData.filter((i) => i).map(resp),
    meta,
  };
});

defineAction('replace', async function (args, opts) {
  const { model } = prepare(client, opts);
  const { filters } = buildQuery(args);
  const { data } = args;

  data.version = 0;

  return resp(
    await model.findOneAndReplace(filters, data, {
      returnDocument: 'after',
      runValidators: true,
    })
  );
});

defineAction('update', async function (args, opts) {
  const { model } = prepare(client, opts);
  const { filters } = buildQuery(args);
  const { data } = args;

  const set = data?.set || {};
  const inc = data?.inc || {};
  const unset = data?.unset || {};

  set.updatedAt = new Date().toISOString();
  inc.version = 1;

  delete set.version;

  return resp(
    await model.findOneAndUpdate(
      filters,
      {
        $set: set,
        $inc: inc,
        $unset: unset,
      },
      { returnDocument: 'after', runValidators: true }
    )
  );
});

defineAction('remove', async function (args, opts) {
  const { model } = prepare(client, opts);
  const { filters } = buildQuery(args);
  return resp(await model.findOneAndRemove(filters));
});

defineAction('import', async function ({ data }, opts) {
  const { model } = prepare(client, opts);

  data = data.map((item) => ({
    ...item,
    _id: item._id || item.id,
  }));

  let res;
  try {
    res = await model.insertMany(data, {
      rawResult: true,
      ordered: false,
    });
  } catch (err) {
    res = err.result;
  }

  return {
    inserted: res.insertedCount,
    total: data.length,
  };
});
