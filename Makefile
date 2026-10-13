SHELL := /bin/bash
.DEFAULT_GOAL := help

COMPOSE := docker compose

.PHONY: help install env up down restart logs migrate ensure-bucket seed dev build start lint typecheck clean test-setup test test-api test-e2e test-defects test-report test-perf perf-aa api-diff

help: ## Affiche cette aide
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-18s\033[0m %s\n", $$1, $$2}'

install: ## Installe les dépendances npm
	npm install

env: ## Crée .env depuis .env.example si absent, génère AUTH_SECRET si besoin
	@if [ ! -f .env ]; then cp .env.example .env; echo ".env créé depuis .env.example"; fi

up: env ## Démarre Postgres + LocalStack (Docker) et attend qu'ils soient prêts
	$(COMPOSE) up -d
	@echo "En attente que Postgres et LocalStack soient opérationnels..."
	@for i in $$(seq 1 30); do \
		pg_ok=$$($(COMPOSE) ps postgres 2>/dev/null | grep -c "healthy"); \
		localstack_ok=$$($(COMPOSE) ps localstack 2>/dev/null | grep -c "healthy"); \
		if [ "$$pg_ok" -ge 1 ] && [ "$$localstack_ok" -ge 1 ]; then echo "Postgres + LocalStack prêts."; exit 0; fi; \
		sleep 2; \
	done; \
	echo "Timeout en attendant Postgres/LocalStack — vérifie 'docker compose ps' et 'make logs'." >&2; exit 1

down: ## Arrête Postgres + LocalStack (conserve les données)
	$(COMPOSE) down

restart: down up ## Redémarre Postgres + LocalStack

logs: ## Suit les logs de Postgres + LocalStack
	$(COMPOSE) logs -f

migrate: ## Applique les migrations SQL (idempotent)
	npm run migrate:up

ensure-bucket: ## Crée le bucket S3 "receipts" s'il n'existe pas déjà
	npm run ensure-bucket

seed: ## Peuple une base de démonstration navigable (RH, manager, employé, notes de frais)
	npm run seed

dev: install up migrate ensure-bucket seed ## Tout lancer : install, Docker, migrations, bucket, seed, puis le serveur de dev
	npm run dev

build: ## Build de production
	npm run build

start: build ## Build puis lance le serveur de prod
	npm run start

lint: ## Lint du code
	npm run lint

typecheck: ## Vérifie les types
	npm run typecheck

clean: ## Arrête Docker et supprime les volumes — efface les données locales (Postgres/LocalStack)
	$(COMPOSE) down -v

test-setup: up migrate ensure-bucket seed build ## Prépare l'environnement de test (Docker, migrations, seed, build de prod)

test: test-setup ## Lance toute la suite (parité + défauts)
	npx playwright test

test-api: test-setup ## Contrat HTTP et défauts
	npx playwright test tests/api tests/defects

test-e2e: test-setup ## Parcours UI
	npx playwright test tests/e2e

test-defects: test-setup ## Tableau rouge → vert des défauts
	npx playwright test --grep @defect

test-report: ## Ouvre le dernier rapport HTML
	npx playwright show-report

test-perf: up migrate ensure-bucket ## Performance : baseline contre version courante (k6, environ 15 min)
	node tests/perf/compare.mjs

perf-aa: up migrate ensure-bucket ## Performance : baseline contre elle-même, mesure du bruit
	node tests/perf/compare.mjs --aa

api-diff: ## Contrat d'API : changements cassants entre docs/api/openapi.yaml et NEW=<autre spec> (oasdiff)
	@test -n "$(NEW)" || { echo "Usage : make api-diff NEW=chemin/vers/openapi.yaml"; exit 2; }
	docker run --rm -v "$(CURDIR)":/w -w /w tufin/oasdiff:v1.32.1 breaking docs/api/openapi.yaml "$(NEW)" --fail-on ERR
