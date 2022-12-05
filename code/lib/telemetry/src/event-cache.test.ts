import { getPrecedingUpgrade } from './event-cache';

expect.addSnapshotSerializer({
  print: (val: any) => JSON.stringify(val, null, 2),
  test: (val) => typeof val !== 'string',
});

describe('event-cache', () => {
  const init = { body: { eventType: 'init', eventId: 'init' }, timestamp: 1 };
  const upgrade = { body: { eventType: 'upgrade', eventId: 'upgrade' }, timestamp: 2 };
  const dev = { body: { eventType: 'dev', eventId: 'dev' }, timestamp: 3 };

  describe('data handling', () => {
    it('errors', async () => {
      const preceding = await getPrecedingUpgrade('dev', {
        init: { timestamp: 1, body: { ...init.body, error: {} } },
      });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 1,
          "eventType": "init",
          "eventId": "init"
        }
      `);
    });

    it('session IDs', async () => {
      const preceding = await getPrecedingUpgrade('dev', {
        init: { timestamp: 1, body: { ...init.body, sessionId: 100 } },
      });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 1,
          "eventType": "init",
          "eventId": "init",
          "sessionId": 100
        }
      `);
    });

    it('extra fields', async () => {
      const preceding = await getPrecedingUpgrade('dev', {
        init: { timestamp: 1, body: { ...init.body, foobar: 'baz' } },
      });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 1,
          "eventType": "init",
          "eventId": "init"
        }
      `);
    });
  });

  describe('no intervening dev events', () => {
    it('no upgrade events', async () => {
      const preceding = await getPrecedingUpgrade('dev', {});
      expect(preceding).toBeUndefined();
    });

    it('init', async () => {
      const preceding = await getPrecedingUpgrade('dev', { init });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 1,
          "eventType": "init",
          "eventId": "init"
        }
      `);
    });

    it('upgrade', async () => {
      const preceding = await getPrecedingUpgrade('dev', { upgrade });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 2,
          "eventType": "upgrade",
          "eventId": "upgrade"
        }
      `);
    });

    it('both init and upgrade', async () => {
      const preceding = await getPrecedingUpgrade('dev', { init, upgrade });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 2,
          "eventType": "upgrade",
          "eventId": "upgrade"
        }
      `);
    });
  });

  describe('intervening dev events', () => {
    it('no upgrade events', async () => {
      const preceding = await getPrecedingUpgrade('dev', { dev });
      expect(preceding).toBeUndefined();
    });

    it('init', async () => {
      const preceding = await getPrecedingUpgrade('dev', { init, dev });
      expect(preceding).toBeUndefined();
    });

    it('upgrade', async () => {
      const preceding = await getPrecedingUpgrade('dev', { upgrade, dev });
      expect(preceding).toBeUndefined();
    });

    it('init followed by upgrade', async () => {
      const preceding = await getPrecedingUpgrade('dev', { init, upgrade, dev });
      expect(preceding).toBeUndefined();
    });

    it('both init and upgrade with intervening dev', async () => {
      const secondUpgrade = {
        body: { eventType: 'upgrade', eventId: 'secondUpgrade' },
        timestamp: 4,
      };
      const preceding = await getPrecedingUpgrade('dev', { init, dev, upgrade: secondUpgrade });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 4,
          "eventType": "upgrade",
          "eventId": "secondUpgrade"
        }
      `);
    });

    it('both init and upgrade with non-intervening dev', async () => {
      const earlyDev = {
        body: { eventType: 'dev', eventId: 'earlyDev' },
        timestamp: -1,
      };
      const preceding = await getPrecedingUpgrade('dev', { dev: earlyDev, init, upgrade });
      expect(preceding).toMatchInlineSnapshot(`
        {
          "timestamp": 2,
          "eventType": "upgrade",
          "eventId": "upgrade"
        }
      `);
    });
  });
});
