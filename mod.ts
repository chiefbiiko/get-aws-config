/** Derive options. */
export interface GetOptions {
  profile?: string; // which profile to load
  credentialsFile?: string; // path to the shared credentials file
  configFile?: string; // path to the config file
  env?: boolean; // whether to check environment
  fs?: boolean; // whether to check file system
}

/** Home path. */
const HOME: string = Deno.dir("home");

/** Named profile prefix used in config files. */
const PROFILE_REGEXP: RegExp = /^\s*profile\s*/i;

/** Detecting outter quotes.*/
const QUOTE_REGEXP: RegExp = /^["']["']$/;

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
            .replace(PROFILE_REGEXP, "");

          if (!acc.hasOwnProperty(newProfile)) {
            acc[newProfile] = {};
          }
        } else {
          const [key, val]: string[] = line
            .split("=")
            .map((part: string): string =>
              part.trim().replace(QUOTE_REGEXP, "")
            );

          acc[newProfile || oldProfile][normalizeKey(key)] = val;
        }

        return [newProfile || oldProfile, acc];
      },
      ["default", { default: {} }]
    )[1];
}

/** Derives aws config from the environment and/or filesystem. */
export function get({
  profile = "default",
  credentialsFile = `${HOME}/.aws/credentials`,
  configFile = `${HOME}/.aws/config`,
  env = true,
  fs = true
}: GetOptions = {}): { [key: string]: string } {
  let ENV: { [key: string]: any } = {};

  if (env) {
    ENV = Deno.env();

    if (
      ENV.AWS_ACCESS_KEY_ID &&
      ENV.AWS_SECRET_ACCESS_KEY &&
      ENV.AWS_DEFAULT_REGION
    ) {
      return {
        accessKeyId: ENV.AWS_ACCESS_KEY_ID,
        secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
        sessionToken: ENV.AWS_SESSION_TOKEN,
        region: ENV.AWS_DEFAULT_REGION
      };
    }
  }

  if (fs) {
    const _profile: string = profile || ENV.AWS_PROFILE;
    const _credentialsFile: string =
      credentialsFile || ENV.AWS_SHARED_CREDENTIALS_FILE;
    const _configFile: string = configFile || ENV.AWS_CONFIG_FILE;

    const creds: { [key: string]: any } = parse(_credentialsFile);
    const config: { [key: string]: any } = parse(_configFile);

    creds[_profile] = creds[_profile] || {};
    config[_profile] = config[_profile] || {};

    return {
      ...config[_profile],
      ...creds[_profile],
      accessKeyId:
        ENV.AWS_ACCESS_KEY_ID ||
        creds[_profile].accessKeyId ||
        config[_profile].accessKeyId,
      secretAccessKey:
        ENV.AWS_SECRET_ACCESS_KEY ||
        creds[_profile].secretAccessKey ||
        config[_profile].secretAccessKey,
      sessionToken:
        ENV.AWS_SESSION_TOKEN ||
        creds[_profile].sessionToken ||
        config[_profile].sessionToken,
      region:
        ENV.AWS_DEFAULT_REGION ||
        creds[_profile].region ||
        creds[_profile].default_region ||
        config[_profile].region ||
        config[_profile].default_region
    };
  }

  return {};
}
