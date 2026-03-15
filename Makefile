# Variables

COMPOSE      := docker compose
COMPOSE_FILE := docker-compose.yml
COMPOSE_GHCR := docker-compose.ghcr.yml

all: set-ssl build up ## Start the project locally without setting up secrets

set-ssl: ## Setup SSL certificate
	@scripts/SSL_setup.sh

help: ## Display help
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf"\033[36m%-15s\033[0m %s\n", $$1, $$2}'

setup: ## Setup an example of secret directory
	@scripts/setup-secrets.sh

# ------------------------------------------------------------------ Local build (default)
build: ## Build all containers from local source
	$(COMPOSE) -f $(COMPOSE_FILE) build --no-cache

up: ## Build and start all services from local source
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

down: ## Stop all services
	$(COMPOSE) -f $(COMPOSE_FILE) down

dev: setup build up ## Quick start for local development

# ------------------------------------------------------------------ GHCR pre-built images
up-ghcr: ## Pull and start all services using pre-built GHCR images
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_GHCR) pull
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_GHCR) up -d

down-ghcr: ## Stop all services (GHCR)
	$(COMPOSE) -f $(COMPOSE_FILE) -f $(COMPOSE_GHCR) down

restart-ghcr: down-ghcr up-ghcr ## Restart all services (GHCR)

# ------------------------------------------------------------------ Shared
restart: down up ## Restart all services (local)

logs: ## Display logs for all services
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

clean: ## Clean containers and volumes
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
	@docker builder prune -af
	@docker system prune -af
	@rm -rf secrets/

fclean: ## Clean all (including images)
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi all
	@docker system prune -af
	@rm -rf secrets/

ps: ## Show services status
	@$(COMPOSE) -f $(COMPOSE_FILE) ps

.PHONY: help build up down dev up-ghcr down-ghcr restart restart-ghcr logs clean fclean setup ps