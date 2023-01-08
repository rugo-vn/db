import { path } from 'ramda';
import { MongoClient } from 'mongodb';
import { RugoException } from '@rugo-vn/exception';

export const name = 'db';

export * as actions from './actions.js';
export * as hooks from './hooks.js';
export * as methods from './methods.js';

export const started = async function () {
  const mongoUri = path(['settings', 'db'], this);

  if (!mongoUri) {
    throw new RugoException('Mongo settings was not defined.');
  }

  this.mongoUri = mongoUri;
  this.client = await new Promise((resolve, reject) => {
    MongoClient.connect(mongoUri, { useUnifiedTopology: true }, (err, client) => {
      if (err) {
        reject(err);
        return;
      }

      this.logger.info('Connected to mongodb server.');
      resolve(client);
    });
  });

  this.db = this.client.db();
  this.registers = {};
};

export const closed = async function () {
  await this.client.close();
};
