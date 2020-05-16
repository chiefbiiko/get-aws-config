import { assertEquals } from "https://deno.land/std@v0.34.0/testing/asserts.ts";
import { get } from "./mod.ts";

Deno.env.set("AWS_PROFILE", "default")

Deno.test({
  name: "returns an empty object if fs and env access are both disabled",
  fn() {
    assertEquals(get({ env: false, fs: false }), {});
  }
});

Deno.test({
  name: "allows providing custom credentials file path in args or env",
  fn() {
    const got = get({ credentialsFile: "./test_credentials" });

    assertEquals(got.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID");
  }
});

Deno.test({
  name: "allows loading specific profiles",
  fn() {
    const got = get({
      credentialsFile: "./test_credentials",
      profile: "project1"
    });

    assertEquals(got.accessKeyId, "ANOTHER_AWS_ACCESS_KEY_ID");
    assertEquals(got.secretAccessKey, "ANOTHER_AWS_SECRET_ACCESS_KEY");
  }
});

Deno.test({
  name: "the credentials file has precedence over the config file",
  fn() {
    const got = get({
      credentialsFile: "./test_credentials",
      configFile: "./test_config"
    });

    assertEquals(got.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID");
    assertEquals(got.secretAccessKey, "YOUR_AWS_SECRET_ACCESS_KEY");
    assertEquals(got.someOtherConfig, "FRAUD");
  }
});

Deno.test({
  name: "parsing handles comments and blank lines",
  fn() {
    const got = get({
      credentialsFile: "./test_credentials",
      configFile: "./test_config"
    });

    assertEquals(got.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID");
    assertEquals(got.someOtherConfig, "FRAUD");
    assertEquals(got.moreOtherConfig, "MONEY");
  }
});

Deno.test({
  name: "supports credentials/config named profile formats all over",
  fn() {
    const got = get({
      credentialsFile: "./test_credentials",
      configFile: "./test_config",
      profile: "project2"
    });

    assertEquals(got.was, "🦜");
    assertEquals(got.now, "🔮");
    assertEquals(got.key, "🔑");
  }
});

Deno.test({
  name: "getting it with no config argument",
  fn() {
    Deno.env.set("AWS_SHARED_CREDENTIALS_FILE", "./test_credentials");
    Deno.env.set("AWS_CONFIG_FILE", "./test_config")
    Deno.env.set("AWS_PROFILE", "project2");

    const got = get();

    assertEquals(got.was, "🦜");
    assertEquals(got.now, "🔮");
    assertEquals(got.key, "🔑");
  }
});
