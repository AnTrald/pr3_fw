FROM debian:12-slim

RUN apt-get update && apt-get install -y --no-install-recommends     fpc fpc-source-3.2.2 postgresql-client ca-certificates     && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/legacy
RUN echo "Invalidating cache for legacy.pas copy: $(date)"
COPY legacy.pas ./
COPY run.sh /usr/local/bin/run_legacy.sh
RUN chmod +x /usr/local/bin/run_legacy.sh

CMD ["/usr/local/bin/run_legacy.sh"]