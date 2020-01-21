/** Derive options. */
export interface GetOptions {
  profile?: string; // which profile to load
  sharedCredentialsFile?: string; // path to the shared credentials file
  configFile?: string; // path to the config file
  env?: boolean; // whether to check environment
  fs?: boolean; // whether to check file system
}

/** Shared decoder. */
const dcdr: TextDecoder = new TextDecoder();

/** Normalizes config keys (from snake to camel case). */
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

/** Parses config and credential files. */
function parse(file: string) {
  // making sure the file exists
  try {
    Deno.statSync(file);
  } catch (_) {
    return {};
  }

  return dcdr
    .decode(Deno.readFileSync(file))
    .split(/\r?\n/)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => line && !line.startsWith("#"))
    .reduce(
      (
        [oldProfile, acc]: [string, { [key: string]: any }],
        line: string
      ): [string, { [key: string]: any }] => {
        let newProfile: string;

        if (line.startsWith("[")) {
          newProfile = line
            .slice(1, line.length - 1)
            .trim()
            .replace(/^\s*profile\s*/i, "");

          if (!acc.hasOwnProperty(newProfile)) {
            acc[newProfile] = {};
          }
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
      ["default", { default: {} }]
    )[1];
}

/** Derives aws config from the environment and/or filesystem. */
export function get(opts: GetOptions = {}): { [key: string]: string } {
  const home: string = Deno.dir("home");

  const _conf: { [key: string]: any } = {
    profile: "default",
    sharedCredentialsFile: `${home}/.aws/credentials`,
    configFile: `${home}/.aws/config`,
    env: true,
    fs: true,
    ...opts
  };

  let env: { [key: string]: any } = {};

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
    const profile: string = opts.profile || env.AWS_PROFILE || _conf.profile;

    const credsFile: string =
      opts.sharedCredentialsFile ||
      env.AWS_SHARED_CREDENTIALS_FILE ||
      _conf.sharedCredentialsFile;

    const configFile: string =
      opts.configFile || env.AWS_CONFIG_FILE || _conf.configFile;

    const creds: { [key: string]: any } = parse(credsFile);
    const config: { [key: string]: any } = parse(configFile);

    creds[profile] = creds[profile] || {};
    config[profile] = config[profile] || {};

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
        creds[profile].default_region ||
        config[profile].region ||
        config[profile].default_region
    };
  }

  return {};
}
