import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeAdapter } from '../../src/adapters/claude-adapter.js';
import { existsSync, readFileSync } from 'fs';

// Mock dependencies
vi.mock('fs');
vi.mock('child_process');
vi.mock('../../src/utils/cli-detector.js', () => ({
  isCLIAvailable: vi.fn(),
  getCLIVersion: vi.fn()
}));

import { isCLIAvailable, getCLIVersion } from '../../src/utils/cli-detector.js';

describe('ClaudeAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
    // Clear cache before each test
    adapter._isAvailableCache = null;
    adapter._versionCache = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isAvailable', () => {
    it('should return true when Claude CLI is available', async () => {
      isCLIAvailable.mockResolvedValue(true);

      const result = await adapter.isAvailable();

      expect(result).toBe(true);
      expect(isCLIAvailable).toHaveBeenCalledWith('claude');
    });

    it('should return false when Claude CLI is not available', async () => {
      isCLIAvailable.mockResolvedValue(false);

      const result = await adapter.isAvailable();

      expect(result).toBe(false);
    });

    it('should cache availability result', async () => {
      isCLIAvailable.mockResolvedValue(true);

      await adapter.isAvailable();
      await adapter.isAvailable();

      expect(isCLIAvailable).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVersion', () => {
    it('should return version when CLI is available', async () => {
      isCLIAvailable.mockResolvedValue(true);
      getCLIVersion.mockResolvedValue('1.2.3');

      const version = await adapter.getVersion();

      expect(version).toBe('1.2.3');
    });

    it('should return null when CLI is not available', async () => {
      isCLIAvailable.mockResolvedValue(false);

      const version = await adapter.getVersion();

      expect(version).toBeNull();
    });

    it('should cache version result', async () => {
      isCLIAvailable.mockResolvedValue(true);
      getCLIVersion.mockResolvedValue('1.2.3');

      await adapter.getVersion();
      await adapter.getVersion();

      expect(getCLIVersion).toHaveBeenCalledTimes(1);
    });
  });

  describe('buildCommand', () => {
    beforeEach(() => {
      existsSync.mockReturnValue(true);
      readFileSync.mockReturnValue('System prompt content');
    });

    it('should build command with required parameters', () => {
      const request = {
        documentPath: 'C:\\test\\document.txt',
        systemPromptPath: 'C:\\test\\prompt.md'
      };

      const result = adapter.buildCommand(request);

      expect(result).toHaveProperty('args');
      expect(result).toHaveProperty('prompt');
      expect(result.args).toContain('--print');
      expect(result.args).toContain('--system-prompt');
      expect(result.prompt).toContain('Please analyze the following document');
    });

    it('should include reference path if provided', () => {
      const request = {
        documentPath: 'C:\\test\\document.txt',
        systemPromptPath: 'C:\\test\\prompt.md',
        referencePath: 'C:\\test\\references'
      };

      const result = adapter.buildCommand(request);

      expect(result.prompt).toContain('Reference materials are available in');
      expect(result.prompt).toContain('C:\\test\\references');
    });

    it('should throw error if document path is missing', () => {
      const request = {
        systemPromptPath: 'C:\\test\\prompt.md'
      };

      expect(() => adapter.buildCommand(request)).toThrow('Document path is required');
    });

    it('should throw error if system prompt path is missing', () => {
      const request = {
        documentPath: 'C:\\test\\document.txt'
      };

      expect(() => adapter.buildCommand(request)).toThrow('System prompt path is required');
    });

    it('should throw error if document file does not exist', () => {
      existsSync.mockImplementation((path) => {
        return path !== 'C:\\test\\document.txt';
      });

      const request = {
        documentPath: 'C:\\test\\document.txt',
        systemPromptPath: 'C:\\test\\prompt.md'
      };

      expect(() => adapter.buildCommand(request)).toThrow('Document not found');
    });

    it('should throw error if system prompt file does not exist', () => {
      existsSync.mockImplementation((path) => {
        return path !== 'C:\\test\\prompt.md';
      });

      const request = {
        documentPath: 'C:\\test\\document.txt',
        systemPromptPath: 'C:\\test\\prompt.md'
      };

      expect(() => adapter.buildCommand(request)).toThrow('System prompt not found');
    });
  });

  describe('execute', () => {
    it('should return error if CLI is not available', async () => {
      isCLIAvailable.mockResolvedValue(false);

      const request = {
        documentPath: 'C:\\test\\document.txt',
        systemPromptPath: 'C:\\test\\prompt.md'
      };

      const result = await adapter.execute(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CLI_NOT_FOUND');
      expect(result.error).toContain('Claude CLI not found');
    });

    it('should return error if request validation fails', async () => {
      isCLIAvailable.mockResolvedValue(true);

      const request = {
        // Missing required fields
      };

      const result = await adapter.execute(request);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_REQUEST');
    });
  });

  describe('normalizeOutput', () => {
    it('should remove ANSI color codes', () => {
      const input = '\x1b[32mGreen text\x1b[0m normal text';
      const output = adapter.normalizeOutput(input);

      expect(output).toBe('Green text normal text');
      expect(output).not.toContain('\x1b');
    });

    it('should remove CLI header lines', () => {
      const input = 'Claude CLI v1.0\nUsing model: claude-3\nTokens used: 100\n\n## Actual Content\nSome content';
      const output = adapter.normalizeOutput(input);

      expect(output).not.toContain('Claude CLI');
      expect(output).not.toContain('Using model');
      expect(output).not.toContain('Tokens used');
      expect(output).toContain('## Actual Content');
    });

    it('should trim whitespace', () => {
      const input = '  \n  Some content  \n  ';
      const output = adapter.normalizeOutput(input);

      expect(output).toBe('Some content');
    });

    it('should handle empty input', () => {
      const output = adapter.normalizeOutput('');

      expect(output).toBe('');
    });

    it('should handle null input', () => {
      const output = adapter.normalizeOutput(null);

      expect(output).toBe('');
    });
  });

  describe('getProviderName', () => {
    it('should return "claude"', () => {
      expect(adapter.getProviderName()).toBe('claude');
    });
  });
});
