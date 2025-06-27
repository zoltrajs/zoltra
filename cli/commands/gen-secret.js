#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from "fs";
import path from "path";
import crypto from "crypto";

const generateAuthSecret = () => {
  const newSecret = crypto.randomUUID();
  const envPath = path.join(process.cwd(), ".env");

  try {
    let tag;
    if (!existsSync(envPath)) {
      tag = "ADDED";
      writeFileSync(envPath, "", "utf-8");
      console.log("✅ .env file created");
    }

    let envContents = readFileSync(envPath, "utf-8");

    if (/^JWT_AUTH_SECRET=.*/m.test(envContents)) {
      tag = "UPDATED";
      envContents = envContents.replace(
        /^JWT_AUTH_SECRET=.*/m,
        `JWT_AUTH_SECRET="${newSecret}"`
      );
    } else {
      envContents += `\nJWT_AUTH_SECRET="${newSecret}"`;
    }

    writeFileSync(envPath, envContents, "utf-8");

    console.log(
      `✅ JWT_AUTH_SECRET="${newSecret}"  ${tag || "ADDED"} in .env file`
    );
  } catch (error) {
    console.error("❌", error.message);
  }
};

export default generateAuthSecret;
