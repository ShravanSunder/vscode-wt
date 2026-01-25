import { describe, expect, it } from 'vitest';
import { normalizeGitUrl } from './git.js';

describe('normalizeGitUrl', () => {
	it('should normalize SSH URLs', () => {
		const url = 'git@github.com:user/repo.git';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should normalize HTTPS URLs', () => {
		const url = 'https://github.com/user/repo.git';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should normalize HTTP URLs', () => {
		const url = 'http://github.com/user/repo.git';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should normalize git:// protocol URLs', () => {
		const url = 'git://github.com/user/repo.git';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should handle URLs without .git suffix', () => {
		const url = 'https://github.com/user/repo';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should remove trailing slashes', () => {
		const url = 'https://github.com/user/repo/';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should convert to lowercase', () => {
		const url = 'https://GitHub.com/User/Repo.git';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should handle GitLab SSH URLs', () => {
		const url = 'git@gitlab.com:group/project.git';
		expect(normalizeGitUrl(url)).toBe('gitlab.com/group/project');
	});

	it('should handle Bitbucket SSH URLs', () => {
		const url = 'git@bitbucket.org:team/repo.git';
		expect(normalizeGitUrl(url)).toBe('bitbucket.org/team/repo');
	});

	it('should handle self-hosted Git SSH URLs', () => {
		const url = 'git@git.company.com:department/project.git';
		expect(normalizeGitUrl(url)).toBe('git.company.com/department/project');
	});

	it('should handle nested paths', () => {
		const url = 'git@github.com:org/group/subgroup/repo.git';
		expect(normalizeGitUrl(url)).toBe('github.com/org/group/subgroup/repo');
	});

	it('should trim whitespace', () => {
		const url = '  https://github.com/user/repo.git  ';
		expect(normalizeGitUrl(url)).toBe('github.com/user/repo');
	});

	it('should produce same result for SSH and HTTPS variants', () => {
		const sshUrl = 'git@github.com:user/my-project.git';
		const httpsUrl = 'https://github.com/user/my-project.git';

		expect(normalizeGitUrl(sshUrl)).toBe(normalizeGitUrl(httpsUrl));
	});
});
