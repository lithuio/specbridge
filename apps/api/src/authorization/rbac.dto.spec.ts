import {
  CreateProjectDto,
  dtoPipe,
  EmailDto,
  NameDto,
  PageDto,
  ProjectMemberDto,
} from './rbac.dto.js';
it('normalizes names/emails and preserves the internal baseline text', async () => {
  expect(
    await dtoPipe(EmailDto).transform(
      { email: ' USER@EXAMPLE.TEST ' },
      { type: 'body' },
    ),
  ).toMatchObject({ email: 'user@example.test' });
  expect(
    await dtoPipe(NameDto).transform({ name: ' Team ' }, { type: 'body' }),
  ).toMatchObject({ name: 'Team' });
  expect(
    await dtoPipe(CreateProjectDto).transform(
      {
        workspaceId: '3479fc70-0047-4e82-8fbf-671a0a18f604',
        name: 'App',
        baselineScope: '  First\n Second  ',
      },
      { type: 'body' },
    ),
  ).toMatchObject({ baselineScope: 'First\n Second' });
});
it('bounds names and baseline rather than accepting unbounded storage input', async () => {
  await expect(
    dtoPipe(NameDto).transform({ name: 'x'.repeat(100) }, { type: 'body' }),
  ).resolves.toBeDefined();
  for (const name of ['', ' \n ', 'x'.repeat(101), 42])
    await expect(
      dtoPipe(NameDto).transform({ name }, { type: 'body' }),
    ).rejects.toMatchObject({ status: 400 });
});
it('allows only bounded integer pagination and defaults missing values', async () => {
  expect(await dtoPipe(PageDto).transform({}, { type: 'query' })).toMatchObject(
    { limit: 20, offset: 0 },
  );
  expect(
    await dtoPipe(PageDto).transform(
      { limit: '100', offset: '2' },
      { type: 'query' },
    ),
  ).toMatchObject({ limit: 100, offset: 2 });
  for (const limit of ['1e2', '', '-1', '1.5', ['1'], '101'])
    await expect(
      dtoPipe(PageDto).transform({ limit }, { type: 'query' }),
    ).rejects.toMatchObject({ status: 400 });
  await expect(
    dtoPipe(PageDto).transform(
      { offset: '9007199254740992' },
      { type: 'query' },
    ),
  ).rejects.toMatchObject({ status: 400 });
});
it('rejects identity injection and alternative project role assignment', async () => {
  await expect(
    dtoPipe(NameDto).transform(
      { name: 'Team', ownerId: 'injected' },
      { type: 'body' },
    ),
  ).rejects.toMatchObject({ status: 400 });
  for (const role of ['OWNER', 'CLIENT', undefined])
    await expect(
      dtoPipe(ProjectMemberDto).transform(
        { userId: '3479fc70-0047-4e82-8fbf-671a0a18f604', role },
        { type: 'body' },
      ),
    ).rejects.toMatchObject({ status: 400 });
});
