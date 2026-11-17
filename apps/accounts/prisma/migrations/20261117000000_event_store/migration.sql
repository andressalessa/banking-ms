-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "account_events" (
    "event_id" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurred_at" TIMESTAMPTZ(3) NOT NULL,
    "metadata" JSONB NOT NULL,

    CONSTRAINT "account_events_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "account_cpf_registry" (
    "cpf" VARCHAR(11) NOT NULL,
    "account_id" TEXT NOT NULL,

    CONSTRAINT "account_cpf_registry_pkey" PRIMARY KEY ("cpf")
);

-- CreateIndex
CREATE UNIQUE INDEX "account_events_aggregate_id_version_key" ON "account_events"("aggregate_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "account_cpf_registry_account_id_key" ON "account_cpf_registry"("account_id");


-- Event store append-only: bloqueia UPDATE, DELETE e TRUNCATE em account_events.
CREATE FUNCTION account_events_reject_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'account_events is append-only (% not allowed)', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_events_no_update_delete
  BEFORE UPDATE OR DELETE ON "account_events"
  FOR EACH ROW EXECUTE FUNCTION account_events_reject_mutation();

CREATE TRIGGER account_events_no_truncate
  BEFORE TRUNCATE ON "account_events"
  FOR EACH STATEMENT EXECUTE FUNCTION account_events_reject_mutation();
