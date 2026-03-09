# Product Roadmap

## Phase 1 (Current MVP)
- Aggregated product model from multiple suppliers
- Cart + quote + checkout backend APIs
- Shipping estimator with country rate-card logic
- Supplier procurement task creation for post-payment ordering

## Phase 2 (Automation + Integrations)
- Integrate Amazon India and Flipkart APIs/feed ingestion
- Build website automation workers for non-API vendors (Playwright)
- Add real payment gateway (Stripe/Razorpay + FX handling)
- Add warehouse receiving and consolidation states
- Add courier APIs (DHL/FedEx/Aramex) for label + tracking
- Persist data to PostgreSQL and add background job queue

## Phase 3 (Marketplace Scale)
- Seller onboarding and direct listing tools
- Dynamic pricing and stock synchronization engine
- Multi-warehouse orchestration
- Mobile apps and country-specific checkout localization
- Growth stack for NRI cohorts by region

## Suggested architecture upgrades
- Services: `catalog`, `pricing`, `checkout`, `supplier-ordering`, `warehouse`, `shipping`
- Infra: FastAPI + PostgreSQL + Redis + worker queue + S3 docs store
- Observability: OpenTelemetry tracing + structured logs + SLO dashboards
- Risk controls: customs rules engine, out-of-stock substitution policies, fraud checks
