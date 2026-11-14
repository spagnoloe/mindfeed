import type { Backend } from '../types';

/**
 * The behaviour every Backend must have. Each implementation runs this suite,
 * so the fake used by app tests is proven to behave like Supabase.
 */
export function describeBackendContract(name: string, makeBackend: () => Backend) {
  describe(`${name} Backend`, () => {
    let backend: Backend;

    beforeEach(() => {
      backend = makeBackend();
    });

    test('has no session when nobody is signed in', async () => {
      await expect(backend.auth.getSession()).resolves.toBeNull();
    });
  });
}
