/* eslint-disable */

import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Schema } from '../src/mongoose.next.js';
import { Secure } from '../src/secure.js';

const DB_NAME = 'test';
const SECRET = 'globalsecret';

describe('SecureDB test', () => {
  let mongod;
  let conn;
  let secure;
  let KeyModel;

  before(async () => {
    // mongo
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: DB_NAME,
      },
    });

    conn = await createConnection(mongod.getUri()).asPromise();

    const keySchema = new Schema(
      {
        data: 'String',
        hash: 'String',
        prev: 'ObjectId',
      },
      { timestamps: true }
    );

    KeyModel = conn.model('Key', keySchema);
    secure = new Secure(SECRET);
  });

  after(async () => {
    await conn.close();
    await mongod.stop();
  });

  it('should create keys', async () => {
    const currentKey = '456';
    const previousKey = '123';

    const key1 = await KeyModel.create({
      data: null,
      hash: secure.hash(previousKey),
      prev: null,
    });

    const key2 = await KeyModel.create({
      data: secure.encrypt(previousKey, currentKey),
      hash: secure.hash(currentKey),
      prev: key1._id,
    });

    expect(key1).to.has.property('data', null);
    expect(key1).to.has.property('prev', null);
    expect(key2).to.has.property('prev', key1._id);

    expect(secure.decrypt(key2.data, currentKey)).to.be.eq(previousKey);
  });

  it('should encrypt data in table', async () => {
    const latestKey = (
      await KeyModel.find().sort({ createdAt: -1 }).limit(1).exec()
    )[0];

    const CatModel = conn.model(
      'Cat',
      new Schema(
        {
          name: 'String',
          age: 'Number',
          hobby: { cipher: 'String', key: 'ObjectId' },
        },
        { timestamps: true }
      )
    );

    const cat1 = await CatModel.create({
      name: 'yoo',
      age: 12,
      hobby: {
        cipher: secure.encrypt('Eating Fish', '456'),
        key: latestKey._id,
      },
    });

    expect(cat1.hobby).to.has.property('key', latestKey._id);
  });
});
