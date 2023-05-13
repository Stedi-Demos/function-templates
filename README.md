# Stedi Function Templates

This repository holds the source code for functions that can be deployed using the Stedi Functions UI as templates.

## Getting deployable code for use as samples.

The repo contains Typescript functions, so they must be compiled before using as templates.

```bash
npx tsc
```

You can list the available templates wit:

```bash
ls ./dist/functions/**/handler.js
```

Be sure to remove the last line for the source map (helps with debugging / tests)
