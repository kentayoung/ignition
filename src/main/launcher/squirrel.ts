import { existsSync } from "fs"
import type { ProgramEntry } from "@shared/types"

const VERSIONED_EXE = /^(.*[\\/])app-\d+(?:\.\d+)+[^\\/]*[\\/]([^\\/]+\.exe)$/i

type Launch = Pick<ProgramEntry, "path" | "args" | "matchName">

/**
 * Squirrel apps (Discord, Slack, GitHub Desktop...) install into a new
 * `app-<version>` folder on every update, so a path captured from a shortcut
 * dies at the next update. Their stable entry point is `Update.exe
 * --processStart <exe>` one level up.
 */
export function toSquirrelLaunch(
  entry: Pick<ProgramEntry, "path" | "args">,
  exists: (p: string) => boolean = existsSync,
): Launch | null {
  const match = VERSIONED_EXE.exec(entry.path)
  if (!match) return null
  const [, root, exe] = match
  const updater = `${root}Update.exe`
  if (!exists(updater)) return null

  const args = ["--processStart", exe]
  if (entry.args?.length)
    args.push("--process-start-args", entry.args.join(" "))
  return { path: updater, args, matchName: exe.replace(/\.exe$/i, "") }
}
