# get-aws-config

![ci](https://github.com/chiefbiiko/get-aws-config/workflows/ci/badge.svg)

Get AWS config and credentials following the "official" AWS CLI strategy.

## Usage

```ts
import { get } from "https://denopkg.com/chiefbiiko/get-aws-config/mod.ts";

const got = get();
// {
//   accessKeyId: "accessKeyId",
//   secretAccessKey: "secretAccessKey",
//   sessionToken: "sessionToken",
//   region: "us-east-1",
//   output: "json",
//   moreConfig: "bla"
// }
```

## API

#### `get(opts?: GetOptions): { [key: string]: string }`

Derive configuration from the environment, the credentials file, and config file, in that order.

**Options**

```ts
export interface GetOptions {
  profile?: string; // which profile to load [default]
  credentialsFile?: string; // credentials file path [~/.aws/credentials]
  configFile?: string; // config file path [~/.aws/config]
  env?: boolean; // whether to check environment [true]
  fs?: boolean; // whether to check file system [true]
}
```

> Note: If you are disabling environment lookup, i.e. `{ env: false }`, you still need to `deno run` with the `--allow-env` flag set. That is because the module calls `Deno.dir("home")` in order to determine the machine's home path and default AWS config and credentials file location.

## License

[MIT](./LICENSE)
