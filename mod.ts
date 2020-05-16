/** Derive options. */
export interface GetOptions {
  profile?: string; // which profile to load
  credentialsFile?: string; // path to the shared credentials file
  configFile?: string; // path to the config file
  env?: boolean; // whether to check environment
  fs?: boolean; // whether to check file system
}

/** Home path. */
const HOME: string = Deno.dir("home") ?? "";

/** Line delimiter. */
const NEW_LINE_REGEX: RegExp = /\r?\n/;

/** Named profile extractor. */
const PROFILE_REGEXP: RegExp = /^\[\s*(?:profile)?\s*([^\s]*)\s*\].*$/i;

/** Quote extractor. */
const QUOTE_REGEXP: RegExp = /(^\s*["']?)|(["']?\s*$)/g;

/** Shared decoder. */
const decoder: TextDecoder = new TextDecoder();

/** Bike-shed file existence check. */
function fileExistsSync(file: string): boolean {
  try {
    Deno.statSync(file);
    return true;
  } catch (_) {
    return false;
  }
}

/** Normalizes config keys (from snake to camel case). */
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .replace("aws_", "")
    .split("_")
    .map(
      (part: string, i: number): string =>
        i === 0 ? part : `${part[0].toUpperCase()}${part.slice(1)}`,
    )
    .join("");
}

/** Parses config and credential files. */
function parse(file: string) {
  if (!fileExistsSync(file)) {
    return {};
  }

  return decoder
    .decode(Deno.readFileSync(file))
    .split(NEW_LINE_REGEX)
    .map((line: string): string => line.trim())
    .filter((line: string): boolean => !!line && !line.startsWith("#"))
    .reduce(
      (
        [oldProfile, acc]: [string, { [key: string]: any }],
        line: string,
      ): [string, { [key: string]: any }] => {
        let newProfile: string = "";

        if (line.startsWith("[")) {
          newProfile = line.replace(PROFILE_REGEXP, "$1");

          if (!acc.hasOwnProperty(newProfile)) {
            acc[newProfile] = {};
          }
        } else {
          const [key, val]: string[] = line
            .split("=")
            .map((part: string): string => part.replace(QUOTE_REGEXP, ""));

          acc[newProfile || oldProfile][normalizeKey(key)] = val;
        }

        return [newProfile || oldProfile, acc];
      },
      ["default", { default: {} }],
    )[1];
}

/** Derives aws config from the environment and/or filesystem. */
export function get(opts: GetOptions = {}): { [key: string]: string } {
  const _opts = { ...opts, env: opts.env !== false };
  const ENV: { [key: string]: any } = _opts.env ? Deno.env.toObject() : {};

  _opts.fs = _opts.fs !== false;
  _opts.profile = _opts.profile || ENV.AWS_PROFILE || "default";
  _opts.credentialsFile = _opts.credentialsFile || `${HOME}/.aws/credentials`;
  _opts.configFile = _opts.configFile || `${HOME}/.aws/config`;

  if (
    _opts.env &&
    ENV.AWS_ACCESS_KEY_ID &&
    ENV.AWS_SECRET_ACCESS_KEY &&
    ENV.AWS_DEFAULT_REGION
  ) {
    return {
      accessKeyId: ENV.AWS_ACCESS_KEY_ID,
      secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY,
      sessionToken: ENV.AWS_SESSION_TOKEN,
      region: ENV.AWS_DEFAULT_REGION,
    };
  }

  if (_opts.fs) {
    const credentials: { [key: string]: any } = parse(
      opts.credentialsFile ||
        ENV.AWS_SHARED_CREDENTIALS_FILE ||
        _opts.credentialsFile,
    );
    const config: { [key: string]: any } = parse(
      opts.configFile || ENV.AWS_CONFIG_FILE || _opts.configFile,
    );

    const _profile: string = opts.profile || ENV.AWS_PROFILE || _opts.profile;

    credentials[_profile] = credentials[_profile] || {};
    config[_profile] = config[_profile] || {};

    return {
      ...config[_profile],
      ...credentials[_profile],
      accessKeyId: ENV.AWS_ACCESS_KEY_ID ||
        credentials[_profile].accessKeyId ||
        config[_profile].accessKeyId,
      secretAccessKey: ENV.AWS_SECRET_ACCESS_KEY ||
        credentials[_profile].secretAccessKey ||
        config[_profile].secretAccessKey,
      sessionToken: ENV.AWS_SESSION_TOKEN ||
        credentials[_profile].sessionToken ||
        config[_profile].sessionToken,
      region: ENV.AWS_REGION ||
        ENV.AWS_DEFAULT_REGION ||
        config[_profile].region ||
        config[_profile].default_region ||
        credentials[_profile].region ||
        credentials[_profile].default_region,
    };
  }

  return {};
}
