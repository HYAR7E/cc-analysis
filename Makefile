run: up
	npm run dev

up:
	docker compose up -d

down:
	docker compose down

migrate:
	npm run db:migrate

seed:
	npm run db:seed

logs:
	docker compose logs -f postgres

psql: up
	docker compose exec postgres psql -U postgres -d pdf_cc_tracker
