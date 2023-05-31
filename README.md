# Stedi Function Templates

This repository holds the source code for functions that can be deployed using the Stedi Functions UI as templates.

## Getting deployable code for use as samples.

The repo contains Typescript functions, so they must be compiled before using as templates.

```bash
npx tsc
```

You can list the available templates with:

```bash
ls ./dist/functions/**/handler.js
```

## Deploying a function template

Ready to deploy one of the templates? Check out the step-by-step [tutorial](./tutorial.md)!
