import { IDL } from "@icp-sdk/core/candid"

export const cronIdl: IDL.InterfaceFactory = ({ IDL }) => {
  const HttpMethod = IDL.Variant({
    GET: IDL.Null,
    POST: IDL.Null,
    HEAD: IDL.Null,
  })

  const JobTarget = IDL.Variant({
    CanisterCall: IDL.Record({
      canister_id: IDL.Principal,
      method: IDL.Text,
      payload: IDL.Vec(IDL.Nat8),
    }),
    HttpWebhook: IDL.Record({
      url: IDL.Text,
      method: HttpMethod,
      headers: IDL.Vec(IDL.Tuple(IDL.Text, IDL.Text)),
      body: IDL.Opt(IDL.Vec(IDL.Nat8)),
    }),
  })

  const CompiledCron = IDL.Record({
    minutes: IDL.Nat64,
    hours: IDL.Nat32,
    days: IDL.Nat32,
    months: IDL.Nat16,
    weekdays: IDL.Nat8,
  })

  const JobStatus = IDL.Variant({
    Active: IDL.Null,
    Paused: IDL.Null,
    Completed: IDL.Null,
    ExhaustedCredits: IDL.Null,
    DeadLetterQueue: IDL.Null,
    AutoPausedDormant: IDL.Null,
    TargetUnavailable: IDL.Null,
  })

  const JobRecord = IDL.Record({
    id: IDL.Nat64,
    project_id: IDL.Nat64,
    owner: IDL.Principal,
    label: IDL.Text,
    target: JobTarget,
    cron_expression: IDL.Text,
    compiled_cron: CompiledCron,
    status: JobStatus,
    max_retries: IDL.Nat8,
    consecutive_failures: IDL.Nat8,
    total_runs: IDL.Nat64,
    next_run_at: IDL.Opt(IDL.Nat64),
    last_run_at: IDL.Opt(IDL.Nat64),
    created_at: IDL.Nat64,
    updated_at: IDL.Nat64,
  })

  const ProjectRecord = IDL.Record({
    id: IDL.Nat64,
    owner: IDL.Principal,
    name: IDL.Text,
    created_at: IDL.Nat64,
  })

  const CreateJobArgs = IDL.Record({
    project_id: IDL.Nat64,
    label: IDL.Text,
    target: JobTarget,
    cron_expression: IDL.Text,
    max_retries: IDL.Opt(IDL.Nat8),
  })

  const UpdateJobArgs = IDL.Record({
    job_id: IDL.Nat64,
    label: IDL.Opt(IDL.Text),
    target: IDL.Opt(JobTarget),
    cron_expression: IDL.Opt(IDL.Text),
    max_retries: IDL.Opt(IDL.Nat8),
  })

  const JobSummary = IDL.Record({
    id: IDL.Nat64,
    project_id: IDL.Nat64,
    label: IDL.Text,
    cron_expression: IDL.Text,
    target_type: IDL.Text,
    target_preview: IDL.Text,
    status: IDL.Text,
    consecutive_failures: IDL.Nat8,
    total_runs: IDL.Nat64,
    next_run_at: IDL.Opt(IDL.Nat64),
    last_run_at: IDL.Opt(IDL.Nat64),
  })

  const ExecutionLog = IDL.Record({
    log_id: IDL.Nat64,
    job_id: IDL.Nat64,
    started_at: IDL.Nat64,
    duration_ms: IDL.Nat32,
    success: IDL.Bool,
    status_code: IDL.Opt(IDL.Nat16),
    response_snippet: IDL.Text,
    error: IDL.Opt(IDL.Text),
  })

  const ApiKeySummary = IDL.Record({
    key_hash: IDL.Vec(IDL.Nat8),
    project_id: IDL.Nat64,
    label: IDL.Text,
    revoked: IDL.Bool,
    created_at: IDL.Nat64,
    raw_key: IDL.Text,
  })

  const CreditBalance = IDL.Record({
    free_runs_remaining: IDL.Nat64,
    prepaid_credits: IDL.Nat64,
    total_available: IDL.Nat64,
    total_used: IDL.Nat64,
  })

  const PackQuote = IDL.Record({
    pack_tier: IDL.Nat8,
    credits: IDL.Nat64,
    usd_cents: IDL.Nat32,
    icp_e8s: IDL.Nat64,
    treasury_principal: IDL.Text,
  })

  const CronAuditStats = IDL.Record({
    total_projects: IDL.Nat64,
    total_jobs: IDL.Nat64,
    active_jobs: IDL.Nat64,
    paused_jobs: IDL.Nat64,
    other_jobs: IDL.Nat64,
    total_runs_executed: IDL.Nat64,
    total_api_keys: IDL.Nat64,
    active_api_keys: IDL.Nat64,
    revoked_api_keys: IDL.Nat64,
    rate_per_run_usd_micros: IDL.Nat64,
    treasury_principal: IDL.Text,
    total_users_with_credits: IDL.Nat64,
    total_prepaid_credits_held: IDL.Nat64,
    total_lifetime_credits_purchased: IDL.Nat64,
    total_lifetime_credits_used: IDL.Nat64,
    cycles_balance: IDL.Nat,
    memory_pages: IDL.Nat64,
  })

  const ResultProject = IDL.Variant({ Ok: ProjectRecord, Err: IDL.Text })
  const ResultUnit = IDL.Variant({ Ok: IDL.Null, Err: IDL.Text })
  const ResultJob = IDL.Variant({ Ok: JobRecord, Err: IDL.Text })
  const ResultText = IDL.Variant({ Ok: IDL.Text, Err: IDL.Text })
  const ResultApiKeys = IDL.Variant({ Ok: IDL.Vec(ApiKeySummary), Err: IDL.Text })
  const ResultNat64 = IDL.Variant({ Ok: IDL.Nat64, Err: IDL.Text })

  return IDL.Service({
    create_project: IDL.Func([IDL.Text], [ResultProject], []),
    rename_project: IDL.Func([IDL.Nat64, IDL.Text], [ResultProject], []),
    pause_project: IDL.Func([IDL.Nat64], [ResultNat64], []),
    resume_project: IDL.Func([IDL.Nat64], [ResultNat64], []),
    delete_project: IDL.Func([IDL.Nat64], [ResultUnit], []),
    list_my_projects: IDL.Func([], [IDL.Vec(ProjectRecord)], ["query"]),

    create_job: IDL.Func([CreateJobArgs], [ResultJob], []),
    update_job: IDL.Func([UpdateJobArgs], [ResultJob], []),
    delete_job: IDL.Func([IDL.Nat64], [ResultUnit], []),
    pause_job: IDL.Func([IDL.Nat64], [ResultUnit], []),
    resume_job: IDL.Func([IDL.Nat64], [ResultUnit], []),
    trigger_job: IDL.Func([IDL.Nat64], [ResultUnit], []),
    list_jobs: IDL.Func([IDL.Opt(IDL.Nat64)], [IDL.Vec(JobSummary)], ["query"]),
    get_job: IDL.Func([IDL.Nat64], [ResultJob], ["query"]),
    get_job_logs: IDL.Func([IDL.Nat64, IDL.Opt(IDL.Nat64)], [IDL.Vec(ExecutionLog)], ["query"]),

    create_api_key: IDL.Func([IDL.Nat64, IDL.Text], [ResultText], []),
    revoke_api_key: IDL.Func([IDL.Vec(IDL.Nat8)], [ResultUnit], []),
    delete_api_key: IDL.Func([IDL.Vec(IDL.Nat8)], [ResultUnit], []),
    list_api_keys: IDL.Func([IDL.Nat64], [ResultApiKeys], ["query"]),

    get_my_credits: IDL.Func([], [CreditBalance], ["query"]),
    get_pack_quotes: IDL.Func([], [IDL.Vec(PackQuote)], []),
    buy_pack: IDL.Func([IDL.Nat8, IDL.Nat64], [ResultNat64], []),
    quote_credits: IDL.Func([IDL.Nat64], [PackQuote], []),
    buy_credits: IDL.Func([IDL.Nat64, IDL.Nat64], [ResultNat64], []),
    set_rate_per_run: IDL.Func([IDL.Nat64], [ResultNat64], []),
    get_rate_per_run: IDL.Func([], [IDL.Nat64], ["query"]),
    get_audit_stats: IDL.Func([], [CronAuditStats], ["query"]),
  })
}
