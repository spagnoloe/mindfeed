-- Search in Explore: the Topics whose name, Books whose title or author, and Ideas whose title
-- or explanation contain the query, ignoring case and surrounding spaces.
--
-- Rows come grouped Topics, then Books, then Ideas, each group ordered by name or title (with
-- the "C" collation, so by code point as the app's fake does). A blank query finds nothing.
-- strpos rather than ilike, so % and _ in the query match only themselves.
--
-- It runs with the caller's rights, so someone not signed in gets no rows. `title` is a Topic's
-- name; `detail` is a Book's author or an Idea's Book title; `hue` and `idea_count` are a Topic's.
create function public.search_content(query text)
returns table (
  kind text,
  id uuid,
  title text,
  detail text,
  hue smallint,
  idea_count integer
)
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (select lower(btrim(query)) as needle)
  select kind, id, title, detail, hue, idea_count
  from (
    select 1 as grp, 'topic' as kind, t.id, t.name as title, null::text as detail, t.hue,
      (select count(*) from public.ideas i where i.topic_id = t.id)::integer as idea_count
    from public.topics t, q
    where strpos(lower(t.name), q.needle) > 0
    union all
    select 2, 'book', b.id, b.title, b.author, null, null
    from public.books b, q
    where strpos(lower(b.title), q.needle) > 0 or strpos(lower(b.author), q.needle) > 0
    union all
    select 3, 'idea', i.id, i.title, b.title, null, null
    from public.ideas i
    join public.books b on b.id = i.book_id, q
    where strpos(lower(i.title), q.needle) > 0 or strpos(lower(i.explanation), q.needle) > 0
  ) results, q
  where q.needle <> ''
  order by grp, title collate "C", id;
$$;
