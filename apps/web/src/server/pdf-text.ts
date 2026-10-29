import 'server-only';
import { extractText } from 'unpdf';
import { fail } from './action';

/**
 * The PDF text layer, one string per page, used only to verify quotes. null when there is no text
 * layer (a scan), so its facts are unverifiable. Works on a copy: the caller's bytes are untouched.
 */
export const readPdfPages = async (bytes: Uint8Array): Promise<string[] | null> => {
  try {
    const { text } = await extractText(new Uint8Array(bytes), { mergePages: false });
    return text.join('').trim() === '' ? null : text;
  } catch (err) {
    if (err instanceof Error && err.name === 'PasswordException') return fail('PDF_PASSWORD_PROTECTED');
    return fail('FILE_TYPE_NOT_ALLOWED');
  }
};
