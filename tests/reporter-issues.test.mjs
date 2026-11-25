import { describe, expect, it, vi } from "vitest";
import { nextIssue, readQueue } from "../scripts/reporter-issues.mjs";

function issue(number, fields = {}) {
  return {
    number,
    title: "[성능] 첫 화면",
    body: null,
    user: { login: "GnuDaSsa" },
    state: "open",
    labels: [],
    html_url: `https://github.com/GnuDaSsa/donawa-gecko-price/issues/${number}`,
    ...fields,
  };
}

describe("도나와 제보 대기열", () => {
  it.each(["닷츠가 제출한 제목", "[피클] 홈 검색", "[데이터] 최저가", "자유 제목"])(
    "공유 계정이면 모든 제목을 접수한다 (%s)", (title) => {
      const candidate = issue(14, { title, user: { login: "gnudassa" } });
      expect(nextIssue([candidate], () => false)).toEqual({
        number: 14, author: "gnudassa", branch: "codex/issue-14", url: candidate.html_url,
      });
    },
  );

  it("다른 작성자의 제목이나 본문에 적힌 계정명을 신뢰하지 않는다", () => {
    const other = issue(1, { user: { login: "another-user" }, title: "[닷츠]", body: "GnuDaSsa" });
    expect(nextIssue([other, issue(2, { user: null })], vi.fn())).toBeNull();
  });

  it("보류·종료·PR·이미 처리 중인 이슈를 건너뛰고 오래된 대상 한 건을 선택한다", () => {
    const hasPR = vi.fn((branch) => branch === "codex/issue-4");
    const issues = [
      issue(1, { state: "closed" }),
      issue(2, { pull_request: {} }),
      issue(3, { labels: [{ name: "codex:hold" }] }),
      issue(4), issue(5), issue(6),
    ];
    expect(nextIssue(issues, hasPR)?.number).toBe(5);
    expect(hasPR.mock.calls).toEqual([["codex/issue-4", 4], ["codex/issue-5", 5]]);
  });

  it("빈 대기열과 조회 실패를 구분한다", () => {
    expect(nextIssue([], vi.fn())).toBeNull();
    expect(() => readQueue(() => { throw new Error("GitHub unavailable"); })).toThrow("GitHub unavailable");
  });

  it("여러 페이지와 기존 브랜치 PR, 다른 브랜치의 연결 PR을 확인한다", () => {
    const repo = "GnuDaSsa/donawa-gecko-price";
    const linked = (totalCount) => ({ data: { repository: { issue: { closedByPullRequestsReferences: { totalCount } } } } });
    const gh = vi.fn()
      .mockReturnValueOnce([[issue(1), issue(2)], [issue(3)]])
      .mockReturnValueOnce([{ head: { repo: { full_name: repo }, ref: "codex/issue-1" } }])
      .mockReturnValueOnce([])
      .mockReturnValueOnce(linked(1))
      .mockReturnValueOnce([])
      .mockReturnValueOnce(linked(0));
    expect(readQueue(gh)?.number).toBe(3);
    expect(gh.mock.calls[0][0]).toContain("--paginate");
    expect(gh.mock.calls[1][0][1]).toContain("state=open&head=GnuDaSsa%3Acodex%2Fissue-1");
    expect(gh.mock.calls[3][0]).toContain("number=2");
  });
});
