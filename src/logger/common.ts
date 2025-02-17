// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Determine if structured logs are supported (node >= 10). If something goes wrong,
// assume no since unstructured is safer.
/** @hidden */
export const SUPPORTS_STRUCTURED_LOGS =
  parseInt(process.versions?.node?.split('.')?.[0] || '8', 10) >= 10;

// Map LogSeverity types to their equivalent `console.*` method.
/** @hidden */
export const CONSOLE_SEVERITY: {
  [severity: string]: 'debug' | 'info' | 'warn' | 'error';
} = {
  DEBUG: 'debug',
  INFO: 'info',
  NOTICE: 'info',
  WARNING: 'warn',
  ERROR: 'error',
  CRITICAL: 'error',
  ALERT: 'error',
  EMERGENCY: 'error',
};

// safely preserve unpatched console.* methods in case of compat require
/** @hidden */
export const UNPATCHED_CONSOLE = {
  debug: console.debug,
  info: console.info,
  log: console.log,
  warn: console.warn,
  error: console.error,
};
