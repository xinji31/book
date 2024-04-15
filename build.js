import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { gitlogPromise as gitlog } from "gitlog"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"

const dir = dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {Object} Article
 * @property {string} title
 * @property {Array<string>} tags
 * @property {string} hash
 * @property {string} date
 * @property {string} author
 */

/**
 * Parse preview box by git commit
 * @param {Object} commit 
 * @returns {Article}
 */
function parseArticle(commit) {
  const meta = JSON.parse(commit.rawBody.split("\n")[2])
  return {
    title: meta.title,
    tags: meta.tags,
    type: meta.type,
    hash: commit.hash,
    date: commit.authorDate,
    author: commit.authorName,
  }
}

const siteInfo = {
  articles: {},
  previewList: [],
};
(await gitlog({
  repo: dir,
  number: -1,
  fields: ["hash", "rawBody", "authorDate", "authorName"]
})).forEach(commit => {
  if (!commit.rawBody.startsWith("_")) {
    try {
      siteInfo.articles[commit.hash] = parseArticle(commit)
      siteInfo.previewList.push(commit.hash)
    } catch (e) {
      console.error(`build warning: building commit ${commit.hash} failed.`)
      console.error(e.message)
    }
  }
});

try {
  rmSync("dist", { recursive: true })
} catch (_) { }
mkdirSync("dist")
writeFileSync("dist/site-info.json", JSON.stringify(siteInfo))
