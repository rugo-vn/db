import { path } from 'ramda';
import { MongoClient } from 'mongodb';
import { RugoException } from '@rugo-vn/exception';

import { createConnection } from './mongoose.next.js';

export const name = 'db';

export * as actions from './actions.js';
export * as hooks from './hooks.js';
export * as methods from './methods.js';

export const started = async function () {
  const mongoUri = path(['settings', 'db', 'uri'], this);

  if (!mongoUri) {
    throw new RugoException('Mongo settings was not defined.');
  }

  this.mongoUri = mongoUri;
  this.client = await createConnection(mongoUri).asPromise();
  this.db = this.client.getClient().db();
  this.registers = {};
};

export const closed = async function () {
  await this.client.close();
};
