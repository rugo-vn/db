/* eslint-disable */

import { expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createConnection, Schema } from '../src/mongoose.next.js';

const DB_NAME = 'test';

describe('Mongoose test', () => {
  let mongod;
  let conn;

  before(async () => {
    // mongo
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: DB_NAME,
      },
    });

    conn = await createConnection(mongod.getUri()).asPromise();
  });

  after(async () => {
    await conn.close();
    await mongod.stop();
  });

  it('should run', async () => {
    // define
    const rawSchema = {
      name: 'string',
      age: 'number',
    };
    const modelName = 'z123.Person';
    const personSchema = new Schema(rawSchema, {
      timestamps: true,
    });
    const PersonModel = conn.model(modelName, personSchema);

    // create
    const personFoo = await PersonModel.create({
      name: 'Foo',
      age: '10',
    });

    expect(personFoo).to.has.property('name', 'Foo');
    expect(personFoo).to.has.property('age', 10);
    expect(personFoo).to.has.property('createdAt');
    expect(personFoo).to.has.property('updatedAt');

    expect(personFoo instanceof PersonModel).to.be.eq(true);
    expect(personFoo instanceof conn.model(modelName, personSchema)).to.be.eq(
      true
    );

    // find
    const p1 = await PersonModel.findById(personFoo._id.toString());
    expect(p1.toObject()).to.deep.eq(personFoo.toObject());

    const p2Query = PersonModel.find({ age: { $gt: '5' } });
    p2Query.limit('1');

    const { 0: p2 } = await p2Query.exec();
    expect(p2.toObject()).to.deep.eq(personFoo.toObject());

    // update schema
    const nextPersonSchema = new Schema(rawSchema, {
      timestamps: true,
    });

    expect(
      personFoo instanceof
        conn.model(modelName, nextPersonSchema, null, {
          overwriteModels: true,
        })
    ).to.be.eq(false);
  });

  it('should expect final db', async () => {
    const collections = (await conn.db.listCollections().toArray()).map(
      (c) => c.name
    );

    expect(collections).to.has.members(['z123.people']);
  });
});
