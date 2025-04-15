<div align='center'>
  <img alt="Zoltra" src='https://github.com/zoltrajs/zoltra/blob/main/meta/zoltrajs-logo.png' width="80" height="80" />
  <h1>Zoltra</h1>
  <h3>Code Less. Ship Faster.</h3>
  <p>A <strong>lightweight</strong>, plugin-first Node.js framework for web server</p>
  
  [![npm](https://img.shields.io/npm/v/zoltra?color=2962FF)](https://www.npmjs.com/package/zoltra)
  [![License](https://img.shields.io/badge/license-MIT-6200EA)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-007ACC)](https://www.typescriptlang.org/)

[Documentation]()

<!-- [BenchMark]() -->

</div>

---

## Getting Started:

1. Create a new project using Zoltra CLI:

   ```bash
   npx zoltra@beta create myapp --language
   ```

   Replace `--language` with either `--typescript` or `--javascript` depending on your preference.

   - If no language is specified, the default is TypeScript.

   Use `--no-git` to skip git initialization

   This command creates a new Zoltra project named `myapp` and sets it up according to the language option you choose.

2. Start the application in development mode:

   After creating your project, navigate to the newly created folder and run:

   ```
   npm run dev
   ```

   This will start the Zoltra server, and you can begin building your application.

3. You’re ready to start building your Zoltra-powered application!

## Quick Guide

### File-Based Routing

Zoltra uses **File-Based Routing**, which means you define routes simply by creating files in the `routes` directory. This eliminates the need for manual route registration and simplifies routing configuration.

**Example**

```ts
// routes/user.js
import { defineRoutes } from "zoltra";
import { getUserById, getUsers } from "../controllers/users.controller";

const userRoutes = defineRoutes([
  {
    method: "GET",
    path: "/api/users",
    handler: getUsers,
    middleware: [],
  },
  {
    method: "GET",
    path: "/api/users/:id",
    handler: getUserById,
  },
]);

export const routes = userRoutes;
```

Zoltra handles your server's route management automatically, allowing you to focus on building the logic without needing to manually configure routes in your server code.

<!-- For more detailed instructions, visit our documentation. -->

## Alpha Phase Notice:

Zoltra is currently in its **Alpha Phase** (Stage 1), which means a lot is still in progress. Expect frequent updates and improvements. We appreciate your feedback as the Zoltra team continues to evolve the framework!
