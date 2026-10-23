import { describe, it, expect } from "vitest"
import { toSquirrelLaunch } from "./squirrel"

const yes = (): boolean => true
const no = (): boolean => false

describe("toSquirrelLaunch", () => {
  it("rewrites a versioned app folder exe to the stable Update.exe launch", () => {
    const root = "C:\\Users\\k\\AppData\\Local\\Discord\\"
    expect(
      toSquirrelLaunch({ path: `${root}app-1.0.9185\\Discord.exe` }, yes),
    ).toEqual({
      path: `${root}Update.exe`,
      args: ["--processStart", "Discord.exe"],
      matchName: "Discord",
    })
  })

  it("forwards existing args via --process-start-args", () => {
    const result = toSquirrelLaunch(
      { path: "C:\\L\\Slack\\app-4.1.0\\slack.exe", args: ["--minimized"] },
      yes,
    )
    expect(result?.args).toEqual([
      "--processStart",
      "slack.exe",
      "--process-start-args",
      "--minimized",
    ])
  })

  it("leaves ordinary paths alone", () => {
    expect(
      toSquirrelLaunch(
        { path: "C:\\Program Files\\RaceLab\\RaceLab.exe" },
        yes,
      ),
    ).toBeNull()
  })

  it("leaves the path alone when Update.exe is missing", () => {
    expect(
      toSquirrelLaunch({ path: "C:\\L\\Foo\\app-1.2.3\\Foo.exe" }, no),
    ).toBeNull()
  })
})
