-- 문체 교정자(proofread) 에이전트의 문단 재작성 작업을 허용한다.
ALTER TABLE public.agent_jobs
  DROP CONSTRAINT agent_jobs_operation_type_check,
  ADD CONSTRAINT agent_jobs_operation_type_check
    CHECK (operation_type IN ('insert_after', 'rewrite'));
