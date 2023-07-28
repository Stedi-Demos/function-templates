# Stedi Function Templates

This repository holds the source code for functions that can be deployed as templates using the Stedi CLI.

## List of function templates

To see the list of the available function templates, take a look at the [src/functions directory](https://github.com/Stedi-Demos/function-templates/tree/main/src/functions).

## Deploying function templates

### Prerequisites

1. Install [Node.js](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) _(minimum version: 18)_

2. Install the latest version of the [Stedi CLI](https://www.npmjs.com/package/@stedi/cli):

    ```bash
    npm install --global @stedi/cli@latest
    ```

   If you've installed the CLI previously, be sure to update it to the latest version. The easiest way to do this is by running the same installation command again.

### Function template installation and deployment

1. Use the `stedi integrations init` CLI command to create and initialize a new Stedi Integrations SDK project (choose a path that does not exist yet -- it will be created):

    ```bash
    stedi integrations init --path=<PATH_TO_PROJECT_DIRECTORY>
    ```

2. Change directories to newly created SDK project directory:

    ```bash
    cd <PATH_TO_PROJECT_DIRECTORY>
    ```

3. Install SDK project dependencies:

    ```bash
    npm install
    ```

4. Use the `install-template` script to install each function template(s) that you would like to install:

    ```bash
    npm run install-template event-to-webhook
    ```

   Note: the available function templates can be found in the [src/functions directory](https://github.com/Stedi-Demos/function-templates/tree/main/src/functions).

5. Edit the `.env` file to add your [Stedi API key](https://www.stedi.com/docs/accounts-and-billing/authentication#creating-an-api-key):

    ```bash
    STEDI_API_KEY=<YOUR_STEDI_API_KEY>

6. For each function template that you installed, complete any post-install instructions as documented in the `README.md` in the function's source directory. For example, the post-install instructions for the `event-to-webhook` function template can be found here: [src/functions/event-to-webhook/README.md#post-install-instructions](/src/functions/event-to-webhook/README.md#post-install-instructions)

7. After completing all necessary post-install instructions, deploy the function(s) to your Stedi account:

    ```bash
    npm run deploy
    ```

8. For each function template that you installed, complete any post-deployment instructions as documented in the `README.md` in the function's source directory. For example, the post-deployment instructions for the `event-to-webhook` function template can be found here: [src/functions/event-to-webhook/README.md#post-install-instructions](/src/functions/event-to-webhook/README.md#post-deployment-instructions)
