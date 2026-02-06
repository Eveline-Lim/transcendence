# Variables

COMPOSE := docker-compose
COMPOSE_FILE := docker-compose.yml

help: ## Display help
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf"\033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all the containers
	$(COMPOSE) -f $(COMPOSE_FILE) build

up: ## Start all services
	$(COMPOSE) -f $(COMPOSE_FILE) up -d

down: ## Stop all services
	$(COMPOSE) -f $(COMPOSE_FILE) down

restart: down up ## Restart all services

logs: ## Display logs for all services
	$(COMPOSE) -f $(COMPOSE_FILE) logs -f

clean: ## Clean containers and volumes
	$(COMPOSE) -f $(COMPOSE_FILE) down -v
	docker system prune -f

clean-all: ## Clean all (including images)
	$(COMPOSE) -f $(COMPOSE_FILE) down -v --rmi all
	docker system prune -af

.PHONY: help build up down restart logs clean