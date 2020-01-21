import { get } from "./mod.ts";
import {
  assertEquals,
  test,
  runIfMain
} from "https://deno.land/std/testing/mod.ts";

Deno.env().AWS_PROFILE = "default";

test({
  name: "returns an empty object if fs and env access are both disabled",
  fn() {
    assertEquals(get({ env: false, fs: false }), {});
  }
});

test({
  name: "allows providing custom credentials file path in args or env",
  fn() {
    const got = get({ sharedCredentialsFile: "./test_credentials" });

    assertEquals(got.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID");
  }
});

test({
  name: "allows loading specific profiles",
  fn() {
    const got = get({
      sharedCredentialsFile: "./test_credentials",
      profile: "project1"
    });

    assertEquals(got.accessKeyId, "ANOTHER_AWS_ACCESS_KEY_ID");
  }
});

test({
  name: "values in the credentials file override those from the config file",
  fn() {
    const got = get({
      sharedCredentialsFile: "./test_credentials",
      configFile: "./test_config"
    });

    assertEquals(got.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID");
    assertEquals(got.someOtherConfig, "FRAUD");
  }
});

test({
  name: "parsing handles comments and blank lines",
  fn() {
    const got = get({
      sharedCredentialsFile: "./test_credentials",
      configFile: "./test_config"
    });

    assertEquals(got.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID");
    assertEquals(got.someOtherConfig, "FRAUD");
    assertEquals(got.moreOtherConfig, "MONEY");
  }
});

test({
  name: "supports credentials/config named profile formats all over",
  fn() {
    const got = get({
      sharedCredentialsFile: "./test_credentials",
      configFile: "./test_config",
      profile: "project2"
    });

    assertEquals(got.was, "LOCKED_UP");
    assertEquals(got.now, "THEN");
    assertEquals(got.key, "FINALLY_FREE");
  }
});

runIfMain(import.meta, { only: /formats/ });
