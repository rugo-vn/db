/* eslint-disable */

import { createBroker, FileCursor } from '@rugo-vn/service';
import { assert, expect } from 'chai';
import { MongoMemoryServer } from 'mongodb-memory-server';

const DB_NAME = 'test';
const SPACE_ID = 'test';
const TABLE_NAME = 'demo';
const SCHEMA = {
  uniques: ['name'],
  properties: {
    name: { type: 'string' },
    title: 'string',
    slug: {
      type: 'string',
    },
    age: { type: 'number', minimum: 0 },
    parent: {
      properties: {
        foo: { type: 'string' },
        bar: 'string',
        count: {
          type: 'number',
          default: 0,
          maximum: 100,
        },
        complex: {
          items: {
            properties: {
              more: 'string'
            },
            required: ['more']
          }
        }
      },
      required: ['foo']
    },
    schemas: {
      type: 'array',
      items: 'json'
    }
  },
  required: ['name'],
};


describe('db test', () => {
  let mongod, broker, rowId, backupFile;

  before(async () => {
    // mongo
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: DB_NAME,
      },
    });

    // create broker
    broker = createBroker({
      _services: [
        './src/index.js',
      ],
      db: `${mongod.getUri()}${DB_NAME}`,
    });

    await broker.loadServices();
    await broker.start();
  });

  after(async () => {
    await broker.close();
    await mongod.stop();
  });

  it('should set and get schema', async () => {
    const res = await broker.call('db.setSchema', { spaceId: SPACE_ID, tableName: TABLE_NAME, schema: SCHEMA });
    expect(res.properties.title).to.has.property('type', 'string');

    const res2 = await broker.call('db.setSchema', { spaceId: SPACE_ID, tableName: TABLE_NAME, schema: SCHEMA });
    expect(res2.properties.title).to.has.property('type', 'string');
  });

  it('should create a row', async () => {
    // single
    const row = await broker.call(`db.create`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      data: {
        name: 'foo',
        title: 'Some Foo Đờ 123 # Go go',
        age: 3,
        parent: { foo: 'a', bar: 'b' }
      }
    });

    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('title', 'Some Foo Đờ 123 # Go go');
    // expect(row).to.has.property('slug', 'some-foo-do-123-go-go');
    expect(row).to.has.property('age', 3);
    expect(row).to.has.property('createdAt');
    expect(row).to.has.property('updatedAt');
    expect(row).to.has.property('version', 1);

    // many
    for (let i = 0; i < 3; i++) {
      await broker.call(`db.create`, {
        spaceId: SPACE_ID, tableName: TABLE_NAME,
        data: {
          name: 'many_' + i,
          age: 999,
        }
      });
    }
  });

  it('should find a row', async () => {
    const row = (await broker.call(`db.find`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      filters: { name: 'foo' },
      sort: { createdAt: -1 },
    })).data[0];

    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('age', 3);

    rowId = row.id;

    const data = await broker.call(`db.find`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      filters: { age: '999' },
      skip: 1,
      limit: 1,
    });

    expect(data.data).to.has.property('length', 1);
    expect(data.meta).to.has.property('total', 3);
    expect(data.meta).to.has.property('skip', 1);
    expect(data.meta).to.has.property('limit', 1);
    expect(data.meta).to.has.property('page', 2);
    expect(data.meta).to.has.property('npage', 3);
  });

  it('should count row', async () => {
    const no = await broker.call(`db.count`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      filters: { name: 'foo' },
    });

    expect(no).to.be.eq(1);
  });

  it('should get row', async () => {
    const row = await broker.call(`db.get`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      id: rowId,
    });

    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('title', 'Some Foo Đờ 123 # Go go');
    // expect(row).to.has.property('slug', 'some-foo-do-123-go-go');
    expect(row).to.has.property('age', 3);
    expect(row).to.has.property('createdAt');
    expect(row).to.has.property('updatedAt');
    expect(row).to.has.property('version', 1);
  });

  it('should update row', async () => {
    const row = await broker.call(`db.update`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      id: rowId,
      set: {
        age: 4,
        'parent.foo': 'abc',
        schemas: [
          { some: 'property', has: 'value' }
        ]
      },
      inc: { 'parent.count': 1 },
      unset: { title: true },
    });

    expect(row).not.to.has.property('_id');
    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('age', 4);
    expect(row).to.not.has.property('title');
    expect(row.parent).to.has.property('foo', 'abc');
    expect(row.parent).to.has.property('bar', 'b');
    expect(row.parent).to.has.property('count', 1);
    expect(row.createdAt).to.not.be.eq(row.updatedAt);
    expect(row).to.has.property('version', 2);
  });

  it('should backup', async () => {
    const file = await broker.call(`db.backup`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
    });

    backupFile = file;
    expect(file instanceof FileCursor).to.be.eq(true);
  });

  it('should remove row', async () => {
    const row = await broker.call(`db.remove`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      id: rowId,
    });

    expect(row).not.to.has.property('_id');
    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('age', 4);
    expect(row).to.not.has.property('title');
    expect(row.parent).to.has.property('foo', 'abc');
    expect(row.parent).to.has.property('bar', 'b');
    expect(row.parent).to.has.property('count', 1);
    expect(row.createdAt).to.not.be.eq(row.updatedAt);
    expect(row).to.has.property('version', 2);

    const row2 = await broker.call(`db.get`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      id: rowId,
    });

    expect(row2).to.be.eq(null);
  });

  it('should restore', async () => {
    const res = await broker.call(`db.restore`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      from: backupFile,
    });

    expect(res).to.be.eq(true);

    const row = await broker.call(`db.get`, {
      spaceId: SPACE_ID, tableName: TABLE_NAME,
      id: rowId,
    });

    expect(row).not.to.has.property('_id');
    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('age', 4);
  });
});