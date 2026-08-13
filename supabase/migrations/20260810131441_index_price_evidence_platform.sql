create index price_evidence_candidates_platform_idx
  on public.price_evidence_candidates (platform_id)
  where platform_id is not null;
