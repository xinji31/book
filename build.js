import { dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { gitlogPromise as gitlog } from "gitlog"
import { mkdirSync, rmSync, writeFileSync } from "node:fs"

const dir = dirname(fileURLToPath(import.meta.url))

/**
 * @typedef {Object} Article
 * @property {string} title
 * @property {Array<string>} tags
 * @property {string} shadow
 * @property {string} hash
 * @property {string} date
 * @property {string} author
 * @property {string} authorEmail
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
    shadow: meta.shadow,
    hash: commit.hash,
    date: commit.authorDate,
    author: commit.authorName,
    authorEmail: commit.authorEmail,
  }
}

const shadowBy = new Map();

const siteInfo = {
  articles: {},
  previewList: [],
};
(await gitlog({
  repo: dir,
  number: -1,
  fields: ["hash", "rawBody", "authorDate", "authorName", "authorEmail"]
})).forEach(commit => {
  if (!commit.rawBody.startsWith("_")) {
    try {
      // not shadowed or not shadowed by other user
      if (shadowBy.get(commit.hash) !== commit.authorEmail) {
        const art = parseArticle(commit)
        siteInfo.articles[commit.hash] = art
        siteInfo.previewList.push(commit.hash)
        if (art.shadow) {
          shadowBy.set(art.shadow, art.authorEmail)
        }
      }
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
