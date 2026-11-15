-- The Home feed: a page of the endless, shuffled sequence of Ideas for the caller.
--
-- Ideas in the caller's Interests come first, then every other Idea. Each group is
-- ordered by md5(seed || id), so the client's per-session seed shuffles it and the
-- same seed always gives the same order. Position p is Idea number p modulo the
-- number of Ideas, so paging wraps around forever.
--
-- It runs with the caller's rights: row-level security limits it to what they may
-- read, so someone not signed in gets no rows. Each row carries its Topic and Book.
create function public.feed_page(seed text, start_at integer, page_size integer)
returns table (
  feed_position integer,
  id uuid,
  title text,
  explanation text,
  topic_id uuid,
  topic_name text,
  topic_hue smallint,
  book_id uuid,
  book_title text,
  book_author text,
  book_isbn text,
  book_cover_hue smallint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
begin
  if start_at < 0 or page_size < 1 or page_size > 100 then
    raise exception 'start_at must be 0 or more and page_size 1 to 100' using errcode = '22023';
  end if;
  return query
    with ordered as (
      select
        i.*,
        (row_number() over (
          order by
            exists (select 1 from public.interests interest where interest.user_id = (select auth.uid()) and interest.topic_id = i.topic_id) desc,
            md5(seed || i.id::text)
        ) - 1)::integer as feed_index,
        (count(*) over ())::integer as total
      from public.ideas i
    )
    select p, o.id, o.title, o.explanation, t.id, t.name, t.hue, b.id, b.title, b.author, b.isbn, b.cover_hue
    from generate_series(start_at, start_at + page_size - 1) as p
    join ordered o on o.feed_index = p % o.total
    join public.topics t on t.id = o.topic_id
    join public.books b on b.id = o.book_id
    order by p;
end;
$$;
