import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { parseTrustProxy, configureTrustProxy } from '../config/trustProxy.js';

/** Minimal Express app double — the setting is all we care about. */
function makeApp() {
  const settings = new Map();

  return {
    set(key, value) {
      settings.set(key, value);
    },
    get(key) {
      return settings.get(key);
    },
  };
}

/** Captures console.warn for the duration of a call. */
function captureWarnings(fn) {
  const original = console.warn;
  const warnings = [];

  console.warn = (...args) => warnings.push(args.join(' '));

  try {
    fn();
  } finally {
    console.warn = original;
  }

  return warnings;
}

describe('parseTrustProxy — the safe default', () => {
  test('trusts nothing when unset', () => {
    assert.deepEqual(parseTrustProxy(undefined), { value: false, warning: null });
    assert.deepEqual(parseTrustProxy(null), { value: false, warning: null });
  });

  test('trusts nothing for the falsey spellings', () => {
    for (const raw of ['', 'false', 'FALSE', '0', 'off', 'no', '  false  ']) {
      assert.equal(parseTrustProxy(raw).value, false, raw);
    }
  });

  test('treats 0 hops as trusting nothing', () => {
    assert.equal(parseTrustProxy('0').value, false);
  });
});

describe('parseTrustProxy — hop counts', () => {
  test('reads a number of hops', () => {
    assert.equal(parseTrustProxy('1').value, 1);
    assert.equal(parseTrustProxy('2').value, 2);
    assert.equal(parseTrustProxy(' 3 ').value, 3);
  });

  test('accepts a number as well as a string', () => {
    assert.equal(parseTrustProxy(1).value, 1);
  });

  test('a hop count is not a warning — it is the recommended setting', () => {
    assert.equal(parseTrustProxy('1').warning, null);
  });

  test('reads "1" as a hop count and not as an IP address', () => {
    // The list branch would happily accept "1" as an address, which Express
    // would then never match. Order matters.
    assert.equal(typeof parseTrustProxy('1').value, 'number');
  });
});

describe('parseTrustProxy — trusting everything', () => {
  test('accepts true but warns about it', () => {
    for (const raw of ['true', 'TRUE', 'on', 'yes']) {
      const result = parseTrustProxy(raw);
      assert.equal(result.value, true, raw);
      assert.match(result.warning, /client controls/);
    }
  });

  test('the warning names the safe alternative', () => {
    assert.match(parseTrustProxy('true').warning, /TRUST_PROXY=1/);
  });
});

describe('parseTrustProxy — named ranges and lists', () => {
  test('passes through the names Express understands', () => {
    for (const name of ['loopback', 'linklocal', 'uniquelocal']) {
      assert.equal(parseTrustProxy(name).value, name);
    }
  });

  test('normalises a comma-separated list', () => {
    assert.equal(
      parseTrustProxy('10.0.0.0/8,  192.168.0.1 , loopback').value,
      '10.0.0.0/8, 192.168.0.1, loopback'
    );
  });

  test('preserves the casing of addresses in a list', () => {
    // IPv6 literals and hostnames are not ours to lowercase.
    assert.equal(
      parseTrustProxy('2001:DB8::1, 10.0.0.1').value,
      '2001:DB8::1, 10.0.0.1'
    );
  });

  test('a single address is still a list', () => {
    assert.equal(parseTrustProxy('192.168.1.1').value, '192.168.1.1');
  });

  test('falls back to trusting nothing for an empty list', () => {
    const result = parseTrustProxy(' , , ');
    assert.equal(result.value, false);
    assert.match(result.warning, /not understood/);
  });
});

describe('configureTrustProxy', () => {
  test('applies the setting to the app', () => {
    const app = makeApp();
    configureTrustProxy(app, { TRUST_PROXY: '1' });

    assert.equal(app.get('trust proxy'), 1);
  });

  test('defaults to false with no env', () => {
    const app = makeApp();
    configureTrustProxy(app, {});

    assert.equal(app.get('trust proxy'), false);
  });

  test('returns the value it applied', () => {
    const app = makeApp();
    assert.equal(configureTrustProxy(app, { TRUST_PROXY: '2' }), 2);
  });

  test('warns loudly about production with no setting', () => {
    // The exact combination that produces the reported bug, and the only
    // thing in the system that will ever mention it.
    const warnings = captureWarnings(() =>
      configureTrustProxy(makeApp(), { NODE_ENV: 'production' })
    );

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /TRUST_PROXY unset/);
    assert.match(warnings[0], /all users at once/);
  });

  test('says nothing in production once it is configured', () => {
    const warnings = captureWarnings(() =>
      configureTrustProxy(makeApp(), {
        NODE_ENV: 'production',
        TRUST_PROXY: '1',
      })
    );

    assert.deepEqual(warnings, []);
  });

  test('says nothing in development with no setting', () => {
    const warnings = captureWarnings(() =>
      configureTrustProxy(makeApp(), { NODE_ENV: 'development' })
    );

    assert.deepEqual(warnings, []);
  });

  test('warns about TRUST_PROXY=true in any environment', () => {
    const warnings = captureWarnings(() =>
      configureTrustProxy(makeApp(), { TRUST_PROXY: 'true' })
    );

    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /client controls/);
  });

  test('never throws on a value it cannot parse', () => {
    const app = makeApp();

    captureWarnings(() => {
      assert.doesNotThrow(() =>
        configureTrustProxy(app, { TRUST_PROXY: '{"nope":true}' })
      );
    });

    // Whatever it made of it, the app still booted.
    assert.ok(app.get('trust proxy') !== undefined);
  });
});
