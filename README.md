# Rugo DB

_@rugo-vn/db_

## Concept

- Based MongoDB, it provides structured data model, but still flexible.
- Each collection is called `table`, entity to struct table called `schema`.
- Each document is called `row`, document's key called `field`.
- Schema of each field called `definition`.
- Table are grouped in `space`.

## Settings

```js
const settings = {
  db: /* optional, mongo db connection string */,
}
```

## Common

### Input Args

- Every action must have `spaceId` (type: `string` - space id) and `tableName` (type: `string` - table name) as default arguments. Excepts: `clearSchemas`

### Schema

Based on `@rugo-vn/schema`, but we have some additions:

- `uniques`: Array of root properties need to be unique.

## Actions

### `clearSchemas`

- Clear all schemas in `registers`.

### `getSchema`

Return:

- (type: `object`) model form of schema

### `setSchema`

Arguments:

- `schema` (type: `object`) schema object that you want to set.

Return:

- (type: `object`) model form of schema

### `find`

Arguments:

- `filters` (type: `object`) query to filter row. You can applied mongodb's query.
- `limit` (type: `number`) limit row returned.
- `sort` (type: `object`) sort by field. (Ex: `sort: { 'nameAsc': 1, 'nameDesc': -1 }`).
- `skip` (type: `number`) skip amount of row.
- `page` (type: `number`) page to get (alternative `skip`).

Return: (type: `object`)

- `data` (type: `array`) list of result rows
- `meta` (type: `object`) pagination info.
  - `meta.limit` (type: `number`) page size, limit size.
  - `meta.total` (type: `number`) total of row.
  - `meta.skip` (type: `number`) skipped rows.
  - `meta.page` (type: `number`) current page (started by `1`).
  - `meta.npage` (type: `number`) number of pages, total pages.

### `get`

Arguments:

- `id` (type: `string`) id of row that you want to get.

Return:

- (type: `object`) row object.

### `create`

Arguments:

- `data` (type: `object`) object that you want to create

Return:

- (type: `object`) created row

### `count`

Arguments:

- `filters` (type: `object`) query to filter row.

Return:

- (type: `number`) count filted result

### `update`

Arguments:

- `id` (type: `string`) id of row that you want to get.
- `set` (type: `object`) set value to some field.
- `unset` (type: `object`) unset value from some field.
- `inc` (type: `object`) increase value from some field.

Return:

- (type: `object`) updated row

### `remove`

Arguments:

- `id` (type: `string`) id of row that you want to get.

Return:

- (type: `object`) removed row

### `backup`

Return:

- (type: `FileCursor`) backup file

### `restore`

Arguments:

- `from` file to restore

Return:

- (type: `boolean`) restore success or not

## License

MIT
