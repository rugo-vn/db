# Rugo DB

_@rugo-vn/db_

## Naming Convention

- DO NOT naming property likes: `_id`, `id`, `sort`, `skip`, `limit`, `page`.
- Based MongoDB, it provides structured data model, but still flexible.
- Each collection is called `table`, entity to struct table called `schema`.
- Each document is called `row`, document's key called `field`.
- Schema of each field called `definition`.

## Settings

```js
const settings = {
  uri: /* optional, mongo db connection string */,
}
```

## Actions

### `find`

Return: (type: `object`)

- `data` (type: `array`) list of result rows
- `meta` (type: `object`) pagination info.
  - `meta.limit` (type: `number`) page size, limit size.
  - `meta.total` (type: `number`) total of row.
  - `meta.skip` (type: `number`) skipped rows.
  - `meta.page` (type: `number`) current page (started by `1`).
  - `meta.npage` (type: `number`) number of pages, total pages.

### `create`

Return:

- (type: `object`) created row

### `update`

Return:

- (type: `object`) updated row

### `remove`

Return:

- (type: `object`) removed row

## License

MIT
