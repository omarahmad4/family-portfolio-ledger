.PHONY: install dev build lint test db-migrate db-seed docker-up docker-down docker-logs docker-test docker-migrate docker-seed

install:
	npm install

dev:
	npm run dev

build:
	npm run build

lint:
	npm run lint

test:
	npm test

db-migrate:
	npx prisma migrate dev

db-seed:
	npx prisma db seed

docker-up:
	docker compose up --build -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

docker-test:
	docker compose run --rm web npm test

docker-migrate:
	docker compose run --rm web npx prisma migrate dev

docker-seed:
	docker compose run --rm web npx prisma db seed

