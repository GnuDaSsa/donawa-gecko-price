import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const configUrl = new URL("../docs/harness-config.json", import.meta.url);
const { issueIntake } = JSON.parse(readFileSync(configUrl, "utf8"));

export function nextIssue(issues, hasPullRequest, config = issueIntake) {
  const authors = new Set(config.authorLogins.map((login) => login.toLowerCase()));
  for (const issue of issues) {
    if (issue.state !== "open" || issue.pull_request) continue;
    if (issue.labels.some(({ name }) => name === config.holdLabel)) continue;
    const author = issue.user?.login;
    if (!author || !authors.has(author.toLowerCase())) continue;
    const branch = `codex/issue-${issue.number}`;
    if (!hasPullRequest(branch, issue.number)) {
      return { number: issue.number, author, branch, url: issue.html_url };
    }
  }
  return null;
}

function github(args) {
  const output = execFileSync("gh", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  return JSON.parse(output);
}

export function readQueue(run = github) {
  const repo = issueIntake.repository;
  const owner = repo.split("/")[0];
  const pages = run(["api", "--paginate", "--slurp", `repos/${repo}/issues?state=open&sort=created&direction=asc&per_page=100`]);
  return nextIssue(pages.flat(), (branch, number) => {
    const head = encodeURIComponent(`${owner}:${branch}`);
    const pulls = run(["api", `repos/${repo}/pulls?state=open&head=${head}&per_page=100`]);
    if (pulls.some(({ head }) => head.repo?.full_name === repo && head.ref === branch)) return true;
    const query = `query($owner: String!, $name: String!, $number: Int!) {
      repository(owner: $owner, name: $name) {
        issue(number: $number) { closedByPullRequestsReferences(first: 1, includeClosedPrs: false) { totalCount } }
      }
    }`;
    const result = run(["api", "graphql", "-f", `query=${query}`, "-f", `owner=${owner}`,
      "-f", `name=${repo.split("/")[1]}`, "-F", `number=${number}`]);
    return result.data.repository.issue.closedByPullRequestsReferences.totalCount > 0;
  });
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  console.log(JSON.stringify({ next: readQueue() }));
}
