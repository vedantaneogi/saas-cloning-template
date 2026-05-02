#!/bin/bash
pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-docusign}
