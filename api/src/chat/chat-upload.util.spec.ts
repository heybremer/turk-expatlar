import { existsSync } from 'fs';
import { sanitizeAttachments } from './chat-upload.util';

jest.mock('fs', () => ({
  ...jest.requireActual<typeof import('fs')>('fs'),
  existsSync: jest.fn(),
}));

const existsSyncMock = existsSync as jest.Mock;

describe('sanitizeAttachments', () => {
  beforeEach(() => {
    existsSyncMock.mockReset();
    existsSyncMock.mockReturnValue(true);
    delete process.env.API_URL;
    process.env.PORT = '3201';
  });

  it('accepts a valid attachment that exists on disk', () => {
    const result = sanitizeAttachments([
      {
        url: 'http://localhost:3201/uploads/chat/1720000000-abc123.jpg',
        name: 'foto.jpg',
        size: 1234,
        type: 'image',
        mime: 'image/jpeg',
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      url: 'http://localhost:3201/uploads/chat/1720000000-abc123.jpg',
      name: 'foto.jpg',
      size: 1234,
      type: 'image',
      mime: 'image/jpeg',
    });
  });

  it('rejects external URLs (tracking pixel protection)', () => {
    const result = sanitizeAttachments([
      {
        url: 'https://evil.example.com/pixel.png',
        name: 'pixel.png',
        size: 1,
        type: 'image',
        mime: 'image/png',
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('rewrites untrusted origins pointing at a real local file', () => {
    const result = sanitizeAttachments([
      {
        url: 'https://evil.example.com/uploads/chat/1720000000-abc123.jpg',
        name: 'x.jpg',
        size: 10,
        type: 'image',
        mime: 'image/jpeg',
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].url).toBe(
      'http://localhost:3201/uploads/chat/1720000000-abc123.jpg',
    );
  });

  it('rejects files that do not exist on this server', () => {
    existsSyncMock.mockReturnValue(false);
    const result = sanitizeAttachments([
      {
        url: 'http://localhost:3201/uploads/chat/1720000000-abc123.jpg',
        name: 'x.jpg',
        size: 10,
        type: 'image',
        mime: 'image/jpeg',
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('rejects path traversal and unexpected filename formats', () => {
    const result = sanitizeAttachments([
      {
        url: 'http://localhost:3201/uploads/chat/../../.env',
        name: 'a',
        size: 1,
        type: 'file',
        mime: 'x',
      },
      {
        url: 'http://localhost:3201/uploads/chat/evil.html',
        name: 'a',
        size: 1,
        type: 'file',
        mime: 'x',
      },
    ]);
    expect(result).toHaveLength(0);
  });

  it('derives type and mime from the file extension, not client input', () => {
    const result = sanitizeAttachments([
      {
        url: 'http://localhost:3201/uploads/chat/1720000000-abc.pdf',
        name: 'cv.pdf',
        size: 500,
        type: 'image', // istemci yalan söylüyor
        mime: 'image/png',
      },
    ]);
    expect(result[0].type).toBe('file');
    expect(result[0].mime).toBe('application/pdf');
  });

  it('caps the number of attachments per message', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      url: `http://localhost:3201/uploads/chat/1720000000-a${i}.jpg`,
      name: `f${i}.jpg`,
      size: 1,
      type: 'image',
      mime: 'image/jpeg',
    }));
    expect(sanitizeAttachments(many)).toHaveLength(5);
  });

  it('returns an empty list for non-array input', () => {
    expect(sanitizeAttachments(undefined)).toHaveLength(0);
    expect(sanitizeAttachments('x')).toHaveLength(0);
  });
});
