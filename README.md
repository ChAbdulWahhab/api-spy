<div align="center">
  <img src="assets/Spying-on-your-Express-APIs-cleanly.png" alt="api-spy" />

# @chabdulwahab/api-spy

A zero-dependency, lightweight Express.js middleware that intercepts stdout/stderr streams to render a sticky real-time performance and metrics dashboard at the bottom of the terminal.

[![npm version](https://img.shields.io/npm/v/@chabdulwahab/api-spy?color=cb3837&logo=npm)](https://www.npmjs.com/package/@chabdulwahab/api-spy)
[![downloads](https://img.shields.io/npm/dm/@chabdulwahab/api-spy?color=blue)](https://www.npmjs.com/package/@chabdulwahab/api-spy)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@chabdulwahab/api-spy?color=green&label=bundle%20size)](https://bundlephobia.com/package/@chabdulwahab/api-spy)
[![license](https://img.shields.io/npm/l/@chabdulwahab/api-spy?color=brightgreen)](https://github.com/chabdulwahab/api-spy/blob/main/LICENSE)

</div>

## Features

- Zero external dependencies.
- Dual-module distribution (CommonJS and ESM).
- Under 5KB footprint after compilation and minification.
- Clean stdout/stderr interception keeping application log scrollback legible.
- Live concurrent request counting, cumulative traffic stats, and RAM consumption telemetry.
- Micro-cache identifying the 5 slowest endpoint routes.

## Installation

```bash
npm install @chabdulwahab/api-spy
```

## Usage

### Registering Middleware

```javascript
const express = require('express');
const { apiSpy } = require('@chabdulwahab/api-spy');

const app = express();

app.use(apiSpy());

app.get('/api/users', (req, res) => {
  res.json({ ok: true });
});

app.listen(3000);
```

### Configuration Options

The middleware accepts a configuration object to customize behavior:

```javascript
app.use(apiSpy({
  enabled: true // Force dashboard execution (default: process.stdout.isTTY check)
}));
```

### Programmatic Metrics Access

You can read telemetry data programmatically for external logging or APM sync:

```javascript
const { apiSpyMetrics } = require('@chabdulwahab/api-spy');

// Structure of apiSpyMetrics:
// {
//   a: 0,                   // Active requests
//   t: 0,                   // Total requests
//   c: [0, 0, 0, 0, 0, 0],  // HTTP status class counts (index maps to status/100)
//   s: [                    // Cache of top 5 slowest routes
//        { m: 'GET', p: '/api/users', l: 12.5, h: 4 }
//      ]
// }
```

## License

MIT
