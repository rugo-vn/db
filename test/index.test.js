import { spawnService } from '@rugo-vn/service';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { assert, expect } from 'chai';

const DB_NAME = 'test';
const TABLE_NAME = 'demo';
const SCHEMA = {
  name: TABLE_NAME,
  properties: {
    name: { type: 'string', required: true, unique: true },
    title: { type: 'string' },
    slug: {
      type: 'string',
    },
    age: { type: 'number', min: 0 },
    dob: { type: 'date' },
    parent: {
      properties: {
        foo: { type: 'string' },
        bar: { type: 'string' },
        count: {
          type: 'number',
          default: 0,
          max: 100,
        },
        complex: {
          type: 'array',
          items: {
            properties: {
              more: { type: 'string', required: true },
            },
          },
        },
      },
    },
    schemas: {
      type: 'array',
      items: {
        type: 'object',
      },
    },
  },
};

describe('DB test', function () {
  this.timeout(10000);
  let service, mongod, rowId;

  it('should spawn service', async () => {
    // mongo
    mongod = await MongoMemoryServer.create({
      instance: {
        dbName: DB_NAME,
      },
    });

    // service
    service = await spawnService({
      name: 'db',
      exec: ['node', './src/index.js'],
      cwd: './',
      settings: {
        uri: `${mongod.getUri()}${DB_NAME}`,
      },
    });

    await service.start();
  });

  it('should create a row', async () => {
    // single
    const row = await service.call(
      `create`,
      {
        data: {
          name: 'foo',
          title: 'Some Foo Đờ 123 # Go go',
          age: 3,
          dob: '2022/02/12',
          parent: { foo: 'a', bar: 'b' },
        },
      },
      {
        schema: SCHEMA,
      }
    );

    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('title', 'Some Foo Đờ 123 # Go go');
    expect(row).to.has.property('age', 3);
    expect(row).to.has.property('createdAt');
    expect(row).to.has.property('updatedAt');
    expect(row).to.has.property('version', 0);

    // many
    for (let i = 0; i < 3; i++) {
      await service.call(
        `create`,
        {
          data: {
            name: 'many_' + i,
            age: 999,
          },
        },
        {
          schema: SCHEMA,
        }
      );
    }
  });

  it('should find a row', async () => {
    const row = (
      await service.call(
        `find`,
        {
          cond: {
            name: 'foo',
            sort: { createdAt: '-1' },
          },
        },
        {
          schema: SCHEMA,
        }
      )
    ).data[0];

    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('age', 3);

    rowId = row.id;

    const data = await service.call(
      `find`,
      {
        cond: { age: '999', skip: 1, limit: 1 },
      },
      {
        schema: SCHEMA,
      }
    );

    expect(data.data).to.has.property('length', 1);
    expect(data.meta).to.has.property('total', 3);
    expect(data.meta).to.has.property('skip', 1);
    expect(data.meta).to.has.property('limit', 1);
    expect(data.meta).to.has.property('page', 2);
    expect(data.meta).to.has.property('npage', 3);
  });

  it('should find a row with special filters conditions', async () => {
    const data = await service.call(
      `find`,
      {
        cond: { age: { $lt: '100' } },
      },
      {
        schema: SCHEMA,
      }
    );

    expect(data.data).to.has.property('length', 1);
    expect(data.meta).to.has.property('total', 1);
    expect(data.meta).to.has.property('skip', 0);
    expect(data.meta).to.has.property('limit', 10);
    expect(data.meta).to.has.property('page', 1);
    expect(data.meta).to.has.property('npage', 1);
  });

  it('should get row', async () => {
    const res = await service.call(
      `find`,
      {
        id: rowId,
      },
      {
        schema: SCHEMA,
      }
    );
    const row = res.data[0];

    expect(res.meta).to.has.property('total', 1);
    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo');
    expect(row).to.has.property('title', 'Some Foo Đờ 123 # Go go');
    expect(row).to.has.property('age', 3);
    expect(row).to.has.property('createdAt');
    expect(row).to.has.property('updatedAt');
    expect(row).to.has.property('version', 0);
  });

  it('should replace a row', async () => {
    const row = await service.call(
      `replace`,
      {
        id: rowId,
        data: {
          name: 'foo 2',
          title: 'the title',
          age: 5,
          dob: '2023/02/12',
          parent: { foo: 'c', bar: 'd' },
        },
      },
      {
        schema: SCHEMA,
      }
    );

    expect(row.id).to.be.eq(rowId);
    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo 2');
    expect(row).to.has.property('title', 'the title');
    expect(row).to.has.property('age', 5);
    expect(row).to.has.property('createdAt');
    expect(row).to.has.property('updatedAt');
    expect(row).to.has.property('version', 0);
  });

  it('should update row', async () => {
    const row = await service.call(
      `update`,
      {
        id: rowId,
        data: {
          set: {
            age: 4,
            'parent.foo': 'abc',
            schemas: [{ some: 'property', has: 'value' }],
          },
          inc: { 'parent.count': 1 },
          unset: { title: true },
        },
      },
      {
        schema: SCHEMA,
      }
    );

    expect(row).not.to.has.property('_id');
    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo 2');
    expect(row).to.has.property('age', 4);
    expect(row).to.not.has.property('title');
    expect(row.parent).to.has.property('foo', 'abc');
    expect(row.parent).to.has.property('bar', 'd');
    expect(row.parent).to.has.property('count', 1);
    expect(row.createdAt).to.not.be.eq(row.updatedAt);
    expect(row).to.has.property('version', 1);
  });

  it('should remove row', async () => {
    const row = await service.call(
      `remove`,
      {
        id: rowId,
      },
      {
        schema: SCHEMA,
      }
    );

    expect(row).not.to.has.property('_id');
    expect(row).to.has.property('id');
    expect(row).to.has.property('name', 'foo 2');
    expect(row).to.has.property('age', 4);
    expect(row).to.not.has.property('title');
    expect(row.parent).to.has.property('foo', 'abc');
    expect(row.parent).to.has.property('bar', 'd');
    expect(row.parent).to.has.property('count', 1);
    expect(row.createdAt).to.not.be.eq(row.updatedAt);
    expect(row).to.has.property('version', 1);

    const res = await service.call(
      `find`,
      {
        id: rowId,
      },
      {
        schema: SCHEMA,
      }
    );

    expect(res.data).to.has.property('length', 0);
  });

  it('should import data', async () => {
    const data = [
      {
        id: '64844ce2750db3eb6252a905',
        name: 'imported row',
        version: 10,
        createdAt: '2022-06-10T10:18:55.311Z',
        updatedAt: '2022-06-10T10:18:55.311Z',
      },
      {
        _id: '6484506a533079ff13383c9a',
        name: 'imported row 2',
        version: 10,
        createdAt: '2022-06-01T10:18:55.311Z',
        updatedAt: '2022-06-01T10:18:55.311Z',
      },
    ];

    expect(
      (await service.call(`find`, {}, { schema: SCHEMA })).meta.total
    ).to.be.eq(3);

    // full import
    const res = await service.call(
      `import`,
      { data: [data[0]] },
      { schema: SCHEMA }
    );
    expect(
      (await service.call(`find`, {}, { schema: SCHEMA })).meta.total
    ).to.be.eq(4);
    expect(res).to.has.property('inserted', 1);

    // partial import
    const res2 = await service.call(
      `import`,
      { data: [data[0], data[1]] },
      { schema: SCHEMA }
    );
    expect(
      (await service.call(`find`, {}, { schema: SCHEMA })).meta.total
    ).to.be.eq(5);
    expect(res2).to.has.property('inserted', 1);
  });

  it('should throw error when required', async () => {
    try {
      await service.call(`create`, { data: {} }, { schema: SCHEMA });
      assert.fail('should error');
    } catch (err) {
      expect(err).to.has.property('name', 'ValidationError');
      expect(err).to.has.property('message', 'Path `name` is required.');
      expect(err).to.has.property('data');
      expect(err.data).to.has.property('code', 20000);
    }

    try {
      await service.call(
        `create`,
        {
          data: {
            parent: { complex: [{}] },
          },
        },
        { schema: SCHEMA }
      );
      assert.fail('should error');
    } catch (err) {
      expect(err).to.has.property('name', 'ValidationError');
      expect(err).to.has.property(
        'message',
        'Path `name` is required. Path `more` is required.'
      );
      expect(err).to.has.property('data');
      expect(err.data).to.has.property('code', 20000);
    }
  });

  it('should throw error when duplicate key', async () => {
    await service.call(
      `create`,
      { data: { name: 'foo 1' } },
      { schema: SCHEMA }
    );

    try {
      await service.call(
        `create`,
        { data: { name: 'foo 1' } },
        { schema: SCHEMA }
      );
      assert.fail('should error');
    } catch (err) {
      expect(err).to.has.property('name', 'ValidationError');
      expect(err).to.has.property(
        'message',
        'Duplicate value ("foo 1") on path `name`'
      );
      expect(err).to.has.property('data');
      expect(err.data).to.has.property('code', 11000);
    }
  });

  it('should throw error when out of range', async () => {
    try {
      await service.call(
        `create`,
        { data: { name: 'foo 2', age: -100 } },
        { schema: SCHEMA }
      );
      assert.fail('should error');
    } catch (err) {
      expect(err).to.has.property('name', 'ValidationError');
      expect(err).to.has.property(
        'message',
        'Path `age` (-100) is less than minimum allowed value (0).'
      );
      expect(err).to.has.property('data');
      expect(err.data).to.has.property('code', 20000);
    }
  });

  it('should stop service', async () => {
    await service.stop();
    await mongod.stop();
  });
});
