/** Generic doc. */
export interface Doc {
  [key: string]: any;
}

/** Derive configuration. */
export interface GetConfig {
  profile?: string; // which profile to load
  sharedCredentialsFile?: string; // path to the shared credentials file
  configFile?: string; // path to the config file
  env?: boolean; // whether to check environment
  fs?: boolean; // whether to check file system
}

/** Shared decoder. */
const dcdr: TextDecoder = new TextDecoder();

/** Camelize. */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace(/^aws_/, "")
    .split("_")
    .map((part: string, i: number): string =>
      i === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`
    )
    .join("");
}

/** Parzz. */
function parse(file: string): Doc {
  return dcdr
    .decode(Deno.readFileSync(file))
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .reduce(
      ([oldProfile, acc]: [string, Doc], line: string): [string, Doc] => {
        let newProfile: string;

        if (line.startsWith("[")) {
          newProfile = line.slice(1, line.length - 2).trim();

          acc[newProfile] = {};
        } else {
          const [key, val]: string[] = line
            .split("=")
            .map((part: string): string =>
              part.trim().replace(/^["']["']$/, "")
            );

          acc[newProfile || oldProfile][normalizeKey(key)] = val;
        }

        return [newProfile || oldProfile, acc];
      },
      ["default", {}]
    )[1];
}

/** Derives aws config from the environment and/or filesystem. */
export function get(conf?: GetConfig): Doc {
  const _conf: Doc = {
    profile: "default",
    sharedCredentialsFile: `${Deno.homeDir()}/.aws/credentials`,
    configFile: `${Deno.homeDir()}/.aws/config`,
    env: true,
    fs: true,
    ...conf
  };

  let env: Doc = {};

  if (_conf.env) {
    env = Deno.env();

    if (
      env.AWS_ACCESS_KEY_ID &&
      env.AWS_SECRET_ACCESS_KEY &&
      env.AWS_DEFAULT_REGION
    ) {
      return {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        sessionToken: env.AWS_SESSION_TOKEN,
        region: env.AWS_DEFAULT_REGION
      };
    }
  }

  if (_conf.fs) {
    const profile: string = conf.profile || env.AWS_PROFILE || _conf.profile;
    const credsFile: string =
      conf.sharedCredentialsFile ||
      env.AWS_SHARED_CREDENTIALS_FILE ||
      _conf.sharedCredentialsFile;
    const configFile: string =
      conf.configFile || env.AWS_CONFIG_FILE || _conf.configFile;

    const creds: Doc = parse(credsFile);
    const config: Doc = parse(configFile);

    return {
      ...config[profile],
      ...creds[profile],
      accessKeyId:
        env.AWS_ACCESS_KEY_ID ||
        creds[profile].accessKeyId ||
        config[profile].accessKeyId,
      secretAccessKey:
        env.AWS_SECRET_ACCESS_KEY ||
        creds[profile].secretAccessKey ||
        config[profile].secretAccessKey,
      sessionToken:
        env.AWS_SESSION_TOKEN ||
        creds[profile].sessionToken ||
        config[profile].sessionToken,
      region:
        env.AWS_DEFAULT_REGION ||
        creds[profile].region ||
        config[profile].region
    };
  }

  return null;
}
