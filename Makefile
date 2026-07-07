.PHONY: install dev build lint test db-migrate db-seed

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
