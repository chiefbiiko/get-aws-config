import { assertEquals, test, runIfMain } from "https://deno.land/std@v0.29.0/testing/mod.ts";
import { get } from "./mod.ts";

test({
  name: "returns null if fs and env access are both disabled",
  fn() {
    assertEquals(get({env: false,fs: false}), null)
  }
})

test({
  name: "allows providing custom credentials file path in args or env",
  fn() {
   const config =  get({  sharedCredentialsFile: "./test_credentials"})
   
    assertEquals(config.default.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID")
  }
})

test({
  name: "allows loading specific profiles",
  fn() {
   const config =  get({  sharedCredentialsFile: "./test_credentials", profile: "project1"})
   
    assertEquals(config.project1.accessKeyId, "ANOTHER_AWS_ACCESS_KEY_ID")
  }
})

test({
  name: "values in the credentials file override those from the config file",
  fn() {
   const config =  get({  sharedCredentialsFile: "./test_credentials",
 configFile: "./test_config"
 })
   
    assertEquals(config.default.accessKeyId, "YOUR_AWS_ACCESS_KEY_ID")
    assertEquals(config.default.someOtherConfig, "FRAUD")
  }
})

runIfMain(import.meta)